/* Vedic Math service worker: lets the app work offline. Registered by js/app.js with scope
   /vedic-math/, which is more specific than the root worker of sbmadhav.com (scope /), so it
   controls Vedic Math pages. A controlled page's requests to /assets/ and /design-system/ come
   through here too, so the shared files are cached as well.

   VERSION stays 'dev' in git, with an empty PRECACHE. The deploy (python3 build.py --out _site, run
   by CI) writes the real VERSION and PRECACHE into the published copy, between the markers below.
   VERSION is a hash of every file this repo precaches plus the rest of this file, so any change to
   the app installs a fresh cache. A 'dev' worker caches nothing and leaves every request to the
   network (and deletes this app's caches), so the unbuilt source, served locally or published by
   mistake without the build, never serves stale files.

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
   - Studio voice audio (/vedic-math/voice/): cache first in its own cache, vedic-math-voice, which every
     deploy keeps (the file names hold their content's hash, so a name never changes meaning). Trimmed to
     VOICE_MAX whole lines, oldest first. Nothing is precached: only Players who use read aloud download audio.
   - Sounds (/vedic-math/sounds/: the Sutra name clips and the Om, openspec sutra-pronunciation): cache first in
     their own cache, vedic-math-sounds, which every deploy keeps, so a name heard once plays offline after the next
     deploy too. Every sound URL the app builds carries ?v=<content hash> (js/say-clips.js), so a changed file is a new
     URL and the old entry is never served for it; a sounds/ request without ?v= goes network first (cache only when
     offline), so it cannot go stale either. Never in the install precache: only Players who tap Say it (or turn on
     the Om) download them. Trimmed to SOUNDS_MAX, one trim at a time.
   - Never touched: other origins (Firebase, Google, reCAPTCHA, analytics), anything not a GET.

   Caches are named vedic-math-<VERSION>. The root worker only deletes madhav-*, and this one only
   deletes its own older vedic-math-* caches (keeping the previous one for tabs still open on it).

   KILL SWITCH (retire the worker): set KILL = true below and deploy (push to main). Browsers re-check
   sw.js on the next visit; the new worker deletes every vedic-math-* cache and unregisters itself,
   and open tabs keep working from the network. Leave it deployed for a few weeks, then remove the
   register call in js/app.js and delete this file. */
const KILL = false;
/* build.py: precache (generated, do not edit) */
const VERSION = 'dev';
const PRECACHE = [];
/* /build.py: precache */
const PREFIX = 'vedic-math-';
const CACHE = PREFIX + VERSION;
const BASE = '/vedic-math/';
const SHELL = BASE;
const RUNTIME_MAX = 60; // entries kept beyond the precache list; the oldest go first
const NAV_TIMEOUT = 3500; // ms before a page load falls back to the saved shell
const PRECACHED = new Set(PRECACHE.map(([u]) => new URL(u, location.origin).href));
const VOICE = BASE + 'voice/';
const VOICE_CACHE = PREFIX + 'voice'; // kept across deploys (not a version cache)
const VOICE_MAX = 4000; // whole lines kept (about 10 KB each); the index and pack files are not counted
const VOICE_LINE = /\/voice\/l\/[0-9a-f]{14}\.m4a$/; // a whole line's file
const SOUNDS = BASE + 'sounds/';
const SOUNDS_CACHE = PREFIX + 'sounds'; // kept across deploys (not a version cache)
const SOUNDS_MAX = 120; // 29 name clips and the Om, with room for remade ones

if (VERSION === 'dev') {
  /* Unbuilt source: no fetch handler, so the browser goes to the network. Take over at once and drop
     any saved stamped version, so a stale one does not linger. */
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', event => {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith(PREFIX)).map(k => caches.delete(k)));
      await self.clients.claim();
    })());
  });
} else if (KILL) {
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
      const ours = (await caches.keys()).filter(k => k.startsWith(PREFIX) && k !== CACHE && k !== VOICE_CACHE && k !== SOUNDS_CACHE);
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
    if (url.pathname.startsWith(VOICE)) return event.respondWith(voiceFile(req));
    if (url.pathname.startsWith(SOUNDS)) return event.respondWith(soundFile(req));
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
  for (const k of (await caches.keys()).filter(k => k.startsWith(PREFIX) && k !== CACHE && k !== VOICE_CACHE && k !== SOUNDS_CACHE).reverse()) {
    const hit = await (await caches.open(k)).match(req);
    if (hit) return hit;
  }
  return null;
}

/* Studio voice files: cache first; a miss goes to the network and is kept */
async function voiceFile(req) {
  const cache = await caches.open(VOICE_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (cacheable(res)) {
    try {
      await cache.put(req, res.clone());
      /* Only whole lines count and are dropped: the line set, clip directory and packs are few, saved first and
         never re-saved, so an oldest-first trim over everything would drop them first and leave offline read aloud
         with nothing to look lines up in */
      const lines = (await cache.keys()).filter(k => VOICE_LINE.test(new URL(k.url).pathname));
      for (let i = 0; i < lines.length - VOICE_MAX; i++) await cache.delete(lines[i]);
    } catch (e) { /* quota: play it without saving */ }
  }
  return res;
}

/* Sounds: a ?v= URL is cache first (its bytes never change); a miss goes to the network and is kept. A URL without
   ?v= is network first with the cache as the offline fallback. The trim (oldest dropped past SOUNDS_MAX) runs one at a
   time on a chain, so the idle prefetch and a tap that miss together never delete each other's new entries. */
let soundTrim = Promise.resolve();
async function soundFile(req) {
  const cache = await caches.open(SOUNDS_CACHE);
  const pinned = new URL(req.url).searchParams.has('v');
  if (pinned) { const hit = await cache.match(req); if (hit) return hit; }
  let res;
  try { res = await fetch(req); } catch (e) { const hit = !pinned && await cache.match(req); if (hit) return hit; throw e; }
  if (cacheable(res)) {
    try { await cache.put(req, res.clone()); } catch (e) { return res; /* quota: play it without saving */ }
    soundTrim = soundTrim.then(async () => {
      const keys = await cache.keys();
      for (let i = 0; i < keys.length - SOUNDS_MAX; i++) await cache.delete(keys[i]);
    }).catch(() => {});
    await soundTrim;
  }
  return res;
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
