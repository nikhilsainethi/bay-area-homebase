import { env } from 'cloudflare:workers';
import type { Property } from '@/lib/domain';
export function database() {
  if (!env.DB) throw new Error('Database unavailable.');
  return env.DB;
}
export async function listProperties(userId: string): Promise<Property[]> {
  const r = await database()
    .prepare(
      'SELECT data,updated_at FROM properties WHERE user_id = ? ORDER BY updated_at DESC',
    )
    .bind(userId)
    .all<{ data: string; updated_at: string }>();
  return r.results.map((row) => ({
    ...JSON.parse(row.data),
    updatedAt: row.updated_at,
  }));
}
export async function saveProperty(userId: string, p: Property) {
  const now = new Date().toISOString();
  await database()
    .prepare(
      'INSERT INTO properties (id,user_id,osm_id,data,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET osm_id=excluded.osm_id,data=excluded.data,updated_at=excluded.updated_at',
    )
    .bind(p.id, userId, p.osmId || null, JSON.stringify(p), now)
    .run();
  return { ...p, updatedAt: now };
}
export async function deleteProperty(userId: string, id: string) {
  const result = await database()
    .prepare('DELETE FROM properties WHERE user_id=? AND id=?')
    .bind(userId, id)
    .run();
  return result.meta.changes > 0;
}
