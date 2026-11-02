/* Learn Vedic Math service worker: lets the game work offline. Published at /sw.js and registered by js/app.js with
   scope /learn/, so it controls the game only; the landing and grown-up pages are never controlled.

   TypeScript (openspec change react-typescript, design D9, task 1.5). python3 build.py publishes it as /sw.js with
   its types taken out (tools/build-sw.mjs, which keeps every line where it is), so the worker stays one classic
   script with no imports. The lines build.py rewrites (KILL, the precache block, PREFIX, VOICE_ORIGIN) publish
   exactly as they read before the worker was TypeScript, because only their type annotations are taken out.

   VERSION stays 'dev' in git, with an empty PRECACHE. The deploy (python3 build.py, run by CI) writes the real VERSION
   and PRECACHE into the published copy, between the markers below. VERSION is a hash of every file it precaches plus
   the rest of this file, so any change to the game installs a fresh cache. A 'dev' worker caches nothing and leaves
   every request to the network (and deletes this site's caches), so a --dev build or the unbuilt source never serves
   stale files.

   One version at a time: /learn/ carries the import map, so the shell and its modules must come from the same deploy.
   Install fetches every file in PRECACHE and checks it against the hash build.py recorded (every entry has one; this
   site serves all of them); if the network serves anything else (a half-propagated deploy), the install fails and the
   browser tries again on the next visit, keeping the previous version.

   What is precached (openspec change render-performance, design D10, owner P5): the core of the game, which is the
   shell, every module of the static import graph and the late modules the core routes load (the Arena, the tour, the
   Sutra tags, the stories, installing, the Family helpers), the styles, the design system, the body and heading fonts,
   the icons and the manifest. The Play experiences (js/play/exp/ and their styles in css/play/; js/play/kit.js, which js/app.js loads after every page load, stays core), the
   video list (js/videos.js) and the two fonts only the experiences use are LAZY: build.py lists their stamped URLs but
   the install never downloads them. The worker saves one the first time a page requests it, when the response is a
   success of the expected type (never the 404 page), and a new version copies the saved ones it still uses from the
   cache before it (the stamp is a content hash, so the same URL is the same bytes), so an experience opened once
   stays offline across a deploy that does not change it. Saved stamped files are never trimmed with the runtime
   entries: the build's own file count bounds them.

   Caching, by request:
   - Page loads (navigations) in /learn/: network first so updates show up at once; the precached shell when offline
     or slow. Every route page is the shell with its own head, and the router draws the view from the path, so the
     one saved shell serves them all (openspec change indexable-routes, design D10). Navigation preload (render-performance
     design D11): the browser starts the page request as it starts this worker, and page() takes that response instead
     of fetching again.
   - Same-origin files with ?v=<hash>: cache first (they never change at a given URL).
   - Other same-origin files (fonts, icons, the manifest, vendored code): network first, cache fallback.
   - Studio voice audio (VOICE_ORIGIN, or /voice/ when the voice is static assets): cache first in
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

   THE OLD /play/ SCOPE (openspec change indexable-routes, design D10): the game moved from /play/ to /learn/, and a
   browser that saved it before the move still has this file registered under /play/. That registration picks up
   this same file on its next update check (js/app.js asks for one) and takes the retiring branch below: it keeps no
   cache of its own (it deletes every lvm-<VERSION> cache but this version's, so the old /play/ cache goes), answers
   each page load under /play/ with a redirect to the same path under /learn/ (query kept; the browser keeps the
   fragment), lets every other request through, and leaves lvm-voice and lvm-sounds to the /learn/ worker. It stays
   registered, so an old /play/ link opened offline still reaches /learn/, where the /learn/ worker serves the shell.

   KILL SWITCH (retire the worker): set KILL = true below and deploy. Browsers re-check /sw.js on the next visit; the
   new worker deletes every lvm-* cache and unregisters itself, and open tabs keep working from the network. Leave it
   deployed for a few weeks, then remove the register call in js/app.js and delete this file. build.py --target moved
   publishes this file with KILL = true and the old prefix vedic-math- to retire the old sbmadhav.com worker. */
const KILL: boolean = false;
/* build.py: precache (generated, do not edit) */
const VERSION: string = 'dev';
const PRECACHE: [string, string][] = [];
const LAZY: string[] = [];
/* /build.py: precache */
const PREFIX: string = 'lvm-';
const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = PREFIX + VERSION;
const SCOPE = '/learn/';
const OLD_SCOPE = '/play/'; // the game's address before indexable-routes: a registration there retires (design D10)
const RETIRING = ((): boolean => { try { return new URL(sw.registration.scope).pathname === OLD_SCOPE; } catch { return false; } })();
const SHELL = SCOPE;
const RUNTIME_MAX = 60; // plain-URL entries kept beyond the precache list; the oldest go first
const NAV_TIMEOUT = 3500; // ms before a page load falls back to the saved shell
const PRECACHED = new Set(PRECACHE.map(([u]) => new URL(u, location.origin).href));
const KEPT = new Set(LAZY.map(u => new URL(u, location.origin).href)); // saved on first request, carried to the next version
/* A saved stamped file must be what its name says: a module is JavaScript, a stylesheet is CSS (never the 404 page) */
const TYPES: [RegExp, RegExp][] = [[/\.js$/, /javascript/], [/\.css$/, /text\/css/]];
const VOICE_ORIGIN: string | null = 'https://voice.learnvedicmath.com'; // the R2 voice host (design D17); /voice/ when the voice is static assets; null with build.py --voice off
const VOICE = '/voice/';
const VOICE_CACHE = PREFIX + 'voice'; // kept across deploys (not a version cache)
const VOICE_MAX = 4000; // whole lines kept (about 10 KB each); the index and pack files are not counted
const VOICE_LINE = /^(\/voice)?\/l\/[0-9a-f]{14}\.m4a$/; // a whole line's file
const VOICE_HASHED = /^(?:\/voice)?\/(l\/set|p\/[\w-]+)\.[0-9a-f]+\.(bin|json|m4a)$/; // the line set, clip directory, a pack or its map: one copy per name
const THUMBS = '/thumbs/'; // never cached (fetch handler)
const SOUNDS = '/sounds/';
const SOUNDS_CACHE = PREFIX + 'sounds'; // kept across deploys (not a version cache)
const SOUNDS_MAX = 120; // 29 name clips and the Om, with room for remade ones
const API = '/api/'; // the Worker's own endpoints (none yet): never cached

if (VERSION === 'dev') {
  /* Unbuilt source: no fetch handler, so the browser goes to the network. Take over at once and drop
     any saved stamped version, so a stale one does not linger. */
  sw.addEventListener('install', () => { void sw.skipWaiting(); });
  sw.addEventListener('activate', event => {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith(PREFIX)).map(k => caches.delete(k)));
      await sw.clients.claim();
    })());
  });
} else if (KILL) {
  sw.addEventListener('install', () => { void sw.skipWaiting(); });
  sw.addEventListener('activate', event => {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith(PREFIX)).map(k => caches.delete(k)));
      await sw.registration.unregister();
      /* No reload of open tabs: the app registers this file on every visit, so a reload would loop */
    })());
  });
} else if (RETIRING) {
  sw.addEventListener('install', () => { void sw.skipWaiting(); });
  sw.addEventListener('activate', event => {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE && k !== VOICE_CACHE && k !== SOUNDS_CACHE).map(k => caches.delete(k)));
      try { await sw.registration.navigationPreload?.disable(); } catch { /* not supported */ }
      await sw.clients.claim();
    })());
  });
  sw.addEventListener('fetch', (event: FetchEvent) => {
    const req = event.request;
    if (req.method !== 'GET' || req.mode !== 'navigate') return;
    const url = new URL(req.url);
    if (url.origin !== location.origin || !url.pathname.startsWith(OLD_SCOPE)) return;
    event.respondWith(Promise.resolve(moved(url)));
  });
} else {
  sw.addEventListener('install', event => {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      try {
        await Promise.all(PRECACHE.map(([url, hash]) => precache(cache, url, hash)));
      } catch (e) {
        await caches.delete(CACHE); // never leave a half-filled version behind
        throw e;
      }
      await sw.skipWaiting();
    })());
  });

  sw.addEventListener('activate', event => {
    event.waitUntil((async () => {
      /* Keep this version and the one before it (a tab opened on it may still load a module); delete older ones.
         CacheStorage lists caches in the order they were created. */
      const ours = (await caches.keys()).filter(k => k.startsWith(PREFIX) && k !== CACHE && k !== VOICE_CACHE && k !== SOUNDS_CACHE);
      await carryOver(ours);
      await Promise.all(ours.slice(0, -1).map(k => caches.delete(k)));
      /* The browser sends the page request as it starts this worker, instead of after (design D11) */
      try { await sw.registration.navigationPreload?.enable(); } catch { /* not supported: page() fetches as before */ }
      await sw.clients.claim();
    })());
  });

  sw.addEventListener('fetch', (event: FetchEvent) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin === VOICE_ORIGIN) return event.respondWith(voiceFile(req));
    if (url.origin !== location.origin) return;
    if (url.pathname.startsWith(API)) return;

    if (req.mode === 'navigate') return url.pathname.startsWith(SCOPE) ? event.respondWith(page(event)) : undefined;
    if (url.pathname.startsWith(VOICE)) return event.respondWith(voiceFile(req));
    if (url.pathname.startsWith(SOUNDS)) return event.respondWith(soundFile(req));
    /* Video pictures: network only. Offline the shelf has no videos anyway, and caching them would push the large
       vendor files (the Math Lens reader, the Firebase SDK) out of the RUNTIME_MAX runtime entries */
    if (url.pathname.startsWith(THUMBS)) return;
    if (url.searchParams.has('v')) return event.respondWith(versioned(req));
    event.respondWith(networkFirst(req));
  });

  /* A page asks which files are saved ({ type: 'cached?', urls }, answered on the message's port with
     { type: 'cached', urls: the saved ones }): offline, the shelves mark an experience that was never opened */
  sw.addEventListener('message', (event: ExtendableMessageEvent) => {
    const data = event.data as { type?: unknown; urls?: unknown } | null;
    const port = event.ports?.[0];
    if (!data || data.type !== 'cached?' || !Array.isArray(data.urls) || !port) return;
    const urls = data.urls.filter((u): u is string => typeof u === 'string');
    event.waitUntil((async () => {
      const saved: string[] = [];
      for (const u of urls) if (await caches.match(new URL(u, location.origin).href)) saved.push(u);
      port.postMessage({ type: 'cached', urls: saved });
    })());
  });
}

/* A page under the old /play/ scope: the same path under /learn/, with its query (the 301 _redirects gives online) */
function moved(url: URL): Response {
  return Response.redirect(new URL(SCOPE + url.pathname.slice(OLD_SCOPE.length) + url.search, location.origin).href, 301);
}

/* Fetch one precache entry and check it against the hash build.py recorded. Every file belongs to this site, so a
   missing or different one fails the install (the previous version keeps serving). */
async function precache(cache: Cache, url: string, hash: string): Promise<void> {
  /* The shell and plain URLs skip the HTTP cache (they must be this deploy's); ?v= files may come from it */
  const res = await fetch(new Request(url, { cache: url.includes('?v=') ? 'default' : 'reload' }));
  if (!cacheable(res)) throw new Error(`${url}: HTTP ${res.status}`);
  if (await digest(res.clone()) !== hash) throw new Error(`${url}: does not match version ${VERSION}`);
  await cache.put(url, res);
}

async function digest(res: Response): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', await res.arrayBuffer());
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 10);
}

/* Pages: network first (the navigation preload's response when the browser started one, else a fetch); the precached
   shell of this version when offline or slow */
async function page(event: FetchEvent): Promise<Response> {
  try {
    const net = Promise.resolve(event.preloadResponse).then((pre: Response | undefined) => pre || fetch(event.request));
    return await Promise.race([
      net,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), NAV_TIMEOUT))
    ]);
  } catch {
    const cache = await caches.open(CACHE);
    return (await cache.match(SHELL)) || offlinePage();
  }
}

/* ?v= files: the same URL always holds the same bytes, so any of our caches can answer. A miss is fetched and saved
   when it is a success of the type its name says (a LAZY file saved this way is carried to the next version). */
async function versioned(req: Request): Promise<Response> {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req) || await matchOlder(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (cacheable(res) && expected(req.url, res)) void put(cache, req, res.clone());
  return res;
}

/* The content type a stamped file's name promises; a file of another kind (or one without a type) is not checked */
function expected(url: string, res: Response): boolean {
  const path = new URL(url).pathname;
  const rule = TYPES.find(([ext]) => ext.test(path));
  if (!rule) return true;
  const type = res.headers?.get('content-type') || '';
  return rule[1].test(type);
}

/* A new version keeps the saved LAZY files the build still uses: copied from the caches before it (the newest copy
   wins) before those are deleted. A changed file has a new stamp, so it is not in LAZY and is fetched on its next open. */
async function carryOver(older: string[]): Promise<void> {
  if (!KEPT.size || !older.length) return;
  const cache = await caches.open(CACHE);
  for (const name of [...older].reverse()) {
    const old = await caches.open(name);
    for (const key of await old.keys()) {
      if (!KEPT.has(key.url) || await cache.match(key)) continue;
      const res = await old.match(key);
      if (res) { try { await cache.put(key, res); } catch { /* quota: fetched again on its next open */ } }
    }
  }
}
async function matchOlder(req: Request): Promise<Response | null> {
  for (const k of (await caches.keys()).filter(k => k.startsWith(PREFIX) && k !== CACHE && k !== VOICE_CACHE && k !== SOUNDS_CACHE).reverse()) {
    const hit = await (await caches.open(k)).match(req);
    if (hit) return hit;
  }
  return null;
}

/* Studio voice files: cache first; a miss goes to the network and is kept */
async function voiceFile(req: Request): Promise<Response> {
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
      for (const k of lines.slice(0, Math.max(0, lines.length - VOICE_MAX))) await cache.delete(k);
    } catch { /* quota: play it without saving */ }
  }
  return res;
}

/* Sounds: a ?v= URL is cache first (its bytes never change); a miss goes to the network and is kept. A URL without
   ?v= is network first with the cache as the offline fallback. The trim (oldest dropped past SOUNDS_MAX) runs one at a
   time on a chain, so the idle prefetch and a tap that miss together never delete each other's new entries. */
let soundTrim: Promise<void> = Promise.resolve();
async function soundFile(req: Request): Promise<Response> {
  const cache = await caches.open(SOUNDS_CACHE);
  const pinned = new URL(req.url).searchParams.has('v');
  if (pinned) { const hit = await cache.match(req); if (hit) return hit; }
  let res: Response;
  try { res = await fetch(req); } catch (e) { const hit = !pinned && await cache.match(req); if (hit) return hit; throw e; }
  if (cacheable(res)) {
    try { await cache.put(req, res.clone()); } catch { return res; /* quota: play it without saving */ }
    soundTrim = soundTrim.then(async () => {
      const keys = await cache.keys();
      for (const k of keys.slice(0, Math.max(0, keys.length - SOUNDS_MAX))) await cache.delete(k);
    }).catch(() => {});
    await soundTrim;
  }
  return res;
}

async function networkFirst(req: Request): Promise<Response> {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (cacheable(res)) void put(cache, req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || Response.error();
  }
}

/* Only successful responses go in the cache: same-origin, or CORS from the voice host (no errors, redirects or opaque responses) */
function cacheable(res: Response | undefined): boolean { return !!res && res.ok && (res.type === 'basic' || res.type === 'cors'); }

/* Store a response, then trim runtime entries (plain URLs not in the precache list) to RUNTIME_MAX, oldest first.
   Stamped files stay: the build's own file count bounds them, and an experience saved for offline must not be pushed
   out by the vendor files another one loads. */
async function put(cache: Cache, req: Request, res: Response): Promise<void> {
  try {
    await cache.put(req, res);
    const extra = (await cache.keys()).filter(k => !PRECACHED.has(k.url) && !new URL(k.url).searchParams.has('v'));
    for (const k of extra.slice(0, Math.max(0, extra.length - RUNTIME_MAX))) await cache.delete(k);
  } catch { /* quota or a locked cache: skip caching */ }
}

/* Only if the saved shell is gone (storage cleared while the worker stayed) */
function offlinePage(): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark"><title>Offline · Learn Vedic Math</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;padding:24px;box-sizing:border-box;text-align:center}</style></head>
<body><main><h1>You are offline</h1><p>Learn Vedic Math has not been saved on this device yet. Open it once with a connection and it will work offline after that.</p></main></body></html>`;
  return new Response(html, { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
