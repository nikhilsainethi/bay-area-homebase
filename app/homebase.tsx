'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, BROWSER_MODE, browserStore } from '@/lib/client';
import BrowserTools from './browser-tools';
import {
  MapPin,
  Plus,
  Building2,
  BriefcaseBusiness,
  Search,
  Bookmark,
  Compass,
  Star,
  ExternalLink,
  ArrowUpRight,
  Navigation,
  SlidersHorizontal,
  Table2,
  Map,
  LoaderCircle,
  LocateFixed,
  Check,
  Trash2,
  Pencil,
  X,
  RefreshCw,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import ApartmentMap from './map-provider';
import PropertyEditor, { Choice } from './property-editor';
import {
  CITIES,
  OFFICE,
  STATUSES,
  HOME_TYPES,
  emptyProperty,
  monthlyTotal,
  commuteUrl,
  researchUrl,
  straightLineMiles,
  validateProperty,
  mergePropertyUpdate,
  type Property,
  type Place,
  type Bounds,
} from '@/lib/domain';
const money = (n: number | null) =>
  n === null
    ? 'Not entered'
    : `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const origin = (p: Property | Place) => p.address || `${p.lat},${p.lng}`;
const keyOf = (p: Property | Place) => ('id' in p ? p.id : p.osmId);
function Links({ p }: { p: Property | Place }) {
  return (
    <div className="property-links">
      {p.website && (
        <a href={p.website} target="_blank" rel="noopener noreferrer">
          Website
          <ExternalLink size={14} />
        </a>
      )}
      {'listingUrl' in p && p.listingUrl && (
        <a href={p.listingUrl} target="_blank" rel="noopener noreferrer">
          Listing
          <ExternalLink size={14} />
        </a>
      )}
      <a
        href={researchUrl(p.name, p.address || `${p.city} California`)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Search online
        <ArrowUpRight size={15} />
      </a>
      {(p.address || p.lat !== null) && (
        <a
          href={commuteUrl(origin(p))}
          target="_blank"
          rel="noopener noreferrer"
        >
          Check commute
          <Navigation size={14} />
        </a>
      )}
    </div>
  );
}
export default function Homebase() {
  const [city, setCity] = useState('Sunnyvale'),
    [center, setCenter] = useState({ lat: 37.3925, lng: -122.027 }),
    [bounds, setBounds] = useState<Bounds | null>(null),
    [places, setPlaces] = useState<Place[]>([]),
    [saved, setSaved] = useState<Property[]>([]),
    [tab, setTab] = useState('discover'),
    [table, setTable] = useState(false),
    [query, setQuery] = useState(''),
    [searched, setSearched] = useState(false),
    [searching, setSearching] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [loadError, setLoadError] = useState(''),
    [notice, setNotice] = useState(''),
    [selected, setSelected] = useState<Property | Place | null>(null),
    [editor, setEditor] = useState<Property | null>(null),
    [placing, setPlacing] = useState<Property | null>(null),
    [deleting, setDeleting] = useState<Property | null>(null),
    [deletingBusy, setDeletingBusy] = useState(false),
    [filters, setFilters] = useState(false),
    [budget, setBudget] = useState(''),
    [beds, setBeds] = useState('Any layout'),
    [status, setStatus] = useState('Any status'),
    [homeType, setHomeType] = useState('Any home type'),
    [favorites, setFavorites] = useState(false),
    [availableBy, setAvailableBy] = useState('');
  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const d = await api('/api/properties');
      setSaved(d.properties);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);
  useEffect(() => {
    if (!BROWSER_MODE) return;
    const handle = () => void reload();
    window.addEventListener('storage', handle);
    return () => window.removeEventListener('storage', handle);
  }, [reload]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  const save = useCallback(async (p: Property) => {
    const validated = validateProperty(p);
    const d = await api('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validated),
    });
    setSaved((s) => [d.property, ...s.filter((x) => x.id !== d.property.id)]);
    setSelected((s) => (s && keyOf(s) === p.id ? d.property : s));
    setNotice('Saved to your shortlist');
    setLoadError('');
    return d.property as Property;
  }, []);
  const discover = useCallback(async () => {
    if (!bounds || searching) return;
    setSearching(true);
    setError('');
    try {
      const d = await api('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bounds),
      });
      setPlaces(d.places);
      setSearched(true);
      setTab('discover');
      if (d.limited)
        setNotice(
          'Showing up to 600 mapped buildings. Zoom in to narrow the search.',
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }, [bounds, searching]);
  const filteredSaved = useMemo(
    () =>
      saved.filter((p) => {
        if (
          query &&
          !`${p.name} ${p.address} ${p.city}`
            .toLowerCase()
            .includes(query.toLowerCase())
        )
          return false;
        if (
          (status !== 'Any status' && p.status !== status) ||
          (homeType !== 'Any home type' && p.homeType !== homeType) ||
          (favorites && !p.favorite)
        )
          return false;
        if (budget || beds !== 'Any layout' || availableBy)
          return p.units.some(
            (u) =>
              (!budget ||
                (monthlyTotal(u) !== null &&
                  monthlyTotal(u)! <= Number(budget))) &&
              (beds === 'Any layout' || u.beds === Number(beds)) &&
              (!availableBy ||
                (Boolean(u.availableDate) && u.availableDate <= availableBy)),
          );
        return true;
      }),
    [saved, query, status, homeType, favorites, budget, beds, availableBy],
  );
  const filteredPlaces = useMemo(
    () =>
      places
        .filter((p) =>
          `${p.name} ${p.address}`.toLowerCase().includes(query.toLowerCase()),
        )
        .sort(
          (a, b) =>
            Number(a.name.startsWith('Unnamed')) -
              Number(b.name.startsWith('Unnamed')) ||
            a.name.localeCompare(b.name),
        ),
    [places, query],
  );
  function select(p: Property | Place) {
    const existing = 'id' in p ? p : saved.find((s) => s.osmId === p.osmId);
    setSelected(existing ?? p);
  }
  function add() {
    setEditor(emptyProperty());
    setSelected(null);
  }
  async function remove() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await api(`/api/properties?id=${encodeURIComponent(deleting.id)}`, {
        method: 'DELETE',
      });
      setSaved((s) => s.filter((p) => p.id !== deleting.id));
      setSelected(null);
      setDeleting(null);
      setNotice('Property removed');
    } catch (e) {
      setError((e as Error).message);
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  }
  useEffect(() => {
    type Tool = {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            t: Tool,
            o: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const tools: Tool[] = [
      {
        name: 'list_saved_properties',
        description: 'Read the current private apartment shortlist.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => ({ properties: saved }),
      },
      {
        name: 'save_property',
        description:
          'Create or update a property in the private shortlist. Supply its id to update it. Uses the same validation and persistent save as the editor.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            id: { type: 'string' },
            address: { type: 'string' },
            website: { type: 'string' },
            notes: { type: 'string' },
            units: { type: 'array', items: { type: 'object' } },
          },
          required: ['name'],
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: async (input) => {
          const p = await save(
            mergePropertyUpdate(
              input,
              BROWSER_MODE ? browserStore().list() : saved,
            ),
          );
          return { id: p.id, name: p.name, updatedAt: p.updatedAt };
        },
      },
    ];
    for (const t of tools) {
      try {
        void Promise.resolve(
          context.registerTool(t, { signal: controller.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => controller.abort();
  }, [saved, save]);
  const rows = tab === 'discover' ? filteredPlaces : filteredSaved;
  return (
    <main className="homebase">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <MapPin size={23} />
          </span>
          <div>
            <strong>
              homebase<span className="brand-dot">.</span>
            </strong>
            <small>BAY AREA</small>
          </div>
        </div>
        <a
          className="office-pill"
          href={
            'https://www.google.com/maps/search/?' +
            new URLSearchParams({ api: '1', query: OFFICE.address })
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          <BriefcaseBusiness size={17} />
          <span>
            Google · Caribbean 100<small>Your commute destination</small>
          </span>
          <ArrowUpRight size={15} />
        </a>
        <Button onClick={add} className="add-button">
          <Plus />
          Add property
        </Button>
      </header>
      <div className="citybar">
        <span>Explore</span>
        {CITIES.map((c) => (
          <button
            key={c.name}
            className={city === c.name ? 'city active' : 'city'}
            onClick={() => {
              setCity(c.name);
              setCenter({ lat: c.lat, lng: c.lng });
              setTable(false);
            }}
          >
            {c.name}
          </button>
        ))}
        <button
          className="table-toggle"
          onClick={() => {
            setTable(!table);
            setTab('saved');
          }}
        >
          {table ? <Map size={17} /> : <Table2 size={17} />}
          <span>{table ? 'Map view' : 'Tracker table'}</span>
        </button>
      </div>
      {notice && (
        <output className="toast">
          <Check size={16} />
          {notice}
        </output>
      )}
      <div className={`workspace ${table ? 'table-workspace' : ''}`}>
        <aside className="results">
          <div className="results-heading">
            <p className="eyebrow">YOUR NEXT CHAPTER</p>
            <h1>Find your place.</h1>
            <p>Explore the neighborhood. Keep the possibilities.</p>
          </div>
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(String(v));
              if (v === 'discover') setTable(false);
            }}
          >
            <TabsList className="view-tabs">
              <TabsTrigger value="discover">
                <Compass />
                Discover
              </TabsTrigger>
              <TabsTrigger value="saved">
                <Bookmark />
                My shortlist <span className="count-pill">{saved.length}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="searchbox">
            <Search size={18} />
            <input
              aria-label="Filter properties by apartment name or street"
              placeholder={
                searched || tab === 'saved'
                  ? 'Filter by name or street'
                  : 'Search the map, then filter results'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </div>
          {tab === 'saved' && (
            <>
              <button
                className="filter-toggle"
                onClick={() => setFilters(!filters)}
              >
                <SlidersHorizontal size={16} />
                Filters & budget<span>{filters ? '−' : '+'}</span>
              </button>
              {filters && (
                <div className="filters">
                  <label className="field" htmlFor="filter-budget">
                    <span>Max monthly total ($)</span>
                    <Input
                      type="number"
                      min={0}
                      id="filter-budget"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="Any budget"
                    />
                  </label>
                  <Choice
                    label="Bedrooms"
                    value={beds}
                    options={['Any layout', '0', '1', '2', '3', '4']}
                    onChange={setBeds}
                  />
                  <Choice
                    label="Progress"
                    value={status}
                    options={['Any status', ...STATUSES]}
                    onChange={setStatus}
                  />
                  <Choice
                    label="Home type"
                    value={homeType}
                    options={['Any home type', ...HOME_TYPES]}
                    onChange={setHomeType}
                  />
                  <label className="field" htmlFor="filter-available">
                    <span>Available by</span>
                    <Input
                      type="date"
                      id="filter-available"
                      value={availableBy}
                      onChange={(e) => setAvailableBy(e.target.value)}
                    />
                  </label>
                  <label className="favorite-field" htmlFor="filter-favorites">
                    <Checkbox
                      id="filter-favorites"
                      checked={favorites}
                      onCheckedChange={setFavorites}
                    />
                    Favorites only
                  </label>
                  <button
                    className="reset-filters"
                    onClick={() => {
                      setBudget('');
                      setBeds('Any layout');
                      setStatus('Any status');
                      setHomeType('Any home type');
                      setFavorites(false);
                      setAvailableBy('');
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </>
          )}
          {loadError && (
            <div className="error-banner" role="alert">
              {loadError}
              {loadError.includes('Sign in') ? (
                <a href="/signin-with-chatgpt?return_to=%2F" target="_top">
                  Sign in
                </a>
              ) : (
                <button onClick={reload}>Retry loading shortlist</button>
              )}
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError('')}>
                <X size={14} />
              </button>
            </div>
          )}
          {BROWSER_MODE && (
            <BrowserTools onChange={reload} onNotice={setNotice} />
          )}
          <div className="result-count">
            <span>
              {tab === 'discover'
                ? searched
                  ? `${filteredPlaces.length} mapped properties`
                  : 'Discover your neighborhood'
                : `${filteredSaved.length} saved properties`}
            </span>
            {tab === 'saved' && (
              <button onClick={reload} aria-label="Refresh shortlist">
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
              </button>
            )}
          </div>
          {tab === 'saved' && loading ? (
            <div className="empty-card">
              <LoaderCircle className="spin" />
              <p>Loading your shortlist…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="empty-card">
              {tab === 'discover' ? (
                <Building2 size={30} />
              ) : (
                <Bookmark size={30} />
              )}
              <h2>
                {tab === 'discover'
                  ? searched
                    ? 'No matching buildings'
                    : 'Start with a neighborhood'
                  : saved.length
                    ? 'No properties match'
                    : 'Your shortlist starts here'}
              </h2>
              <p>
                {tab === 'discover'
                  ? searched
                    ? 'Try another area or clear the name filter. Some rentals are not mapped.'
                    : 'Move or zoom the map, then search the area to discover apartment buildings.'
                  : saved.length
                    ? 'Adjust your filters to see more saved properties.'
                    : 'Save a property from the map, or add one from a listing you found.'}
              </p>
              <Button
                variant="outline"
                onClick={tab === 'discover' ? () => void discover() : add}
                disabled={searching || (tab === 'discover' && !bounds)}
              >
                {tab === 'discover'
                  ? searching
                    ? 'Searching…'
                    : 'Search this area'
                  : 'Add your first property'}
              </Button>
            </div>
          ) : (
            <div className="property-list">
              {rows.map((p) => {
                const isSaved = 'id' in p,
                  units = isSaved ? p.units : [],
                  totals = units
                    .map(monthlyTotal)
                    .filter((n): n is number => n !== null),
                  existing = isSaved || saved.some((s) => s.osmId === p.osmId);
                return (
                  <article
                    className={`property-card ${selected && keyOf(selected) === keyOf(p) ? 'selected-card' : ''}`}
                    key={keyOf(p)}
                  >
                    <button className="card-main" onClick={() => select(p)}>
                      <div className="card-kicker">
                        <span
                          className={existing ? 'saved-tag' : 'discovery-tag'}
                        >
                          {existing ? (
                            <Check size={12} />
                          ) : (
                            <Building2 size={12} />
                          )}{' '}
                          {existing ? 'Shortlisted' : 'Mapped property'}
                        </span>
                        {isSaved && p.favorite && (
                          <Star
                            size={16}
                            fill="currentColor"
                            className="favorite-star"
                          />
                        )}
                      </div>
                      <h2>{p.name}</h2>
                      <p className="address">
                        {p.address || 'Address not mapped · view location'}
                      </p>
                      {isSaved ? (
                        <div className="price-line">
                          <strong>
                            {totals.length
                              ? money(Math.min(...totals))
                              : 'Rent not entered'}
                          </strong>
                          {totals.length > 0 && (
                            <small>
                              / mo{totals.length > 1 ? ' · from' : ''}
                            </small>
                          )}
                          <span className="status-chip">{p.status}</span>
                        </div>
                      ) : (
                        <div className="discovery-meta">
                          <span>Pricing & availability to verify</span>
                        </div>
                      )}
                      <div className="card-bottom">
                        {p.lat !== null && (
                          <span>
                            <Navigation size={12} />
                            {straightLineMiles(p.lat, p.lng!).toFixed(1)} mi
                            straight-line*
                          </span>
                        )}
                        {isSaved && (
                          <span>
                            {units.length} floor plan
                            {units.length === 1 ? '' : 's'}
                          </span>
                        )}
                        <ArrowUpRight size={15} />
                      </div>
                    </button>
                    <Links p={p} />
                  </article>
                );
              })}
            </div>
          )}
          <div className="source-note">
            {BROWSER_MODE && (
              <>
                Saved in this browser only. Export a backup before switching
                devices or clearing browsing data.
                <br />
              </>
            )}
            Mapped buildings are not confirmed vacancies. Research prices on
            property websites.
            <br />
            *Approximate distance to campus, not a driving route.
            <br />
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenStreetMap contributors · ODbL
            </a>
          </div>
        </aside>
        {table ? (
          <section className="tracker-region">
            <div className="tracker-heading">
              <div>
                <p className="eyebrow">ALL THE DETAILS, TOGETHER</p>
                <h2>Your apartment trackpad</h2>
                <p>One row per floor plan. Click a property to edit.</p>
              </div>
              <Button onClick={add}>
                <Plus />
                Add property
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    'Property',
                    'Progress',
                    'Layout',
                    'Monthly total',
                    'Size',
                    'Available',
                    'Commute',
                    'Contact',
                  ].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSaved.flatMap((p) =>
                  (p.units.length ? p.units : [null]).map((u, i) => (
                    <TableRow key={`${p.id}-${i}`}>
                      <TableCell>
                        <button
                          className="table-property"
                          onClick={() => select(p)}
                        >
                          {p.favorite && '★ '}
                          {p.name}
                        </button>
                        <small className="table-sub">
                          {u?.label || p.city || p.homeType}
                        </small>
                      </TableCell>
                      <TableCell>
                        <span className="status-chip">{p.status}</span>
                      </TableCell>
                      <TableCell>
                        {u
                          ? `${u.beds ?? '—'} bed / ${u.baths ?? '—'} bath`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {u ? money(monthlyTotal(u)) : 'Not entered'}
                      </TableCell>
                      <TableCell>
                        {u?.sqft ? `${u.sqft.toLocaleString()} sq ft` : '—'}
                        <small className="table-sub">
                          {u?.bedroomDimensions}
                        </small>
                      </TableCell>
                      <TableCell>
                        {u?.availableDate || 'Not verified'}
                      </TableCell>
                      <TableCell>
                        <a
                          className="text-link"
                          href={commuteUrl(origin(p))}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {p.driveMinutes !== null
                            ? `${p.driveMinutes} min`
                            : 'Directions'}{' '}
                          ↗
                        </a>
                        {p.driveMiles !== null && (
                          <small className="table-sub">
                            {p.driveMiles} driving miles
                          </small>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.contactName || '—'}
                        <small className="table-sub">
                          {p.phone || p.email}
                        </small>
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
            {filteredSaved.length === 0 && (
              <div className="empty-card">
                <Bookmark />
                <h2>No properties to compare yet</h2>
                <p>
                  Add a property or explore the map to start your shortlist.
                </p>
              </div>
            )}
          </section>
        ) : (
          <section className="map-region" aria-label="Apartment discovery map">
            <ApartmentMap
              center={center}
              places={tab === 'discover' ? filteredPlaces : []}
              saved={tab === 'saved' ? filteredSaved : saved}
              selected={selected ? keyOf(selected) : null}
              onBounds={setBounds}
              onSelect={select}
              placing={!!placing}
              onPlace={(lat, lng) => {
                if (placing) {
                  setEditor({ ...placing, lat, lng });
                  setPlacing(null);
                }
              }}
            />
            <div className="map-action">
              {placing ? (
                <div className="placing-notice">
                  <MapPin size={16} />
                  Click the map to place this property
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Cancel map placement"
                    onClick={() => {
                      setEditor(placing);
                      setPlacing(null);
                    }}
                  >
                    <X />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => void discover()}
                  disabled={searching || !bounds}
                >
                  {searching ? <LoaderCircle className="spin" /> : <Search />}
                  {searching ? 'Searching neighborhood…' : 'Search this area'}
                </Button>
              )}
            </div>
            <div className="map-legend">
              <span>
                <i />
                Discovered
              </span>
              <span>
                <i className="legend-saved" />
                Saved
              </span>
            </div>
            <div className="office-card">
              <span className="office-icon">
                <BriefcaseBusiness size={20} />
              </span>
              <div>
                <strong>Your office</strong>
                <p>100 W Caribbean Dr, Sunnyvale</p>
              </div>
              <button
                aria-label="Center map on office"
                onClick={() => setCenter({ lat: OFFICE.lat, lng: OFFICE.lng })}
              >
                <LocateFixed size={18} />
              </button>
            </div>
          </section>
        )}
      </div>
      <Sheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent className="property-sheet">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.address || 'Address not mapped'}
                </SheetDescription>
              </SheetHeader>
              <div className="detail-body">
                <Links p={selected} />
                <div className="detail-commute">
                  <BriefcaseBusiness size={22} />
                  <div>
                    <strong>To Google · Caribbean 100</strong>
                    <p>
                      {selected.lat !== null
                        ? `${straightLineMiles(selected.lat, selected.lng!).toFixed(1)} miles straight-line to approximate campus pin`
                        : 'Add a map pin to see approximate distance'}
                    </p>
                    <a
                      className="text-link"
                      href={commuteUrl(origin(selected))}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open driving directions ↗
                    </a>
                    <a
                      className="text-link"
                      href={commuteUrl(origin(selected), 'transit')}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Check transit ↗
                    </a>
                  </div>
                </div>
                {'id' in selected ? (
                  <>
                    <div className="detail-facts">
                      <span>{selected.homeType}</span>
                      <span>{selected.status}</span>
                      {selected.favorite && <span>★ Favorite</span>}
                    </div>
                    <h3>Units & floor plans</h3>
                    {selected.units.length === 0 && (
                      <p className="form-help">
                        No floor plans recorded. Edit this property to add rent,
                        layout and availability.
                      </p>
                    )}
                    {selected.units.map((u, i) => (
                      <div className="detail-unit" key={u.id}>
                        <div className="section-heading">
                          <h4>{u.label || `Floor plan ${i + 1}`}</h4>
                          <strong>
                            {money(monthlyTotal(u))}
                            {u.rent !== null && <small> / mo</small>}
                          </strong>
                        </div>
                        <p>
                          {u.beds ?? '—'} bed · {u.baths ?? '—'} bath ·{' '}
                          {u.sqft
                            ? `${u.sqft.toLocaleString()} sq ft`
                            : 'Size not entered'}
                        </p>
                        <dl>
                          <div>
                            <dt>Base rent</dt>
                            <dd>{money(u.rent)}</dd>
                          </div>
                          <div>
                            <dt>Monthly fees</dt>
                            <dd>{money(u.fees)}</dd>
                          </div>
                          <div>
                            <dt>Deposit</dt>
                            <dd>{money(u.deposit)}</dd>
                          </div>
                          <div>
                            <dt>Available</dt>
                            <dd>{u.availableDate || 'Not verified'}</dd>
                          </div>
                          <div>
                            <dt>Bedrooms</dt>
                            <dd>
                              {u.bedroomDimensions || 'Dimensions not entered'}
                            </dd>
                          </div>
                          <div>
                            <dt>Lease</dt>
                            <dd>
                              {u.leaseMonths
                                ? `${u.leaseMonths} months`
                                : 'Not entered'}
                            </dd>
                          </div>
                        </dl>
                        {u.concessions && (
                          <p className="unit-concession">{u.concessions}</p>
                        )}
                      </div>
                    ))}
                    <h3>Leasing contact</h3>
                    <p>{selected.contactName || 'Not entered'}</p>
                    {selected.phone && <p>{selected.phone}</p>}
                    {selected.email && <p>{selected.email}</p>}
                    <h3>Research notes</h3>
                    <p className="detail-notes">
                      {selected.notes || 'No notes yet.'}
                    </p>
                    <p className="form-help">
                      Last verified: {selected.verifiedDate || 'Not verified'}
                    </p>
                    {(selected.driveMinutes !== null ||
                      selected.driveMiles !== null) && (
                      <p>
                        Recorded driving estimate:{' '}
                        {selected.driveMinutes ?? '—'} min ·{' '}
                        {selected.driveMiles ?? '—'} mi
                      </p>
                    )}
                  </>
                ) : (
                  <div className="detail-discovery">
                    <Building2 size={28} />
                    <h3>A place to investigate</h3>
                    <p>
                      This building is mapped in OpenStreetMap. Check its
                      website or search online for current rent, floor plans,
                      and vacancies.
                    </p>
                    {selected.phone && <p>{selected.phone}</p>}
                  </div>
                )}
              </div>
              <div className="detail-footer">
                <Button
                  onClick={() => {
                    setEditor(
                      'id' in selected ? selected : emptyProperty(selected),
                    );
                    setSelected(null);
                  }}
                >
                  {'id' in selected ? <Pencil /> : <Plus />}
                  {'id' in selected ? 'Edit property' : 'Save to shortlist'}
                </Button>
                {'id' in selected && (
                  <Button
                    variant="destructive"
                    onClick={() => setDeleting(selected)}
                    aria-label="Remove property"
                  >
                    <Trash2 />
                  </Button>
                )}
                {selected.lat !== null && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTable(false);
                      setCenter({ lat: selected.lat!, lng: selected.lng! });
                      setSelected(null);
                    }}
                  >
                    Show on map
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      {editor && (
        <PropertyEditor
          key={editor.id}
          initial={editor}
          onClose={() => setEditor(null)}
          onSave={async (p) => {
            await save(p);
          }}
          onLocate={(p) => {
            setEditor(null);
            setTable(false);
            setPlacing(p);
            if (p.lat !== null) setCenter({ lat: p.lat, lng: p.lng! });
          }}
        />
      )}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && !deletingBusy && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Remove {deleting?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the property and its saved floor plans and notes from
            your shortlist.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>
              Keep property
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingBusy}
              onClick={remove}
            >
              {deletingBusy ? 'Removing…' : 'Remove property'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
