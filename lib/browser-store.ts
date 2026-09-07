import { validateProperty, type Property } from './domain.ts';
export const STORAGE_KEY = 'homebase:properties:v1';
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export class BrowserStore {
  private storage: StoragePort;
  constructor(storage: StoragePort) {
    this.storage = storage;
  }
  list(): Property[] {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error();
      return data.map((p) => ({
        ...validateProperty(p),
        updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : '',
      }));
    } catch {
      throw new Error(
        'Saved data could not be read. Export a raw backup before repairing browser storage.',
      );
    }
  }
  save(input: unknown): Property {
    const p = validateProperty(input),
      items = this.list();
    if (p.osmId && items.some((x) => x.id !== p.id && x.osmId === p.osmId))
      throw new Error(
        'This mapped property is already saved. Edit it from your shortlist.',
      );
    const value = { ...p, updatedAt: new Date().toISOString() };
    this.write([value, ...items.filter((x) => x.id !== p.id)]);
    return value;
  }
  remove(id: string) {
    this.write(this.list().filter((p) => p.id !== id));
  }
  backup(): string {
    return JSON.stringify(
      {
        format: 'homebase-backup',
        version: 1,
        exportedAt: new Date().toISOString(),
        properties: this.list(),
      },
      null,
      2,
    );
  }
  importBackup(raw: string): { added: number; skipped: number } {
    if (raw.length > 5_000_000)
      throw new Error('Backup file is too large (maximum 5 MB).');
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('Choose a valid Homebase JSON backup.');
    }
    if (
      data.format !== 'homebase-backup' ||
      data.version !== 1 ||
      !Array.isArray(data.properties) ||
      data.properties.length > 2000
    )
      throw new Error('This is not a supported Homebase backup.');
    const incoming = data.properties.map((p: unknown) => validateProperty(p));
    const current = this.list(),
      ids = new Set(current.map((p) => p.id)),
      osmIds = new Set(current.map((p) => p.osmId).filter(Boolean));
    let added = 0,
      skipped = 0;
    for (const p of incoming) {
      if (ids.has(p.id) || (p.osmId && osmIds.has(p.osmId))) {
        skipped++;
        continue;
      }
      ids.add(p.id);
      if (p.osmId) osmIds.add(p.osmId);
      current.push({ ...p, updatedAt: new Date().toISOString() });
      added++;
    }
    this.write(current);
    return { added, skipped };
  }
  private write(items: Property[]) {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      throw new Error(
        'Browser storage is full or unavailable. Export a backup; your previous saved records were not changed.',
      );
    }
  }
}
