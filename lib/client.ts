import { CLOUD_MODE } from './supabase';
import { listCloud, saveCloud, removeCloud, importCloud } from './cloud-store';
import { parseBackup } from './cloud-records';
import { BrowserStore } from './browser-store';
import {
  parseBounds,
  normalizePlaces,
  type Property,
  type Place,
} from './domain';
export const BROWSER_MODE = import.meta.env.VITE_STATIC_MODE === 'true';
export function browserStore() {
  return new BrowserStore(localStorage);
}
type ApiData = {
  error?: string;
  properties: Property[];
  property: Property;
  places: Place[];
  limited?: boolean;
};
const cache = new Map<string, { places: Place[]; limited: boolean }>();
let lastSearch = 0;
export async function api(path: string, init?: RequestInit): Promise<ApiData> {
  if (!BROWSER_MODE) {
    const response = await fetch(path, init);
    let data;
    try {
      data = (await response.json()) as ApiData;
    } catch {
      throw new Error('The service could not be reached. Please try again.');
    }
    if (!response.ok) throw new Error(data.error || 'Please try again.');
    return data;
  }
  if (CLOUD_MODE && path.startsWith('/api/properties')) {
    if (init?.method === 'POST')
      return {
        property: await saveCloud(
          JSON.parse(typeof init.body === 'string' ? init.body : '{}'),
        ),
      } as ApiData;
    if (init?.method === 'DELETE') {
      await removeCloud(
        new URL(path, location.origin).searchParams.get('id') || '',
      );
      return {} as ApiData;
    }
    return { properties: await listCloud() } as ApiData;
  }
  if (path.startsWith('/api/properties')) {
    const store = browserStore();
    if (init?.method === 'POST')
      return {
        property: store.save(
          JSON.parse(typeof init.body === 'string' ? init.body : '{}'),
        ),
      } as ApiData;
    if (init?.method === 'DELETE') {
      store.remove(new URL(path, location.origin).searchParams.get('id') || '');
      return {} as ApiData;
    }
    return { properties: store.list() } as ApiData;
  }
  if (path === '/api/discover') {
    const b = parseBounds(
      JSON.parse(typeof init?.body === 'string' ? init.body : '{}'),
    );
    const key = [b.south, b.west, b.north, b.east]
      .map((n) => n.toFixed(4))
      .join(',');
    if (cache.has(key)) return cache.get(key) as ApiData;
    if (Date.now() - lastSearch < 8000)
      throw new Error(
        'Please wait a few seconds before searching another area.',
      );
    lastSearch = Date.now();
    const query = `[out:json][timeout:20];(nwr["building"="apartments"](${key});nwr["residential"="apartments"](${key});nwr["landuse"="residential"]["name"~"apartment|residence",i](${key}););out center tags 600;`;
    try {
      const r = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(25000),
      });
      if (!r.ok) throw new Error();
      const raw = (await r.json()) as { remark?: string; elements: unknown[] };
      if (raw.remark) throw new Error();
      const result = {
        places: normalizePlaces(raw),
        limited: raw.elements.length >= 600,
      };
      cache.set(key, result);
      if (cache.size > 20) cache.delete(cache.keys().next().value!);
      return result as ApiData;
    } catch {
      throw new Error(
        'The free map search is temporarily unavailable. Try again shortly, or add a property manually.',
      );
    }
  }
  throw new Error('Unknown action.');
}
export async function getMapConfig() {
  if (BROWSER_MODE) {
    let key: string | null = null;
    try {
      key = localStorage.getItem('homebase:google-maps-key');
    } catch {}
    return {
      googleMapsApiKey: key ?? import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
      googleMapsMapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '',
    };
  }
  return (await (await fetch('/api/map-config')).json()) as {
    googleMapsApiKey: string;
    googleMapsMapId: string;
  };
}

export async function exportActiveBackup() {
  const properties = CLOUD_MODE ? await listCloud() : browserStore().list();
  return JSON.stringify(
    {
      format: 'homebase-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      properties,
    },
    null,
    2,
  );
}
export async function importActiveBackup(raw: string) {
  return CLOUD_MODE
    ? await importCloud(parseBackup(raw))
    : browserStore().importBackup(raw);
}
