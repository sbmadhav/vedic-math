/* Vedic Math service worker: lets the app work offline. Registered by js/app.js with scope
   /vedic-math/, which is more specific than the root worker of sbmadhav.com (scope /), so it
   controls Vedic Math pages. A controlled page's requests to /assets/ and /design-system/ come
   through here too, so the shared files are cached as well.

   build.py writes VERSION and PRECACHE (the block between the markers below). VERSION is a hash of
   every file this repo precaches plus the rest of this file, so any change to the app installs a
   fresh cache. Run python3 build.py after editing index.html, math.css, js/ or this file.

   One version at a time: index.html carries the import map, so the shell and its modules must come
   from the same deploy. Install fetches every file of this repo in PRECACHE and checks it against
   the hash build.py recorded; if the network serves anything else (a half-propagated deploy), the
   install fails and the browser tries again on the next visit, keeping the previous version.

   Caching, by request:
   - Page loads (navigations): network first so updates show up at once; the precached shell when
     offline or slow. Routes are hash routes, so one shell serves them all.
   - /vedic-math/ files with ?v=<hash>: cache first (they never change at a given URL).
   - Other /vedic-math/ files: network first, cache fallback.
   - Shared files from the rest of sbmadhav.com (/design-system/, /assets/, fonts, icons): stale
     while revalidate. This repo cannot hash them, so a change reaches visitors one visit late.
   - Never touched: other origins (Firebase, Google, reCAPTCHA, analytics), anything not a GET.

   Caches are named vedic-math-<VERSION>. The root worker only deletes madhav-*, and this one only
   deletes its own older vedic-math-* caches (keeping the previous one for tabs still open on it).

   KILL SWITCH (retire the worker): set KILL = true below, run build.py and deploy. Browsers re-check
   sw.js on the next visit; the new worker deletes every vedic-math-* cache and unregisters itself,
   and open tabs keep working from the network. Leave it deployed for a few weeks, then remove the
   register call in js/app.js and delete this file. */
const KILL = false;
/* build.py: precache (generated, do not edit) */
const VERSION = 'c19e4ec9c1';
const PRECACHE = [
 ["/vedic-math/", "2f93c1e581"],
 ["/vedic-math/math.css?v=1d88b38c0f", "1d88b38c0f"],
 ["/vedic-math/manifest.webmanifest", "028e2ff70d"],
 ["/vedic-math/js/adapt.js?v=91f53acbfd", "91f53acbfd"],
 ["/vedic-math/js/ambient.js?v=0492d22369", "0492d22369"],
 ["/vedic-math/js/app.js?v=21b76cd097", "21b76cd097"],
 ["/vedic-math/js/arena.js?v=b1a7d0d7ed", "b1a7d0d7ed"],
 ["/vedic-math/js/check.js?v=bc33f6d3e3", "bc33f6d3e3"],
 ["/vedic-math/js/cloud-config.js?v=ecb87dc5eb", "ecb87dc5eb"],
 ["/vedic-math/js/cloud.js?v=904c6706aa", "904c6706aa"],
 ["/vedic-math/js/fx.js?v=9424dca4d6", "9424dca4d6"],
 ["/vedic-math/js/games.js?v=3257ae9c40", "3257ae9c40"],
 ["/vedic-math/js/gamify.js?v=d88ecd06b9", "d88ecd06b9"],
 ["/vedic-math/js/levels.js?v=96a39883e8", "96a39883e8"],
 ["/vedic-math/js/lib.js?v=de7f100624", "de7f100624"],
 ["/vedic-math/js/resources.js?v=8a47c9a533", "8a47c9a533"],
 ["/vedic-math/js/scenes.js?v=275416bf73", "275416bf73"],
 ["/vedic-math/js/skills/early.js?v=9be492b231", "9be492b231"],
 ["/vedic-math/js/skills/high.js?v=006c43d457", "006c43d457"],
 ["/vedic-math/js/skills/index.js?v=4b7c5f0901", "4b7c5f0901"],
 ["/vedic-math/js/skills/middle.js?v=e8427ddd9b", "e8427ddd9b"],
 ["/vedic-math/js/skills/upper.js?v=75bb812d4f", "75bb812d4f"],
 ["/vedic-math/js/store.js?v=0fc67287e4", "0fc67287e4"],
 ["/vedic-math/js/sutra-details.js?v=821d45aa5e", "821d45aa5e"],
 ["/vedic-math/js/sutras.js?v=67420e835e", "67420e835e"],
 ["/vedic-math/js/vedic.js?v=19fb78fa3b", "19fb78fa3b"],
 ["/vedic-math/js/viz.js?v=d299f651ef", "d299f651ef"],
 ["/vedic-math/js/voice-worker.js?v=55fd8ad6b7", "55fd8ad6b7"],
 ["/vedic-math/js/voice.js?v=4eae733eb6", "4eae733eb6"],
 ["/assets/analytics.js", null],
 ["/assets/explore.js", null],
 ["/assets/fonts/fredoka-latin-600-normal.woff2", null],
 ["/assets/fonts/fredoka-latin-700-normal.woff2", null],
 ["/assets/fonts/jetbrains-mono-latin-500-normal.woff2", null],
 ["/assets/fonts/nunito-sans-latin-wght-normal.woff2", null],
 ["/assets/fonts/space-grotesk-latin-wght-normal.woff2", null],
 ["/assets/icons/apple-touch-icon.png", null],
 ["/assets/icons/icon-192.png", null],
 ["/assets/icons/icon-512.png", null],
 ["/assets/icons/maskable-512.png", null],
 ["/design-system/components.css", null],
 ["/design-system/tokens.css", null]
];
/* /build.py: precache */
const PREFIX = 'vedic-math-';
const CACHE = PREFIX + VERSION;
const BASE = '/vedic-math/';
const SHELL = BASE;
const RUNTIME_MAX = 60; // entries kept beyond the precache list; the oldest go first
const NAV_TIMEOUT = 3500; // ms before a page load falls back to the saved shell
const PRECACHED = new Set(PRECACHE.map(([u]) => new URL(u, location.origin).href));

if (KILL) {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', event => {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith(PREFIX)).map(k => caches.delete(k)));
      await self.registration.unregister();
      /* No reload of open tabs: the app registers this file on every visit, so a reload would loop */
    })());
  });
} else {
  self.addEventListener('install', event => {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      try {
        await Promise.all(PRECACHE.map(([url, hash]) => precache(cache, url, hash)));
      } catch (e) {
        await caches.delete(CACHE); // never leave a half-filled version behind
        throw e;
      }
      await self.skipWaiting();
    })());
  });

  self.addEventListener('activate', event => {
    event.waitUntil((async () => {
      /* Keep this version and the one before it (a tab opened on it may still load a module); delete older ones.
         CacheStorage lists caches in the order they were created. */
      const ours = (await caches.keys()).filter(k => k.startsWith(PREFIX) && k !== CACHE);
      await Promise.all(ours.slice(0, -1).map(k => caches.delete(k)));
      await self.clients.claim();
    })());
  });

  self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== location.origin) return;

    if (req.mode === 'navigate') return event.respondWith(page(req));
    const own = url.pathname.startsWith(BASE);
    if (own && url.searchParams.has('v')) return event.respondWith(versioned(req));
    if (own) return event.respondWith(networkFirst(req));
    event.respondWith(staleWhileRevalidate(req, event));
  });
}

/* Fetch one precache entry. Files from this repo carry a hash and must match it; shared files from the
   rest of the site are best effort (a missing font should not stop the app working offline). */
async function precache(cache, url, hash) {
  const own = hash !== null;
  try {
    /* The shell skips the HTTP cache (it must be this deploy's); ?v= files may come from it; shared files are revalidated */
    const res = await fetch(new Request(url, { cache: !own ? 'no-cache' : url.includes('?v=') ? 'default' : 'reload' }));
    if (!cacheable(res)) throw new Error(`${url}: HTTP ${res.status}`);
    if (own && await digest(res.clone()) !== hash) throw new Error(`${url}: does not match version ${VERSION}`);
    await cache.put(url, res);
  } catch (e) {
    if (own) throw e;
  }
}

async function digest(res) {
  const buf = await crypto.subtle.digest('SHA-256', await res.arrayBuffer());
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 10);
}

/* Pages: network first; the precached shell of this version when offline or slow */
async function page(req) {
  try {
    return await Promise.race([
      fetch(req),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NAV_TIMEOUT))
    ]);
  } catch (e) {
    const cache = await caches.open(CACHE);
    return (await cache.match(SHELL)) || offlinePage();
  }
}

/* ?v= files: the same URL always holds the same bytes, so any of our caches can answer */
async function versioned(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req) || await matchOlder(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (cacheable(res)) put(cache, req, res.clone());
  return res;
}
async function matchOlder(req) {
  for (const k of (await caches.keys()).filter(k => k.startsWith(PREFIX) && k !== CACHE).reverse()) {
    const hit = await (await caches.open(k)).match(req);
    if (hit) return hit;
  }
  return null;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (cacheable(res)) put(cache, req, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(req)) || Response.error();
  }
}

async function staleWhileRevalidate(req, event) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const refresh = fetch(req).then(res => { if (cacheable(res)) put(cache, req, res.clone()); return res; }).catch(() => null);
  if (hit) { event.waitUntil(refresh); return hit; }
  return (await refresh) || Response.error();
}

/* Only successful same-origin responses go in the cache (no errors, redirects or opaque responses) */
function cacheable(res) { return !!res && res.ok && res.type === 'basic'; }

/* Store a response, then trim runtime entries (anything not in the precache list) to RUNTIME_MAX, oldest first */
async function put(cache, req, res) {
  try {
    await cache.put(req, res);
    const extra = (await cache.keys()).filter(k => !PRECACHED.has(k.url));
    for (let i = 0; i < extra.length - RUNTIME_MAX; i++) await cache.delete(extra[i]);
  } catch (e) { /* quota or a locked cache: skip caching */ }
}

/* Only if the saved shell is gone (storage cleared while the worker stayed) */
function offlinePage() {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark"><title>Offline · Vedic Math</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;padding:24px;box-sizing:border-box;text-align:center}</style></head>
<body><main><h1>You are offline</h1><p>Vedic Math has not been saved on this device yet. Open it once with a connection and it will work offline after that.</p></main></body></html>`;
  return new Response(html, { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
