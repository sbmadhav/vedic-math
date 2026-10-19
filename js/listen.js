/* Listen buttons (openspec explanation-audio): every explanation on screen can be heard. A button reads its lines
   with the read-aloud voice order of js/voice.js (the studio recording of the whole line, else clips, else this
   device's voice). Only one plays at a time: pressing another stops the first, and pressing a playing one stops it.
   It is an explicit tap, so it plays with read aloud off, like Hear it. aria-pressed is true while it plays.
   Listeners belong to the view's signal (js/life.js); aborting it stops what a button started. */
import * as voice from './voice.js';
import { on, onAbort } from './life.js';
import { linesForKey } from './explain-lines.js';
import { mode } from './fx.js';
import { listened } from './metrics.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

/* The button. key: a linesForKey() key, or "from:<selector>" to read the page itself (worked steps, the diagram
   step on screen), found in the nearest box around the button that has any (never past a [data-listen-scope]).
   what: its name. */
export const listenBtn = (key, what) =>
  `<button type="button" class="listen-btn" data-listen="${esc(key)}" aria-pressed="false" aria-label="Listen: ${esc(what)}">${ICON}<span>Listen</span></button>`;

let current = null; // the button playing now
const release = btn => { if (btn) btn.setAttribute('aria-pressed', 'false'); if (current === btn) current = null; };

/* The lines a button reads */
export function linesFor(btn) {
  const key = btn.dataset.listen || '';
  if (key.startsWith('from:')) {
    const sel = key.slice(5), stop = btn.closest('[data-listen-scope]');
    let scope = btn.parentElement;
    while (scope && scope !== stop && !scope.querySelector(sel)) scope = scope.parentElement;
    return scope ? [...scope.querySelectorAll(sel)].map(el => el.innerHTML.trim()).filter(Boolean) : [];
  }
  return linesForKey(key, mode() || 'challenger');
}

/* Starts or stops a button. lines: what to read (default: linesFor(btn)) */
export function toggle(btn, lines = linesFor(btn)) {
  if (current === btn) { voice.stop(); release(btn); return; }
  if (current) { const prev = current; voice.stop(); release(prev); }
  if (!lines.length) return;
  current = btn; btn.setAttribute('aria-pressed', 'true');
  listened();
  voice.speakAll(lines).then(() => release(btn), () => release(btn));
}
/* Stops whatever a Listen button is playing */
export function stopListen() { if (current) { const b = current; voice.stop(); release(b); } }

/* Every [data-listen] button inside root, until signal aborts (which also stops one of them that is playing) */
export function wireListen(root, signal, lines = linesFor) {
  if (!root || !signal) return;
  on(root, 'click', e => { const b = e.target.closest && e.target.closest('.listen-btn'); if (b && root.contains(b)) toggle(b, lines(b)); }, signal);
  onAbort(signal, () => { if (current && (!current.isConnected || root.contains(current))) stopListen(); });
}
