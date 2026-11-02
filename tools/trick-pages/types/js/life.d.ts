/* The shape of js/life.js for the Trick pages' TypeScript (openspec change trick-pages, design D4): the calculator's
   listeners go through on() with a page-lifetime signal, the lifecycle rule in CODING_STANDARDS.md. */

/** addEventListener that is removed when signal aborts */
export function on<K extends keyof WindowEventMap>(target: Window, type: K, fn: (ev: WindowEventMap[K]) => void, signal: AbortSignal, opts?: AddEventListenerOptions): void;
export function on<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, fn: (ev: HTMLElementEventMap[K]) => void, signal: AbortSignal, opts?: AddEventListenerOptions): void;
export function on(target: EventTarget, type: string, fn: (ev: Event) => void, signal: AbortSignal, opts?: AddEventListenerOptions): void;

/** setTimeout that never runs after signal aborts */
export function later(fn: () => void, ms: number, signal: AbortSignal): void;
