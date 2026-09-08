// Campus building center: OpenStreetMap way/1313390490. Directions use the exact user-supplied address.
export const OFFICE = {
  name: 'Google · Caribbean 100',
  address: '100 W Caribbean Dr, Sunnyvale, CA 94089',
  lat: 37.4156508,
  lng: -122.01808,
};
export const CITIES = [
  { name: 'Sunnyvale', lat: 37.3925, lng: -122.027 },
  { name: 'Santa Clara', lat: 37.365, lng: -121.965 },
  { name: 'Mountain View', lat: 37.407, lng: -122.075 },
  { name: 'Milpitas', lat: 37.428, lng: -121.898 },
  { name: 'San Jose', lat: 37.337, lng: -121.892 },
];
export const STATUSES = [
  'Saved',
  'Contacted',
  'Tour scheduled',
  'Toured',
  'Applied',
  'Rejected',
] as const;
export const HOME_TYPES = [
  'Apartment',
  'Townhome',
  'Single-family home',
] as const;
export type Unit = {
  id: string;
  label: string;
  beds: number | null;
  baths: number | null;
  rent: number | null;
  fees: number | null;
  deposit: number | null;
  sqft: number | null;
  bedroomDimensions: string;
  availableDate: string;
  leaseMonths: number | null;
  concessions: string;
};
export type Property = {
  id: string;
  osmId: string;
  name: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  website: string;
  listingUrl: string;
  contactName: string;
  phone: string;
  email: string;
  homeType: string;
  status: string;
  favorite: boolean;
  notes: string;
  verifiedDate: string;
  driveMinutes: number | null;
  driveMiles: number | null;
  units: Unit[];
  updatedAt: string;
};
export type Place = {
  nameKnown?: boolean;
  osmId: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  website: string;
  phone: string;
  email: string;
};
export type Bounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};
export function safeWebsite(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  const v = value.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^https?:/i.test(v)) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v);
    return ['https:', 'http:'].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      u.hostname.includes('.')
      ? u.href
      : '';
  } catch {
    return '';
  }
}
export function monthlyTotal(unit: Pick<Unit, 'rent' | 'fees'>): number | null {
  return unit.rent === null ? null : unit.rent + (unit.fees ?? 0);
}
export function commuteUrl(address: string, mode = 'driving'): string {
  return (
    'https://www.google.com/maps/dir/?' +
    new URLSearchParams({
      api: '1',
      origin: address,
      destination: OFFICE.address,
      travelmode: mode,
    })
  );
}
export function researchUrl(name: string, address: string): string {
  return (
    'https://www.google.com/search?' +
    new URLSearchParams({
      q: `${name} ${address} apartments floor plans availability`,
    })
  );
}
export function emptyUnit(): Unit {
  return {
    id: crypto.randomUUID(),
    label: '',
    beds: null,
    baths: null,
    rent: null,
    fees: null,
    deposit: null,
    sqft: null,
    bedroomDimensions: '',
    availableDate: '',
    leaseMonths: null,
    concessions: '',
  };
}
export function emptyProperty(place?: Partial<Place>): Property {
  return {
    id: crypto.randomUUID(),
    osmId: place?.osmId ?? '',
    name: place?.name ?? '',
    address: place?.address ?? '',
    city: place?.city ?? '',
    lat: place?.lat ?? null,
    lng: place?.lng ?? null,
    website: place?.website ?? '',
    listingUrl: '',
    contactName: '',
    phone: place?.phone ?? '',
    email: place?.email ?? '',
    homeType: 'Apartment',
    status: 'Saved',
    favorite: false,
    notes: '',
    verifiedDate: '',
    driveMinutes: null,
    driveMiles: null,
    units: [],
    updatedAt: '',
  };
}
function text(value: unknown, max = 1000): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > max)
    throw new Error(`Text must be at most ${max} characters.`);
  return value.trim();
}
function number(value: unknown, label: string, max = 1000000): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max
  )
    throw new Error(`${label} must be a valid nonnegative number.`);
  return value;
}
function date(value: unknown): string {
  const s = text(value, 10);
  if (
    s &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(s) ||
      Number.isNaN(Date.parse(s)) ||
      new Date(s).toISOString().slice(0, 10) !== s)
  )
    throw new Error('Enter a valid date.');
  return s;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid record.');
  return value as Record<string, unknown>;
}
function id(value: unknown): string {
  const s = text(value, 100);
  if (s && !/^[\w-]+$/.test(s)) throw new Error('Invalid identifier.');
  return s || crypto.randomUUID();
}
export function validateProperty(value: unknown): Property {
  const v = record(value);
  const p = emptyProperty();
  p.id = id(v.id);
  p.name = text(v.name, 200);
  if (!p.name) throw new Error('Property name is required.');
  p.osmId = text(v.osmId, 100);
  p.address = text(v.address, 500);
  p.city = text(v.city, 100);
  for (const key of ['lat', 'lng'] as const) {
    const n = v[key];
    if (
      n !== undefined &&
      n !== null &&
      (typeof n !== 'number' ||
        !Number.isFinite(n) ||
        Math.abs(n) > (key === 'lat' ? 90 : 180))
    )
      throw new Error('Invalid map location.');
    p[key] = n === undefined || n === null ? null : (n as number);
  }
  if ((p.lat === null) !== (p.lng === null))
    throw new Error('Both latitude and longitude are required.');
  for (const key of ['website', 'listingUrl'] as const) {
    const s = text(v[key], 2000);
    p[key] = safeWebsite(s);
    if (s && !p[key]) throw new Error('Use an http or https website link.');
  }
  p.contactName = text(v.contactName, 200);
  p.phone = text(v.phone, 100);
  p.email = text(v.email, 254);
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))
    throw new Error('Enter a valid email address.');
  p.notes = text(v.notes, 15000);
  p.verifiedDate = date(v.verifiedDate);
  p.homeType = text(v.homeType, 50) || 'Apartment';
  p.status = text(v.status, 50) || 'Saved';
  if (
    !HOME_TYPES.includes(p.homeType as (typeof HOME_TYPES)[number]) ||
    !STATUSES.includes(p.status as (typeof STATUSES)[number])
  )
    throw new Error('Invalid home type or status.');
  p.favorite = v.favorite === true;
  p.driveMinutes = number(v.driveMinutes, 'Drive time', 10000);
  p.driveMiles = number(v.driveMiles, 'Drive distance', 10000);
  if (v.units !== undefined && !Array.isArray(v.units))
    throw new Error('Units must be a list.');
  const units = (v.units ?? []) as unknown[];
  if (units.length > 50)
    throw new Error('Maximum 50 floor plans per property.');
  p.units = units.map((value) => {
    const u = record(value);
    const beds = number(u.beds, 'Bedrooms', 30),
      baths = number(u.baths, 'Bathrooms', 30);
    if (beds !== null && !Number.isInteger(beds))
      throw new Error('Bedrooms must be a whole number.');
    if (baths !== null && !Number.isInteger(baths * 2))
      throw new Error('Bathrooms must be in half increments.');
    return {
      id: id(u.id),
      label: text(u.label, 100),
      beds,
      baths,
      rent: number(u.rent, 'Rent'),
      fees: number(u.fees, 'Fees'),
      deposit: number(u.deposit, 'Deposit'),
      sqft: number(u.sqft, 'Square footage'),
      bedroomDimensions: text(u.bedroomDimensions, 1000),
      availableDate: date(u.availableDate),
      leaseMonths: number(u.leaseMonths, 'Lease months', 120),
      concessions: text(u.concessions, 2000),
    };
  });
  if (new Set(p.units.map((u) => u.id)).size !== p.units.length)
    throw new Error('Floor plan identifiers must be unique.');
  return p;
}
export function straightLineMiles(lat: number, lng: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat - OFFICE.lat) * rad) / 2) ** 2 +
    Math.cos(lat * rad) *
      Math.cos(OFFICE.lat * rad) *
      Math.sin(((lng - OFFICE.lng) * rad) / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export function parseBounds(value: unknown): Bounds {
  const b = record(value);
  const { south, west, north, east } = b;
  if (
    ![south, west, north, east].every(
      (x) => typeof x === 'number' && Number.isFinite(x),
    )
  )
    throw new Error('Invalid map bounds.');
  const result = {
    south: south as number,
    west: west as number,
    north: north as number,
    east: east as number,
  };
  if (
    result.south < 37.15 ||
    result.north > 37.6 ||
    result.west < -122.25 ||
    result.east > -121.7 ||
    result.south >= result.north ||
    result.west >= result.east
  )
    throw new Error('Keep the search within the South Bay.');
  if (result.north - result.south > 0.13 || result.east - result.west > 0.2)
    throw new Error('Zoom in a little, then search this area.');
  return result;
}
export function normalizePlaces(data: unknown): Place[] {
  const d = record(data);
  if (!Array.isArray(d.elements))
    throw new Error('The map service returned an invalid response.');
  const found: Place[] = [];
  const seen = new Set<string>();
  for (const raw of d.elements) {
    const e = record(raw),
      t = record(e.tags ?? {}),
      center = record(e.center ?? {});
    const lat = Number(e.lat ?? center.lat),
      lng = Number(e.lon ?? center.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const street = [t['addr:housenumber'] ?? t['contact:housenumber'], t['addr:street'] ?? t['contact:street']]
      .filter(Boolean)
      .join(' ');
    const cityValue = t['addr:city'] ?? t['contact:city'];
    const city = typeof cityValue === 'string' ? cityValue : '';
    const candidates = [t.name, t['name:en'], t.official_name, t.short_name];
    const mappedName = candidates.find((value) => typeof value === 'string' && value.trim() && value.trim().toLowerCase() !== street.toLowerCase() && !/^\d+[\s\d-]*$/.test(value.trim()) && !/^(building|block|unit)\s+[a-z0-9-]+$/i.test(value.trim()));
    const nameKnown = typeof mappedName === 'string';
    const name = nameKnown ? mappedName.trim() : 'Apartment · name not mapped';
    const key = nameKnown ? `${name.toLowerCase()}:${lat.toFixed(3)}:${lng.toFixed(3)}` : `${String(e.type)}/${String(e.id)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({
      nameKnown,
      osmId: `${typeof e.type === 'string' ? e.type : 'way'}/${typeof e.id === 'number' ? e.id : 0}`,
      name,
      address: [street, city, t['addr:postcode'] ?? t['contact:postcode']].filter(Boolean).join(', '),
      city,
      lat,
      lng,
      website: safeWebsite(t.website ?? t['contact:website']),
      phone:
        typeof (t.phone ?? t['contact:phone']) === 'string'
          ? String(t.phone ?? t['contact:phone'])
          : '',
      email:
        typeof (t.email ?? t['contact:email']) === 'string'
          ? String(t.email ?? t['contact:email'])
          : '',
    });
  }
  return found;
}

export function mergePropertyUpdate(
  input: unknown,
  saved: Property[],
): Property {
  const v = record(input);
  if (!v.id) return validateProperty(v);
  const existing = saved.find((p) => p.id === v.id);
  if (!existing)
    throw new Error('Property not found. Omit id to create a new property.');
  return validateProperty({ ...existing, ...v });
}
