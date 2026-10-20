/* Runs the published service worker (app/src/sw/sw.ts with its types taken out, exactly as python3 build.py publishes
   it) in a Node vm with a fake `self`, fake caches and a fake network, for the worker's tests. A test can change
   constants (a built VERSION, a smaller VOICE_MAX) and reach the worker's own functions by name. */
import vm from 'node:vm';
// @ts-expect-error: a plain .mjs build tool without types (the function returns the worker's source)
import { buildWorker } from '../../../tools/build-sw.mjs';

export const ORIGIN = 'https://learnvedicmath.com';

/* A response as the worker sees it: the fields it reads, and a body the tests compare */
export type FakeResponse = { ok: boolean; type: string; status: number; body: string; clone(): FakeResponse };
export const response = (body: string, init: Partial<FakeResponse> = {}): FakeResponse =>
  ({ ok: true, type: 'basic', status: 200, body, ...init, clone() { return this; } });

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
};

export function load({ edits = [], expose = [], slowPut = false }: Load = {}) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const caches = new Map<string, FakeCache>();
  const open = (name: string) => { let c = caches.get(name); if (!c) { c = fakeCache(slowPut); caches.set(name, c); } return c; };
  const net = { up: true, calls: [] as string[], body: 'net' };
  const ctx: Record<string, unknown> = {
    self: { addEventListener: (type: string, fn: (event: unknown) => void) => { listeners[type] = fn; }, skipWaiting: async () => {}, clients: { claim: async () => {} }, registration: { unregister: async () => true } },
    caches: { open: async (name: string) => open(name), keys: async () => [...caches.keys()], delete: async (name: string) => caches.delete(name) },
    fetch: async (req: string | { url: string }) => {
      const url = typeof req === 'string' ? new URL(req, ORIGIN).href : req.url;
      net.calls.push(url);
      if (!net.up) throw new TypeError('offline');
      return response(`${net.body}:${url}`);
    },
    Request: class { url: string; cache: string | undefined; constructor(url: string, init: { cache?: string } = {}) { this.url = new URL(url, ORIGIN).href; this.cache = init.cache; } },
    Response: class { constructor(public body: string, public init: unknown) {} },
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
  return { listeners, caches, open, net, fns, request };
}
