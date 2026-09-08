# Apartment name search implementation plan

Goal: Search apartment names across the South Bay inside Homebase while retaining Search this area.
Architecture: Explicit submitted name query to Overpass, with literal regex escaping, bounded geography, throttling and session caching. Reuse Place normalization, cards, pins and shortlist editor. Separate name input from local list filtering. Never search on keystrokes. No paid API.

1. Add tested query builder in lib/name-search.ts; reject short/long inputs and escape query syntax.
2. Add name search client with bounded cache, timeout and existing normalization.
3. Add separate Discover search form with pending/error/empty states; reset local filter on new discovery and center on a result.
4. Run tests, typecheck, lint and Pages build. Probe live service, commit, push and verify Pages deployment.
