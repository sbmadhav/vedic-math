/* The Nikhilam Family helpers' overlay (openspec family-helpers): one layer above the toasts, one Visit at a time.
   Loaded by js/family-hook.js only for a Player who turned the helpers on. The rules are in js/family-helpers.js (pure);
   this module draws, places and times. Every listener and timer goes through js/life.js with a Visit's or a round's
   signal (view-lifecycle spec, test/lifecycle-scan.test.mjs).
   - Never covers the question, the answer or the round's buttons (placeVisit), never takes focus, closes on one tap
     or Escape; Not now mutes automatic Visits for this browser session.
   - Text only until the owner's recording lands (design D13): nothing here speaks.
   - Calm, Pause motion and reduced motion: a short fade, no movement (fx.noMotion, fx.onMotionChange). */
import * as store from './store.js';
import * as fx from './fx.js';
import * as metrics from './metrics.js';
import { on, later, child } from './life.js';
import { friendSVG } from './family.js';
import { createCoach, planVisit, showMeTurn, placeVisit, exampleFor, skillInfo, bandFor, nickWords, helpSetting, memoryAfter, wasHard, FRIENDS, RULES } from './family-helpers.js';
import { answerText } from './answers.js';
import { TRICKS } from './vedic.js';

const MUTE = 'vm.familyMute';
const muted = () => { try { return sessionStorage.getItem(MUTE) === '1'; } catch (e) { return false; } };
const setMuted = () => { try { sessionStorage.setItem(MUTE, '1'); } catch (e) {} };
const greeted = () => { try { return sessionStorage.getItem('vm.familyHi') === '1'; } catch (e) { return true; } };
const setGreeted = () => { try { sessionStorage.setItem('vm.familyHi', '1'); } catch (e) {} };
const plain = h => String(h).replace(/<[^>]+>/g, ' ').replace(/&minus;/g, '-').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

/* One coach for the tab, so the 3 minute rule and the escalation span Practice, Katas and Stars (design D5) */
let coach = null;
const coachNow = () => {
  const s = helpSetting(store.player());
  if (!coach) coach = createCoach({ setting: s, muted: muted() }); else coach.setSetting(s);
  return coach;
};
/* The one page-lifetime controller: a 'leave' Visit outlives the round that sent it (it shows on the next page) */
const page = new AbortController();
let current = null; /* the open Visit: { ctl, el } */

function layer() {
  let l = document.querySelector('.fh-layer');
  if (!l) { l = document.createElement('div'); l.className = 'fh-layer'; document.body.append(l); }
  return l;
}
/* Closes the open Visit. If a keyboard user was inside it, focus goes back to the round (its answer field, else Ask a
   friend), never to the top of the page. */
function close() {
  const c = current; current = null; if (!c) return;
  const inside = c.el.contains(document.activeElement);
  c.ctl.abort(); c.el.remove();
  if (inside && c.back && c.back.isConnected) c.back.focus({ preventScroll: true });
}

const BTN = { show: 'Show me', hint: 'Another hint', notnow: 'Not now', thanks: 'Thanks!', next: 'Next' };

/* Opens a Visit. v: planVisit()'s { kind, level, turns, buttons }. r: the round { root, card, protect, hint, signal } */
function open(v, r, { info, band, example, nick = '' }) {
  close();
  const ctl = child(r.signal), vs = ctl.signal;
  const crew = [...new Set(v.turns.map(t => t.friend))];
  const el = document.createElement('div');
  el.className = `fh-visit fh-visit--${crew.length}`; el.dataset.level = String(v.level); el.dataset.kind = v.kind;
  el.setAttribute('role', 'group'); el.setAttribute('aria-label', `Family helpers: ${crew.map(f => FRIENDS[f].name).join(', ')}`);
  el.innerHTML = `<div class="fh-bubble"><button type="button" class="fh-x" aria-label="Close">&times;</button><p class="fh-who"></p><div class="fh-say"></div><div class="fh-btns"></div></div>
    <div class="fh-crew">${crew.map(f => `<span class="fh-friend" data-f="${f}">${friendSVG(f)}</span>`).join('')}</div>`;
  current = { ctl, el, back: r.root.querySelector('input.ans-in, .pr-choice, [data-fh-ask]') };
  const turns = v.turns.slice(); let i = 0;
  const still = () => el.classList.toggle('fh-still', fx.noMotion());
  still(); fx.onMotionChange(still, vs);
  const draw = () => {
    const t = turns[i], last = i === turns.length - 1;
    el.querySelector('.fh-who').textContent = FRIENDS[t.friend].name;
    el.querySelectorAll('.fh-friend').forEach(f => { const on = f.dataset.f === t.friend; f.classList.toggle('fh-on', on); f.querySelector('svg').setAttribute('data-pose', on ? t.pose || 'talk' : 'idle'); });
    el.dataset.speaker = t.friend; el.style.setProperty('--fh-tip', `${28 + crew.indexOf(t.friend) * 45}px`); /* the bubble points at its speaker */
    const ex = t.example ? `<p class="fh-ex">${t.example.q}</p>` : '';
    const steps = t.steps ? `<ol class="fh-steps">${t.steps.map(s => `<li>${s}</li>`).join('')}</ol>${t.example && t.example.answer ? `<p class="fh-ex-a">That one is <b>${t.example.answer}</b>. Now yours!</p>` : ''}` : '';
    const box = el.querySelector('.fh-say'); box.innerHTML = `<p>${t.html}</p>${ex}${steps}`;
    box.querySelectorAll('.fh-nick').forEach(n => { n.textContent = nick; }); /* the Nickname as text, never markup (js/family-helpers.js fill) */
    const btns = last ? v.buttons.filter(b => b !== 'show' || !turns.some(x => x.steps)) : ['next', 'notnow'];
    el.querySelector('.fh-btns').innerHTML = btns.map(b => `<button type="button" class="md-btn md-btn--sm${b === 'next' || b === 'show' || b === 'thanks' ? ' md-btn--primary' : ''}" data-fh="${b}">${BTN[b]}</button>`).join('');
    fx.announce(`${FRIENDS[t.friend].name} says: ${box.querySelector('p').textContent}${t.example ? ' ' + plain(t.example.q) : ''}${t.steps ? ' ' + t.steps.map(plain).join(' ') : ''}`);
  };
  on(el, 'click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const k = b.classList.contains('fh-x') ? 'close' : b.dataset.fh;
    if (k === 'next') { i++; draw(); return; }
    if (k === 'show') { coachNow().used(); metrics.family('show_me'); turns.push(showMeTurn({ band, info, example })); i = turns.length - 1; draw(); place(); return; }
    if (k === 'hint') { coachNow().used(); const gave = r.hint && r.hint(); close(); if (!gave) fx.announce('No more hints on this one. Show me has an example.'); return; }
    if (k === 'notnow') { coachNow().mute(); setMuted(); metrics.family('not_now'); close(); return; }
    close(); /* Thanks! and the close button */
  }, vs);
  on(document, 'keydown', e => { if (e.key === 'Escape' && current && current.el === el) { e.preventDefault(); close(); } }, vs);
  /* Placement (design D6): measured hidden, then put in the first free band, or docked under the round's card */
  let docked = false;
  const protectRects = () => [...r.root.querySelectorAll(r.protect)].filter(n => !n.closest('[hidden]')).map(n => n.getBoundingClientRect()).filter(b => b.width > 0 && b.height > 0);
  function place() {
    if (docked || !el.isConnected) return;
    const head = document.querySelector('header.md-header'), top = head ? Math.max(0, head.getBoundingClientRect().bottom) : 0;
    el.classList.add('fh-measure'); const box = el.getBoundingClientRect(); el.classList.remove('fh-measure');
    const at = placeVisit({ w: innerWidth, h: innerHeight, top }, protectRects(), { w: Math.ceil(box.width), h: Math.ceil(box.height) });
    if (at.side === 'dock') { docked = true; el.classList.add('fh-docked'); el.style.left = el.style.top = ''; const c = typeof r.card === 'string' ? r.root.querySelector(r.card) : r.card; (c || r.root).after(el); return; }
    el.dataset.from = at.from; el.dataset.side = at.side; el.style.left = `${Math.round(at.x)}px`; el.style.top = `${Math.round(at.y)}px`;
  }
  layer().append(el); draw(); place();
  let queued = false; const again = () => { if (queued) return; queued = true; later(() => { queued = false; place(); }, 80, vs); };
  on(window, 'resize', again, vs); on(window, 'scroll', again, vs, { passive: true });
  on(window, 'hashchange', close, vs);
}

/* Shows a planned Visit at once (planVisit()'s result) over a round { root, card, protect, hint, signal }: the same
   drawing mountFamily uses, for the look-and-motion prototype (docs/prototypes/family-helpers/). */
export const showVisit = (v, round, opts = {}) => open(v, { card: null, protect: 'input, button', hint: null, ...round }, { info: skillInfo(null), band: 'growing', example: null, ...opts });
export const closeVisit = () => close();

/* A round's Family. opts: { root, card, signal, area, protect (selector inside root), ctx() -> { skill, problem },
   hint() -> true when the round gave a hint }. Returns { note(event) } (events: js/family-helpers.js createCoach). */
export function mountFamily({ root, card = null, signal, area = 'practice', protect = 'input, button, .pr-q', ctx = () => ({}), hint = null }) {
  const r = { root, card, protect, hint, signal };
  let idle = null;
  const player = () => store.player();
  function ctxInfo() {
    const c = ctx() || {}, s = c.skill || null, trick = s && s.trick ? TRICKS.find(t => t.id === s.trick) : null;
    return { c, s, info: skillInfo(s, trick) };
  }
  function show(plan, { at = r } = {}) {
    const p = player(), { c, s, info } = ctxInfo(), band = bandFor(p), mem = p.familyMem || null;
    const example = s && s.gen && plan.kind === 'help' ? exampleFor({ gen: () => s.gen(1), answerOf: e => answerText(e, s), q: c.problem ? c.problem.q : '', answer: c.problem ? answerText(c.problem, s) : '' }) : null;
    const greet = !greeted(), remember = plan.kind === 'help' && mem && mem.last === info.key;
    const v = planVisit({ plan, band, info, example, nick: nickWords(p.name), greet, remember, canHint: !!(at.hint && c.problem && area !== 'star') });
    if (!v.turns.length) return;
    setGreeted();
    if (info.key) store.updatePlayer({ familyMem: memoryAfter(mem, info.key, { solved: plan.kind === 'cheer' }) });
    const cheer = plan.kind === 'cheer'; metrics.familyVisit(v.level, cheer);
    open(v, at, { info, band, example, nick: nickWords(p.name) });
  }
  function note(ev) {
    const co = coachNow(), { s, info } = ctxInfo(), skill = (s && s.id) || area;
    const e = { ...ev, skill: ev.skill || skill };
    if (e.type === 'roundEnd' && e.hard == null) e.hard = wasHard(player().familyMem, info.key);
    if (e.type === 'ask') metrics.family('ask');
    if (e.type === 'question') { if (current) close(); watchIdle(); } /* a new question ends the last one's Visit */
    const plan = co.note(e, { quiet: !!current && e.type !== 'ask' });
    if (!plan) return;
    if (plan.kind === 'leave') { const ctl = child(page.signal); later(() => { if (!current) show(plan, { at: { ...r, root: document.getElementById('view') || document.body, card: null, protect: 'a, button, input, select, textarea, h1, h2, .pr-q, .mq-viz', hint: null, signal: ctl.signal } }); }, 400, ctl.signal); return; } /* the next page's controls, and its question if it is a round */
    if (e.type === 'ask' && current) close();
    show(plan);
  }
  /* Idle (design D4): about RULES.idleMs on one question with no input, tap or key in the round */
  function watchIdle() {
    if (idle) idle.abort();
    idle = child(signal); const qs = idle.signal;
    let gen = 0;
    const arm = () => { const n = ++gen; later(() => { if (n === gen && !current) note({ type: 'idle' }); }, RULES.idleMs, qs); };
    ['input', 'keydown', 'pointerdown'].forEach(t => on(root, t, arm, qs));
    arm();
  }
  return { note };
}
