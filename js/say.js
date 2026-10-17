/* Say it (openspec sutra-pronunciation): a speaker button beside a Sutra name plays its Name clip, a short
   recording made once with the Kokoro voice the owner chose (tools/sutra-voice/). Under the name the page shows
   the Respelling kids can read ("ay-kah-dhi-KAY-nuh poor-VAY-nuh").
   - Speech only follows a tap, whether read aloud is on or off. A tap stops anything being read aloud and any other
     clip (js/voice.js playClip shares read aloud's stop token); a second tap on a playing button stops it; aborting
     the view's signal (leaving the page, closing the deep dive) stops it.
   - Clips load on use: nothing on page load, one small file on the first tap, then the other 28 one at a time while
     the browser is idle (not with Save-Data), so the names work offline afterwards (sw.js keeps sounds/ cache first).
   - Fallback: when a clip cannot be fetched, decoded or played, the device's English voice reads the Respelling
     ("ay kah dhi kay nuh poor vay nuh"), and with no voice at all a status shows the Respelling to read.
   - One anonymous event per tap that starts a clip (metrics.say: math/say/sutra, no name in it).
   Every listener and timer goes through js/life.js on the signal the caller passes. */
import { SUTRAS, SUBSUTRAS } from './sutras.js';
import { CLIPS } from './say-clips.js';
import { playClip, stop as stopVoice } from './voice.js';
import { on, later, onAbort } from './life.js';
import * as metrics from './metrics.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* id (s1 to s16, u1 to u13, as in js/app.js) to the card's name, Respelling and Devanagari */
export const NAMES = Object.fromEntries([...SUTRAS.map(c => ['s' + c.n, c]), ...SUBSUTRAS.map(c => ['u' + c.n, c])]
  .map(([id, c]) => [id, { name: c.name, say: c.say, deva: c.deva }]));
export const clipUrl = id => new URL(`../sounds/sutras/${id}.m4a?v=${CLIPS[id].v}`, import.meta.url).href;
/* What the built-in voice reads when the clip cannot play: the Respelling, hyphens as spaces, lower case */
export const fallbackWords = id => NAMES[id].say.replace(/-/g, ' ').toLowerCase();
export const DEVICE_VOICE_NOTE = "Played with this device's voice, which may not be exact.";
export const noSoundNote = id => `Sound is not available here. Say it like this: ${NAMES[id].say}`;

const SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
/* The button. label: show the words "Hear how to say" beside the icon (the deep dive and Trick pages); the visible
   words are part of the accessible name, "Hear how to say <name>" (WCAG 2.5.3). */
export function sayButton(id, { label = false, cls = '' } = {}) {
  const c = NAMES[id]; if (!c || !CLIPS[id]) return '';
  return `<button type="button" class="say-btn${label ? ' say-btn--label' : ''}${cls ? ' ' + cls : ''}" data-say="${id}" aria-pressed="false" aria-label="Hear how to say ${esc(c.name)}">${SPEAKER}${label ? '<span aria-hidden="true">Hear how to say</span>' : ''}</button>`;
}
/* The Respelling under the name, with a visually hidden prefix for screen readers */
export const respellHTML = (id, tag = 'span') => (NAMES[id] ? `<${tag} class="say-resp"><span class="say-vh">Say it like: </span>${esc(NAMES[id].say)}</${tag}>` : '');
export const devaHTML = id => (NAMES[id] ? `<span class="say-deva" lang="sa">${NAMES[id].deva}</span>` : '');

/* Seams for the node tests; the page uses the defaults */
export const deps = {
  play: url => playClip(url),
  stop: () => stopVoice(),
  count: () => metrics.say(),
  status: text => import('./fx.js').then(m => m.toast(esc(text))).catch(() => {}),
  fetch: url => fetch(url),
  saveData: () => { try { return !!(navigator.connection && navigator.connection.saveData); } catch (e) { return false; } },
  synth: () => (typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance === 'function' ? speechSynthesis : null),
};

let current = null; // { btn, id }: the button whose clip is playing
const setPressed = (btn, on) => { try { btn.setAttribute('aria-pressed', String(on)); btn.classList.toggle('playing', on); } catch (e) {} };
function finish(mine) { if (current !== mine) return; current = null; setPressed(mine.btn, false); }
/* Stops the playing clip (or the fallback voice) and resets its button */
export function stopSay() {
  const c = current; if (!c) return;
  current = null; setPressed(c.btn, false); deps.stop();
}

function fallback(mine, signal) {
  if (current !== mine) return;
  const s = deps.synth();
  if (!s) { deps.status(noSoundNote(mine.id)); finish(mine); return; }
  try {
    const u = new SpeechSynthesisUtterance(fallbackWords(mine.id));
    u.lang = 'en-US'; u.rate = 0.8;
    u.onend = u.onerror = () => finish(mine);
    s.cancel();
    later(() => { if (current === mine) try { s.speak(u); } catch (e) { finish(mine); } }, 40, signal); // Chrome drops an utterance queued in the tick of cancel()
    later(() => finish(mine), 8000, signal); // never left pressed
    deps.status(DEVICE_VOICE_NOTE);
  } catch (e) { deps.status(noSoundNote(mine.id)); finish(mine); }
}

/* Idle prefetch of the other clips after the first tap on this page load, one at a time */
const fetched = new Set();
let queue = null; // ids still to fetch, while a prefetch runs under some signal
function idle(fn, signal) {
  if (typeof requestIdleCallback === 'function') {
    const h = requestIdleCallback(() => { if (!signal.aborted) fn(); }, { timeout: 3000 });
    onAbort(signal, () => { try { cancelIdleCallback(h); } catch (e) {} });
  } else later(fn, 400, signal);
}
function prefetch(signal) {
  if (queue || deps.saveData()) return;
  const mine = queue = Object.keys(CLIPS).filter(id => !fetched.has(id));
  onAbort(signal, () => { if (queue === mine) queue = null; });
  const step = () => {
    if (queue !== mine) return;
    const id = mine.shift(); if (!id) { queue = null; return; }
    if (fetched.has(id)) return step();
    fetched.add(id);
    Promise.resolve().then(() => deps.fetch(clipUrl(id))).then(r => r && r.arrayBuffer && r.arrayBuffer()).catch(() => fetched.delete(id))
      .finally(() => { if (!signal.aborted) idle(step, signal); });
  };
  idle(step, signal);
}

/* A tap on a Say it button */
export function tap(btn, signal) {
  const id = btn && btn.dataset && btn.dataset.say; if (!id || !NAMES[id]) return;
  if (current && current.btn === btn) { stopSay(); return; } // a second tap stops it, and is not counted
  stopSay();
  const mine = current = { btn, id };
  setPressed(btn, true);
  fetched.add(id);
  deps.count();
  let p;
  try { p = Promise.resolve(deps.play(clipUrl(id))); } catch (e) { p = Promise.reject(e); }
  p.then(() => finish(mine), () => fallback(mine, signal));
  prefetch(signal);
}

/* One delegated click listener on root for every Say it button inside it; aborting signal stops a clip they started */
export function wireSay(root, signal) {
  if (!root) return;
  on(root, 'click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-say]');
    if (b && root.contains(b)) { e.preventDefault(); tap(b, signal); }
  }, signal);
  onAbort(signal, () => { if (current && root.contains(current.btn)) stopSay(); });
}
export function _reset() { current = null; queue = null; fetched.clear(); }
