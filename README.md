# Bay Area Homebase

**[Open the app](https://nikhilsainethi.github.io/bay-area-homebase/)**

A map-first apartment discovery and personal research tracker for Sunnyvale, Santa Clara, Mountain View, Milpitas, and San Jose. Hosted on GitHub Pages with Supabase email/password sign-in and private cloud shortlists.

## Find and compare apartments

- Enter an apartment name in **Find an apartment by name** and press Search to find mapped name matches across the South Bay. Results use the same cards, pins, and Add to shortlist flow, including available contact details. Searches run only on submission, with throttling and session caching. Names missing from OpenStreetMap will not appear.
- Pan and zoom, then **Search this area** for real mapped apartment buildings from OpenStreetMap.
- Click a pin, open the property website when available, search online, or get directions to **Google Caribbean 100, 100 W Caribbean Dr, Sunnyvale CA 94089**.
- Save properties with contacts, listing links, property type, progress, favorites and notes.
- Keep multiple units/floor plans per property: bedrooms, half bathrooms, rent, recurring fees, deposit, square footage, bedroom dimensions, lease length, concessions and availability.
- Filter by monthly budget, bedrooms, progress, home type, available date and favorites. Compare one row per floor plan in the tracker table.
- Add a rental manually by name/address/listing link and place its pin on the map.

Area discovery shows named properties by default, with addresses underneath. Use **Include buildings without a mapped name** to inspect other footprints. Missing names are explicitly labeled and can be entered when saving; the app does not guess complex names from nearby buildings.

## Your data and backups

**Sign in to save your shortlist in Supabase and open it from any device.** Each account can access only its own records, enforced by database row-level security. The app refreshes when you return to its tab. Create an app account using your email and confirm it before signing in.

Existing browser records are retained. After signing in from the browser you used previously, choose **Copy browser shortlist to account**. Existing cloud records are never overwritten by this copy. Browser map keys stay local.

Use **Export** to back up the signed-in account regularly to download a JSON backup. On another device, open the app and choose **Import**. Import validates the entire backup before saving and adds new records without overwriting existing research; duplicate IDs or mapped buildings are skipped. API keys are excluded from backups. Exported files contain your notes and contact details, so keep them wherever you normally store personal documents.

The public repository contains application code, not your saved records. The office destination is part of the app configuration.

## Switch to Google Maps

Click **Map settings** beside Export/Import and paste your browser API key. It is saved only in your browser and never committed to this repository.

- Enable **Maps JavaScript API** in Google Cloud and configure billing if required by your project.
- Restrict the key to Maps JavaScript API and website referrers such as `https://nikhilsainethi.github.io/*` and `http://localhost:5173/*` if developing locally.
- A browser key is necessarily visible in network requests; website and API restrictions protect its use.
- Google usage charges may apply; a demo key does not imply free unlimited use.
- Reload after replacing an already-loaded Google key. Clear the field and save to return to the free map.

The Google map supports satellite/street view and your apartment pins. If it cannot load, the free map remains available. **Apartment discovery still uses OpenStreetMap**, so this version does not need or call Places API, Geocoding API, or Routes API.

Alternatively, set the repository Actions secret `GOOGLE_MAPS_API_KEY` and rerun the deployment workflow to include a restricted browser key in the build. An optional repository variable `GOOGLE_MAPS_MAP_ID` configures a custom map style; otherwise `DEMO_MAP_ID` is used. The browser's saved key takes precedence over the build key. Real keys must not be hardcoded in source.

References: [Google Maps loading](https://developers.google.com/maps/documentation/javascript/load-maps-js-api), [API security](https://developers.google.com/maps/api-security-best-practices), [OpenStreetMap tile usage](https://operations.osmfoundation.org/policies/tiles/).

## Data limitations

Mapped buildings are **not live rental inventory**. Map coverage, property names and contacts may be incomplete. Rent, dimensions and vacancies are entered from your own research; blanks stay unknown. Monthly totals include rent plus entered recurring fees, exclude concessions and may omit unresearched charges.

Card distances are approximate straight-line distances to the mapped campus building center ([OSM way 1313390490](https://www.openstreetmap.org/way/1313390490)), not driving routes. Google directions use the exact supplied office address. Driving time/distance fields are manually recorded estimates, not live traffic.

Searches are user-triggered, bounded to the South Bay, throttled and cached during the page session. Overpass is a community service and may be temporarily unavailable. You can continue using your saved tracker and add properties manually during an outage. OpenStreetMap attribution is shown in the app. Map providers receive normal map requests; Overpass receives the map area being searched. Choosing external research or directions links opens the relevant provider.

## Develop and deploy

Requires Node 22.13+ (Node 24 recommended) and npm.

```sh
npm ci
npm run dev:pages
```

Open the exact URL shown by Vite (normally `http://localhost:5173/bay-area-homebase/`). The default development mode below is the browser-storage Pages app.

```sh
npm test
npm run typecheck
npm run build:pages
npm run preview:pages
```

The GitHub Actions workflow in `.github/workflows/deploy-pages.yml` runs checks, builds `dist-pages`, and deploys on every push to `main`. Set repository **Settings → Pages → Source** to **GitHub Actions**. The project base path is `/bay-area-homebase/`; change `PAGES_BASE_PATH` if renaming the repository. No API key is needed for the free map.

### Optional server-backed implementation

The repository also retains the original Sites/Cloudflare D1 implementation under `app/api` and `db`. It is not used or deployed by GitHub Pages. `npm run dev` / `npm run build` target this alternate runtime; `npm run db:local` applies its local migrations. That runtime uses Sites dispatch identity and a separate D1 database, and must not be exposed as a standalone Worker trusting unverified identity headers. No live Sites deployment was made; the requested deployment is GitHub Pages.

Optional browser WebMCP tools can read the shortlist and save/update properties using the same validation as the UI. Unsupported browsers omit these tools. The automated tests cover storage roundtrips, non-destructive backup merging, invalid import atomicity, quota/corruption handling, safe URLs, unknown pricing, fractional bathrooms, commute links and partial updates. The optional server integration suite runs separately with `npm run test:integration` against its local server.

## Supabase setup

Apply `supabase/migrations/202609070001_homebase.sql` in the project SQL editor. Set Auth Site URL and allowed redirect URL to the deployed app URL, including `/bay-area-homebase/`. Keep email confirmation enabled. Supabase’s default email sender limits delivery to project-team email addresses; configure custom SMTP before inviting other users.

Set repository Actions variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Local development uses the equivalent `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Only the publishable key belongs in browser builds; never use a secret or service-role key. Without both settings, the app retains browser-only mode.
