/* The types of js/life.js for the Trick page modules (trick-pages design D4), which import it by its published URL
   /js/life.js (tsconfig.json maps that here). What they use of it; js/life.js stays the one implementation. */

/** addEventListener that is removed when signal aborts; throws without a signal */
export function on<E extends Event = Event>(target: EventTarget, type: string, fn: (e: E) => void, signal: AbortSignal, opts?: AddEventListenerOptions): void;
/** Runs fn once when signal aborts (at once if it already has) */
export function onAbort(signal: AbortSignal, fn: () => void): void;
/** setTimeout that never runs after signal aborts */
export function later(fn: () => void, ms: number, signal: AbortSignal): void;
/** A new AbortController that aborts when signal does */
export function child(signal: AbortSignal): AbortController;
