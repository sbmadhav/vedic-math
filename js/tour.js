/* The first-visit tour (openspec in-app-guide): coach marks over real UI on Home. One modal <dialog> holds a
   spotlight ring over the step's element and a card with the step count, title, text, Back, Next (Done on the last
   step) and Skip tour. showModal() keeps focus inside and makes the page inert; Escape (the dialog's cancel) skips.
   Steps come resolved from js/guide.js (resolveTour): { id, sel, title, body }. Every listener is on a child of the
   view's signal (js/life.js), and leaving the view ends the tour as a skip. Nothing moves under fx.noMotion(). */
import { on, child, onAbort } from './life.js';
import * as fx from './fx.js';

const GUTTER = 16, PAD = 6, GAP = 12;
let current = null;

/* startTour(steps, { signal, onEnd(outcome) }): outcome is 'finish' (Done on the last step) or 'skip' (Skip tour,
   Escape, or the view was left). Returns { end } or null when there is nothing to show. */
export function startTour(steps, { signal, onEnd = () => {} } = {}) {
  if (!steps || !steps.length || !signal || signal.aborted) return null;
  if (current) current.end('skip');
  const life = child(signal), ls = life.signal;
  const dlg = document.createElement('dialog');
  dlg.className = 'vm-tour' + (fx.noMotion() ? ' still' : '');
  dlg.setAttribute('aria-labelledby', 'tourT'); dlg.setAttribute('aria-describedby', 'tourN tourB');
  dlg.innerHTML = `<div class="tour-ring" aria-hidden="true"></div>
    <div class="tour-card md-card"><p class="tour-n" id="tourN"></p><h2 class="tour-t" id="tourT" tabindex="-1"></h2><p class="tour-b" id="tourB"></p>
      <div class="tour-acts"><button type="button" class="linkbtn tour-skip" data-act="skip">Skip tour</button><span class="tour-sp"></span><button type="button" class="md-btn md-btn--sm" data-act="back">Back</button><button type="button" class="md-btn md-btn--sm md-btn--primary" data-act="next">Next</button></div></div>`;
  document.body.append(dlg);
  const ring = dlg.querySelector('.tour-ring'), card = dlg.querySelector('.tour-card'), back = dlg.querySelector('[data-act="back"]'), next = dlg.querySelector('[data-act="next"]');
  const opener = document.activeElement;
  let i = 0, ended = false, target = null;

  const end = outcome => {
    if (ended) return; ended = true;
    if (current === api) current = null;
    life.abort();
    try { if (dlg.open) dlg.close(); } catch (e) {}
    dlg.remove(); document.documentElement.classList.remove('tour-open');
    /* Focus goes back where it was, or to the page's main heading */
    const f = opener && opener.isConnected && opener !== document.body ? opener : document.querySelector('#view h1, #view h2');
    if (f && f.isConnected) { if (!f.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(f.tagName)) f.setAttribute('tabindex', '-1'); try { f.focus({ preventScroll: true }); } catch (e) {} }
    onEnd(outcome);
  };

  /* The ring hugs the element (clipped to the screen); the card goes below it when it fits, else above, else at the
     bottom of the screen, always inside a 16px gutter. The card scrolls inside itself when the screen is short. */
  let last = '';
  const place = (force = false) => {
    if (ended || !target || !target.isConnected) return;
    const W = document.documentElement.clientWidth || innerWidth, H = innerHeight;
    const r = target.getBoundingClientRect();
    /* Only when the element or the screen moved: placing the card never feeds back into another placement */
    const key = [W, H, r.left, r.top, r.width, r.height].map(Math.round).join();
    if (!force && key === last) return; last = key;
    const x0 = Math.max(4, r.left - PAD), y0 = Math.max(4, r.top - PAD), x1 = Math.min(W - 4, r.right + PAD), y1 = Math.min(H - 4, r.bottom + PAD);
    Object.assign(ring.style, { left: `${x0}px`, top: `${y0}px`, width: `${Math.max(0, x1 - x0)}px`, height: `${Math.max(0, y1 - y0)}px` });
    const cw = Math.min(380, W - 2 * GUTTER);
    card.style.width = `${cw}px`; card.style.maxHeight = `${H - 2 * GUTTER}px`;
    const ch = card.offsetHeight;
    let top = y1 + GAP;
    if (top + ch > H - GUTTER) top = y0 - GAP - ch >= GUTTER ? y0 - GAP - ch : Math.max(GUTTER, H - GUTTER - ch);
    const left = Math.min(Math.max(GUTTER, (x0 + x1) / 2 - cw / 2), W - GUTTER - cw);
    card.style.left = `${left}px`; card.style.top = `${top}px`;
  };

  const show = k => {
    i = k; const s = steps[i];
    target = document.querySelector(s.sel);
    if (target) { try { target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' }); } catch (e) {} }
    dlg.querySelector('#tourN').textContent = `${i + 1} of ${steps.length}`;
    dlg.querySelector('#tourT').textContent = s.title;
    dlg.querySelector('#tourB').textContent = s.body;
    dlg.dataset.step = s.id;
    back.hidden = i === 0;
    next.textContent = i === steps.length - 1 ? 'Done' : 'Next';
    place(true);
    dlg.querySelector('#tourT').focus({ preventScroll: true });
  };

  on(dlg, 'cancel', e => { e.preventDefault(); end('skip'); }, ls);
  on(dlg, 'click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'skip') end('skip');
    else if (act === 'back' && i > 0) show(i - 1);
    else if (act === 'next') { if (i < steps.length - 1) show(i + 1); else end('finish'); }
  }, ls);
  on(window, 'resize', () => place(), ls);
  on(window, 'scroll', e => { if (!dlg.contains(e.target)) place(); }, ls, { passive: true, capture: true }); /* capture: the menu bar scrolling sideways too */
  on(document, 'vmcalm', () => dlg.classList.toggle('still', fx.noMotion()), ls);
  on(document, 'sitemotion', () => dlg.classList.toggle('still', fx.noMotion()), ls);
  onAbort(signal, () => end('skip'));

  const api = { end, dialog: dlg };
  current = api;
  document.documentElement.classList.add('tour-open'); /* the page holds still under the coach marks; the tour scrolls it */
  dlg.showModal();
  show(0);
  return api;
}
