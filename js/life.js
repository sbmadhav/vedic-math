/* Lifecycle helpers: every listener, timer and animation-frame loop a view or a round starts is tied to an
   AbortSignal, and aborting the signal is the only way to stop it (openspec view-lifecycle spec).
   The router aborts a view's signal when the route changes; rounds and questions run under child signals. */

const need = signal => {
  if (!signal || typeof signal.aborted !== 'boolean' || typeof signal.addEventListener !== 'function') throw new TypeError('life.js: an AbortSignal is required');
};
/* Runs fn once when signal aborts (at once if it already has): for cleanups that are not a listener or timer,
   such as disconnecting an observer */
export const onAbort = (signal, fn) => { need(signal); if (signal.aborted) fn(); else signal.addEventListener('abort', fn, { once: true }); };

/* addEventListener that is removed when signal aborts. opts: other listener options (capture, passive) */
export function on(target, type, fn, signal, opts = {}) {
  need(signal); if (signal.aborted) return;
  target.addEventListener(type, fn, { ...opts, signal });
}

/* setTimeout that never runs after signal aborts */
export function later(fn, ms, signal) {
  need(signal); if (signal.aborted) return;
  const stop = () => clearTimeout(id);
  const id = setTimeout(() => { signal.removeEventListener('abort', stop); if (!signal.aborted) fn(); }, ms);
  signal.addEventListener('abort', stop, { once: true });
}

/* setInterval that stops when signal aborts */
export function every(fn, ms, signal) {
  need(signal); if (signal.aborted) return;
  const id = setInterval(() => { if (!signal.aborted) fn(); }, ms);
  onAbort(signal, () => clearInterval(id));
}

/* requestAnimationFrame loop: fn(now) runs every frame until signal aborts, or until fn returns false
   (a loop that has reached its own end, such as a round clock at zero) */
export function loop(fn, signal) {
  need(signal); if (signal.aborted) return;
  let raf = 0;
  const stop = () => cancelAnimationFrame(raf);
  const step = now => { if (signal.aborted) return; if (fn(now) === false) { signal.removeEventListener('abort', stop); return; } raf = requestAnimationFrame(step); };
  raf = requestAnimationFrame(step);
  signal.addEventListener('abort', stop, { once: true });
}

/* A new AbortController that aborts when signal does. Uses one abort listener on the parent (removed again
   when the child aborts first), so long sessions of short children do not pile listeners on the parent. */
export function child(signal) {
  need(signal);
  const ctl = new AbortController();
  if (signal.aborted) { ctl.abort(); return ctl; }
  const pass = () => ctl.abort();
  signal.addEventListener('abort', pass, { once: true });
  ctl.signal.addEventListener('abort', () => signal.removeEventListener('abort', pass), { once: true });
  return ctl;
}

/* lateImport(load, name, signal): a module loaded after first paint. WebKit rejects one a reload cuts off before
   pagehide, so a failure is logged GRACE ms later unless the page was left or signal aborted by then */
export const GRACE = 1000;
const PAGE = new AbortController().signal;
let left = 0;
if (typeof window != 'undefined' && window.addEventListener) { on(window, 'pagehide', () => { left = 1; }, PAGE); on(window, 'pageshow', () => { left = 0; }, PAGE); }
export const lateImport = (load, name, signal) => Promise.resolve().then(load).catch(e => later(() => left || signal?.aborted || console.error(name + ' did not load', e), GRACE, PAGE));
