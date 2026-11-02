/* Runs the published service worker (app/src/sw/sw.ts with its types taken out, exactly as python3 build.py publishes
   it) in a Node vm with a fake `self`, fake caches and a fake network, for the worker's tests. A test can change
   constants (a built VERSION, a smaller VOICE_MAX) and reach the worker's own functions by name. */
import vm from 'node:vm';
// @ts-expect-error: a plain .mjs build tool without types (the function returns the worker's source)
import { buildWorker } from '../../../tools/build-sw.mjs';

export const ORIGIN = 'https://learnvedicmath.com';

/* A response as the worker sees it: the fields it reads, a body the tests compare, and its content type (the type a
   stamped file's name promises by default, so a module reads as JavaScript and a stylesheet as CSS; `contentType`
   in init gives another, '' none) */
export type FakeResponse = { ok: boolean; type: string; status: number; body: string; headers: { get(name: string): string | null }; clone(): FakeResponse };
export const typeOf = (url: string): string => (/\.css(\?|$)/.test(url) ? 'text/css' : /\.js(\?|$)/.test(url) ? 'text/javascript' : /\.html?(\?|$)|\/(\?|$)/.test(url) ? 'text/html' : 'application/octet-stream');
export const response = (body: string, init: Partial<FakeResponse> & { contentType?: string } = {}): FakeResponse => {
  const { contentType, ...rest } = init;
  const type = contentType ?? typeOf(body.replace(/^[a-z]+:/, ''));
  return { ok: true, type: 'basic', status: 200, body, headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? type || null : null) }, ...rest, clone() { return this; } };
};

/* One cache: url -> response, listed in insertion order as CacheStorage does. `slowPut` makes each put take a few
   random milliseconds, so puts can finish out of order. */
export function fakeCache(slowPut = false) {
  const store = new Map<string, FakeResponse>();
  const order: string[] = [];
  const urlOf = (r: string | { url: string }) => (typeof r === 'string' ? new URL(r, ORIGIN).href : r.url);
  return {
    store,
    order,
    match: async (r: string | { url: string }) => store.get(urlOf(r)),
    put: async (r: string | { url: string }, res: FakeResponse) => {
      if (slowPut) await new Promise(done => setTimeout(done, Math.random() * 3));
      store.delete(urlOf(r));
      store.set(urlOf(r), res);
      order.push(urlOf(r));
    },
    keys: async () => [...store.keys()].map(url => ({ url })),
    delete: async (r: string | { url: string }) => store.delete(urlOf(r)),
  };
}
export type FakeCache = ReturnType<typeof fakeCache>;

export type Load = {
  /* Each [pattern, replacement] is applied to the published source before it runs */
  edits?: [RegExp | string, string][];
  /* The names of the worker's functions to reach (they are top-level function declarations) */
  expose?: string[];
  slowPut?: boolean;
  /* The registration's scope (the game's, /learn/, unless a test runs the worker under the old /play/ scope) */
  scope?: string;
};

export function load({ edits = [], expose = [], slowPut = false, scope = '/learn/' }: Load = {}) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const caches = new Map<string, FakeCache>();
  const open = (name: string) => { let c = caches.get(name); if (!c) { c = fakeCache(slowPut); caches.set(name, c); } return c; };
  /* The fake network: up or down, the URLs asked for, the body prefix of every answer, and a content type for every
     answer when a test sets one (else the type the URL's name promises) */
  const net = { up: true, calls: [] as string[], body: 'net', type: undefined as string | undefined };
  /* The registration: unregister (the kill switch) and navigation preload, off until activate enables it */
  const registration = { scope: new URL(scope, ORIGIN).href, unregister: async () => true, navigationPreload: { enabled: false, enable: async () => { registration.navigationPreload.enabled = true; }, disable: async () => { registration.navigationPreload.enabled = false; } } };
  const ctx: Record<string, unknown> = {
    self: { addEventListener: (type: string, fn: (event: unknown) => void) => { listeners[type] = fn; }, skipWaiting: async () => {}, clients: { claim: async () => {} }, registration },
    caches: {
      open: async (name: string) => open(name),
      keys: async () => [...caches.keys()],
      delete: async (name: string) => caches.delete(name),
      /* CacheStorage.match: the first cache, in creation order, that holds the URL */
      match: async (r: string | { url: string }) => { for (const c of caches.values()) { const hit = await c.match(r); if (hit) return hit; } return undefined; },
    },
    fetch: async (req: string | { url: string }) => {
      const url = typeof req === 'string' ? new URL(req, ORIGIN).href : req.url;
      net.calls.push(url);
      if (!net.up) throw new TypeError('offline');
      return response(`${net.body}:${url}`, net.type === undefined ? {} : { contentType: net.type });
    },
    Request: class { url: string; cache: string | undefined; constructor(url: string, init: { cache?: string } = {}) { this.url = new URL(url, ORIGIN).href; this.cache = init.cache; } },
    Response: class { constructor(public body: string, public init: unknown) {} static redirect(url: string, status = 302) { return { ok: false, type: 'basic', status, body: '', redirected: url, headers: { get: (name: string) => (name.toLowerCase() === 'location' ? url : null) }, clone() { return this; } }; } },
    location: { origin: ORIGIN }, URL, setTimeout, Promise, console, crypto,
  };
  let src: string = buildWorker();
  for (const [from, to] of edits) src = src.replace(from, to);
  vm.createContext(ctx);
  vm.runInContext(`${src}\n;globalThis.__expose = { ${expose.join(', ')} };`, ctx);
  const fns = ctx.__expose as Record<string, (...args: unknown[]) => Promise<FakeResponse>>;

  /* Sends one request through the fetch listener: whether the worker answered it, and its answer */
  function request(url: string, { method = 'GET', mode = 'no-cors' } = {}) {
    let answer: Promise<FakeResponse> | null = null;
    listeners.fetch?.({ request: { method, url, mode }, respondWith: (p: Promise<FakeResponse>) => { answer = Promise.resolve(p); answer.catch(() => {}); } });
    return { answered: answer !== null, answer: answer as Promise<FakeResponse> | null };
  }
  return { listeners, caches, open, net, fns, request, registration };
}
