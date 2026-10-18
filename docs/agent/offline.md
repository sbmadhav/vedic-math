# Offline

`sw.js` is this app's service worker, registered by `js/app.js` with scope `/vedic-math/` (on https and localhost). That scope is more specific than the root worker of sbmadhav.com (scope `/`, which leaves `/vedic-math/` to the network), so it controls these pages, including their requests to `/assets/` and `/design-system/`.

- `build.py --out` writes its `VERSION` and `PRECACHE` list into the published copy (between the `build.py: precache` markers): the shell, `math.css`, every module at its import-map URL, the play stylesheets and the manifest, each with a hash the worker checks on install, plus the shared files `index.html` and the manifest reference. In git that block stays `'dev'` and empty; never stamp it by hand. A `'dev'` worker has no fetch handler (network only) and deletes `vedic-math-*` caches, so serving the source locally never goes stale. To test the real worker, build `_site` and serve it (`node e2e/local-server.mjs 8124 _site`).
- Page loads are network first with the saved shell as the offline fallback; `?v=` files are cache first; shared files are stale while revalidate. Other origins (Firebase, Google, analytics) and non-GET requests are never cached. Leaderboards fall back to this device when offline.
- Caches are `vedic-math-<VERSION>`; the worker keeps the current and previous one and never touches `madhav-*` (the root worker's). Never rename the prefix to `madhav-`.
- New same-origin files the page loads must be in `index.html` or the manifest (build.py lists them), and a module worker must be started with `import.meta.resolve(...)` so it gets its `?v=` stamp.
- To retire it, set `KILL = true` in `sw.js` and deploy (see the comment there).
- `manifest.webmanifest` here makes Vedic Math its own installable app (scope `/vedic-math/`); the main site's manifest is unchanged.
- `sounds/` (the 29 Sutra name clips in `sounds/sutras/` and the Om) is served cache first from `vedic-math-sounds`, a cache every deploy keeps, and is never precached. The clips are made by `tools/sutra-voice/make-sutra-clips.mjs`, which also writes `js/say-clips.js` (each clip's size and `?v=` content hash); remake both together (`test/say.test.mjs` checks them).
- `vendor/tesseract/` (the Math Lens digit reader, about 11 MB) is fetched on first use and is never precached.
