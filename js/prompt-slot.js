/* The Prompt slot (openspec change install-app, requirement "One prompt at a time"; GLOSSARY.md): at most one prompt
   or visitor asks for a Player's attention at a time. A prompt is anything the app offers on its own, unasked: the
   Install nudge today, and the Family helpers' visitors when that change lands (it adopts this module). Before showing,
   a prompt asks free(); when free it claims the slot with its view's signal, and the slot is released when that
   signal aborts (the route changes) or the prompt releases it (dismissed).

   free() is also false while something else already speaks to the Player: an open dialog (the tour, the age question,
   a Deep dive, the video player, the Install guide), a toast, or a round on screen (the play shell). */
import { onAbort } from './life.js';

let holder = null;

/* What counts as already speaking to the Player, besides a claimed slot */
export const BUSY = 'dialog[open], .fx-toast, html.play-open, html.tour-open';

export const holderOf = () => holder;

export function free(doc = globalThis.document) {
  if (holder) return false;
  try { return !(doc && doc.querySelector(BUSY)); } catch (e) { return true; }
}

/* claim(name, signal): true when the slot is now name's (or already was); the slot frees itself when signal aborts */
export function claim(name, signal) {
  if (holder && holder !== name) return false;
  if (holder === name) return true;
  holder = name;
  onAbort(signal, () => release(name));
  return true;
}

export function release(name) { if (holder === name) holder = null; }
