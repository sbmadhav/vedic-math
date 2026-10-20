/* Learn Vedic Math service worker: lets the game work offline. Published at /sw.js and registered by js/app.js with
   scope /play/, so it controls the game only; the landing and grown-up pages are never controlled.

   VERSION stays 'dev' in git, with an empty PRECACHE. The deploy (python3 build.py, run by CI) writes the real VERSION
   and PRECACHE into the published copy, between the markers below. VERSION is a hash of every file it precaches plus
   the rest of this file, so any change to the game installs a fresh cache. A 'dev' worker caches nothing and leaves
   every request to the network (and deletes this site's caches), so a --dev build or the unbuilt source never serves
   stale files.

   One version at a time: /play/ carries the import map, so the shell and its modules must come from the same deploy.
   Install fetches every file in PRECACHE and checks it against the hash build.py recorded (every entry has one; this
   site serves all of them); if the network serves anything else (a half-propagated deploy), the install fails and the
   browser tries again on the next visit, keeping the previous version.

   Caching, by request:
   - Page loads (navigations) in /play/: network first so updates show up at once; the precached shell when offline
     or slow. Routes are hash routes, so one shell serves them all.
   - Same-origin files with ?v=<hash>: cache first (they never change at a given URL).
   - Other same-origin files (fonts, icons, the manifest, vendored code): network first, cache fallback.
   - Studio voice audio (https://voice.learnvedicmath.com/, or /voice/ when the voice is static assets): cache first in
     its own cache, lvm-voice, which every deploy keeps (file names hold their content's hash, so a name never changes
     meaning). Trimmed to VOICE_MAX whole lines, oldest first; a new line set, clip directory or pack replaces its older
     copy. Nothing is precached: only Players who use read aloud download audio.
   - Sounds (/sounds/: the Sutra name clips and the Om, openspec sutra-pronunciation): cache first in their own cache,
     lvm-sounds, which every deploy keeps, so a name heard once plays offline after the next deploy too. Every sound
     URL the app builds carries ?v=<content hash> (js/say-clips.js), so a changed file is a new URL; a sounds/ request
     without ?v= goes network first (cache only when offline). Never precached. Trimmed to SOUNDS_MAX, one trim at a time.
   - Never touched: other origins (Firebase, Google, YouTube, analytics), anything not a GET.

   Caches are named lvm-<VERSION>; this worker only deletes its own older lvm-<VERSION> caches (keeping the previous
   one for tabs still open on it), never lvm-voice or lvm-sounds.

   KILL SWITCH (retire the worker): set KILL = true below and deploy. Browsers re-check /sw.js on the next visit; the
   new worker deletes every lvm-* cache and unregisters itself, and open tabs keep working from the network. Leave it
   deployed for a few weeks, then remove the register call in js/app.js and delete this file. build.py --target moved
   publishes this file with KILL = true and the old prefix vedic-math- to retire the old sbmadhav.com worker. */
const KILL = false;
/* build.py: precache (generated, do not edit) */
const VERSION = 'dev';
const PRECACHE = [];
/* /build.py: precache */
const PREFIX = 'lvm-';
const CACHE = PREFIX + VERSION;
const SCOPE = '/play/';
const SHELL = SCOPE;
const RUNTIME_MAX = 60; // entries kept beyond the precache list; the oldest go first
const NAV_TIMEOUT = 3500; // ms before a page load falls back to the saved shell
const PRECACHED = new Set(PRECACHE.map(([u]) => new URL(u, location.origin).href));
const VOICE_ORIGIN = 'https://voice.learnvedicmath.com'; // the R2 voice host (design D17); /voice/ when the voice is static assets
const VOICE = '/voice/';
const VOICE_CACHE = PREFIX + 'voice'; // kept across deploys (not a version cache)
const VOICE_MAX = 4000; // whole lines kept (about 10 KB each); the index and pack files are not counted
const VOICE_LINE = /^(\/voice)?\/l\/[0-9a-f]{14}\.m4a$/; // a whole line's file
const VOICE_HASHED = /^(?:\/voice)?\/(l\/set|p\/[\w-]+)\.[0-9a-f]+\.(bin|json|m4a)$/; // the line set, clip directory, a pack or its map: one copy per name
const THUMBS = '/thumbs/'; // never cached (fetch handler)
const SOUNDS = '/sounds/';
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
    if (url.origin === VOICE_ORIGIN) return event.respondWith(voiceFile(req));
    if (url.origin !== location.origin) return;

    if (req.mode === 'navigate') return url.pathname.startsWith(SCOPE) ? event.respondWith(page(req)) : undefined;
    if (url.pathname.startsWith(VOICE)) return event.respondWith(voiceFile(req));
    if (url.pathname.startsWith(SOUNDS)) return event.respondWith(soundFile(req));
    /* Video pictures: network only. Offline the shelf has no videos anyway, and caching them would push the large
       vendor files (the Math Lens reader, the Firebase SDK) out of the RUNTIME_MAX runtime entries */
    if (url.pathname.startsWith(THUMBS)) return;
    if (url.searchParams.has('v')) return event.respondWith(versioned(req));
    event.respondWith(networkFirst(req));
  });
}

/* Fetch one precache entry and check it against the hash build.py recorded. Every file belongs to this site, so a
   missing or different one fails the install (the previous version keeps serving). */
async function precache(cache, url, hash) {
  /* The shell and plain URLs skip the HTTP cache (they must be this deploy's); ?v= files may come from it */
  const res = await fetch(new Request(url, { cache: url.includes('?v=') ? 'default' : 'reload' }));
  if (!cacheable(res)) throw new Error(`${url}: HTTP ${res.status}`);
  if (await digest(res.clone()) !== hash) throw new Error(`${url}: does not match version ${VERSION}`);
  await cache.put(url, res);
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
      /* A new recording names its line set, directory and packs by a new hash: saving one drops the copy it replaces */
      const own = new URL(req.url).pathname.match(VOICE_HASHED);
      if (own) for (const k of await cache.keys()) {
        const m = new URL(k.url).pathname.match(VOICE_HASHED);
        if (m && m[1] === own[1] && m[2] === own[2] && k.url !== req.url) await cache.delete(k);
      }
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

/* Only successful responses go in the cache: same-origin, or CORS from the voice host (no errors, redirects or opaque responses) */
function cacheable(res) { return !!res && res.ok && (res.type === 'basic' || res.type === 'cors'); }

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
<meta name="color-scheme" content="light dark"><title>Offline · Learn Vedic Math</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;padding:24px;box-sizing:border-box;text-align:center}</style></head>
<body><main><h1>You are offline</h1><p>Learn Vedic Math has not been saved on this device yet. Open it once with a connection and it will work offline after that.</p></main></body></html>`;
  return new Response(html, { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
