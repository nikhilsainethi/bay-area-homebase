import { validateProperty, type Property } from "./domain.ts";
export function parseBackup(raw: string): Property[] {
  if (raw.length > 5_000_000) throw new Error("Backup exceeds the 5 MB limit.");
  let d;
  try {
    d = JSON.parse(raw);
  } catch {
    throw new Error("Choose a valid Homebase JSON backup.");
  }
  if (
    !d ||
    d.format !== "homebase-backup" ||
    d.version !== 1 ||
    !Array.isArray(d.properties) ||
    d.properties.length > 2000
  )
    throw new Error("This is not a supported Homebase backup.");
  return d.properties.map((p: unknown) => validateProperty(p));
}
export function planImport(
  incoming: Property[],
  existing: Property[],
): { records: Property[]; skipped: number } {
  const ids = new Set(existing.map((p) => p.id)),
    osm = new Set(existing.map((p) => p.osmId).filter(Boolean)),
    records: Property[] = [];
  let skipped = 0;
  for (const p of incoming) {
    if (ids.has(p.id) || (p.osmId && osm.has(p.osmId))) {
      skipped++;
      continue;
    }
    ids.add(p.id);
    if (p.osmId) osm.add(p.osmId);
    records.push(p);
  }
  return { records, skipped };
}
