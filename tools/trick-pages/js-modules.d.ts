/* The game's modules the Trick page scripts import by their published URLs (trick-pages design D4): what
   tools/trick-pages/*.ts uses of js/vedic.js and js/life.js, and the analytics call every page has. */

declare module '/js/vedic.js' {
  export type Step = { say: string; show: string };
  export type Trick = {
    id: string;
    sutra: string;
    sutraId: string;
    meaning: string;
    title: string;
    kid: string;
    grade: number;
    when: string;
    idea: string;
    inputs: { label: string; min: number; max: number }[];
    random(): number[];
    valid(vals: number[]): string | null;
    steps(vals: number[]): Step[];
    answer(vals: number[]): number | string;
    parts?(vals: number[]): string[];
    q?(vals: number[]): string;
  };
  export const TRICKS: Trick[];
}

declare module '/js/life.js' {
  /** addEventListener that is removed when signal aborts; throws without a signal */
  export function on<E extends Event = Event>(target: EventTarget, type: string, fn: (e: E) => void, signal: AbortSignal, opts?: AddEventListenerOptions): void;
  export function onAbort(signal: AbortSignal, fn: () => void): void;
  export function later(fn: () => void, ms: number, signal: AbortSignal): void;
  export function child(signal: AbortSignal): AbortController;
}

interface Window {
  /** js/analytics.js: an anonymous event in fixed words; safe to call before the script has loaded */
  siteTrack?: (path: string, title?: string) => void;
}
