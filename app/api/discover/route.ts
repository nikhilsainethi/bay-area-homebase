import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/db/store';
import { parseBounds, normalizePlaces } from '@/lib/domain';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const user = await getChatGPTUser();
  if (!user)
    return Response.json(
      { error: 'Sign in to search the map.' },
      { status: 401 },
    );
  let b;
  try {
    b = parseBounds(await req.json());
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Invalid map area.' },
      { status: 400 },
    );
  }
  const key = [b.south, b.west, b.north, b.east]
    .map((n) => n.toFixed(4))
    .join(',');
  try {
    const db = database();
    const cached = await db
      .prepare('SELECT data FROM search_cache WHERE key=? AND expires_at>?')
      .bind(key, Date.now())
      .first<{ data: string }>();
    if (cached) return Response.json(JSON.parse(cached.data));
    const gate = await db
      .prepare(
        'INSERT INTO rate_limits (key,expires_at) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET expires_at=excluded.expires_at WHERE rate_limits.expires_at<?',
      )
      .bind('overpass', Date.now() + 8000, Date.now())
      .run();
    if (!gate.meta.changes)
      return Response.json(
        { error: 'Please wait a few seconds before searching another area.' },
        { status: 429, headers: { 'Retry-After': '8' } },
      );
    const query = `[out:json][timeout:20];(nwr["building"="apartments"](${key});nwr["residential"="apartments"](${key});nwr["landuse"="residential"]["name"~"apartment|residence|village|homes",i](${key}););out center tags 600;`;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'BayAreaHomebase/1.0 personal-apartment-tracker',
      },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error('Search provider unavailable.');
    const raw = (await res.json()) as { remark?: string; elements?: unknown[] };
    if (raw.remark) throw new Error('Map search timed out.');
    const data = {
      places: normalizePlaces(raw),
      searchedAt: new Date().toISOString(),
      limited: (raw.elements?.length ?? 0) >= 600,
    };
    await db
      .prepare(
        'INSERT INTO search_cache (key,data,expires_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,expires_at=excluded.expires_at',
      )
      .bind(key, JSON.stringify(data), Date.now() + 86400000)
      .run();
    return Response.json(data);
  } catch (error) {
    console.error(
      'Apartment discovery failed:',
      error instanceof Error ? error.message : 'Unknown failure',
    );
    return Response.json(
      {
        error:
          'The free map search is temporarily unavailable. Try again shortly, or add a property manually.',
      },
      { status: 503 },
    );
  }
}
