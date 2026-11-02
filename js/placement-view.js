/* Placement (openspec placement): the screens at #/placement. The offer ("Want to find your level? About 3 minutes. No
   clock.", Start or Skip, just play), the untimed climb (one question per Step, Explorer's three big buttons, the usual
   entry in Challenger and Pro, Hear it, I'm not sure, a neutral line after a miss) and the result ("You climbed N
   steps! Bolt will start you there."). The climb itself is the pure engine in shared/src/placement.ts; this file only
   draws it. Loaded on demand by js/app.js (the route), so a first load never pays for it.
   Lifecycle: every listener and timer runs through js/life.js on the view's signal or a child of it (one child per
   question), so leaving the route stops everything and saves nothing (leaving mid-climb counts as Skip).
   Speech follows a tap (glossary, Read aloud): the first question is read from the Start handler and every next one
   from the answer handler, never from a timer; in Explorer the question is read when Read aloud is on, and Hear it
   again always reads it; in Challenger and Pro only Hear it reads.
   Saving the result, raise-only and the one analytics event happen in the handler of the answer that ends the climb
   (design decision 11, builder call R3). Nothing about a Placement is sent anywhere; the answers are kept only in this
   module's state while the climb runs. */
import * as P from '../shared/src/placement.ts';
import * as store from './store.js';
import * as fx from './fx.js';
import * as metrics from './metrics.js';
import { speakAll } from './voice.js';
import { boltHTML, pose } from './bolt.js';
import { checkOne } from './check.js';
import { on, later, child } from './life.js';

const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* The offer's one line for each Mode (openspec placement, the offer screen) */
const OFFER_LINE = { explorer: 'A few questions, one at a time. Every right answer climbs a step. Then Bolt knows where to start you.', challenger: 'A few questions that climb from easy to hard, one at a time. Where you stop is where practice starts. Nothing you earn is ever lowered.', pro: 'A short climb from easy to hard, one question a step, sets where practice starts. Ranked rounds and Boards are untouched.' };
export const MISS_LINE = "Let's try a different one.", RIGHT_LINE = 'Yes! Up a step.';
const SPEAKER = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a4 4 0 0 1 0 7M18.5 6a7.5 7.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

/* The result line: the steps climbed, never a grade, a number missed or the word test (design decision 1, Q12) */
export const resultLines = steps => (steps ? [`You climbed ${steps} ${steps === 1 ? 'step' : 'steps'}!`, 'Bolt will start you there.'] : ['A good try!', 'Bolt will start you at the first step.']);

/* Draws the Placement in root. signal: the view's (from the router). Returns nothing; leaving the route stops it. */
export function placementView(root, { signal }) {
  const mode = fx.mode() || 'challenger', explorer = mode === 'explorer';
  /* A seeded climb for the tests (window.__vmSeed, set before the page loads); otherwise Math.random */
  const seed = typeof window !== 'undefined' ? window.__vmSeed : undefined, rand = seed === undefined || seed === null ? Math.random : P.rng(seed);
  let st = null, phase = null, p = null, input = false;
  const $ = s => root.querySelector(s);
  const newPhase = () => { if (phase) phase.abort(); phase = child(signal); return phase.signal; };
  const stillCls = () => (fx.noMotion() ? ' still' : '');
  /* Read aloud, after a tap: the lines one after another by the voice order (a recorded whole line, clips, the device) */
  const speakLines = lines => { if (!explorer || !fx.voiceOn()) return; try { speakAll(lines.filter(Boolean)); } catch (e) {} };
  const say = (html, name) => { const el = $('#plSay'); if (el) el.innerHTML = html; if (name) pose($('.place-bolt'), name); };

  /* ---------- The offer ---------- */
  function offer() {
    newPhase();
    root.innerHTML = `<div class="place place-offer md-card${stillCls()}">
      <span class="md-tag md-tag--sky">Find your level</span>
      <div class="place-talk"><span class="place-bolt">${boltHTML('idle')}</span><div class="place-talk-t">
        <h1 class="md-heading place-h" id="plH" tabindex="-1">Want to find your level?</h1>
        <p class="md-lede place-lede">About 3 minutes. No clock.</p></div></div>
      <p class="place-line">${OFFER_LINE[mode] || OFFER_LINE.challenger}</p>
      <p class="place-acts"><button type="button" class="md-btn md-btn--primary" id="plStart">Start</button><button type="button" class="md-btn" id="plSkip">Skip, just play</button></p></div>`;
    on($('#plStart'), 'click', start, signal);
    on($('#plSkip'), 'click', skip, signal);
    $('#plH').focus({ preventScroll: true });
  }
  /* Skip: nothing saved but the answered offer, and Home exactly as before */
  function skip() { store.setPlacementCard('done'); fx.sfx('tap'); location.hash = '#/'; }

  /* ---------- The climb ---------- */
  function start() {
    store.setPlacementCard('done'); /* the offer is answered: leaving mid-climb counts as Skip and asks nothing again */
    fx.sfx('pop');
    st = P.placementStart({ mode, rand });
    root.innerHTML = `<div class="place place-climb${stillCls()}">
      <div class="place-stairs" id="plStairs" role="img" aria-label="${stairsLabel()}">${stairsHTML()}</div>
      <div class="md-card place-card">
        <div class="place-talk"><span class="place-bolt">${boltHTML('idle')}</span><p class="place-say" id="plSay">Here we go. One at a time.</p></div>
        <div class="place-main" id="plMain"></div>
      </div></div>`;
    ask();
  }
  const stairsHTML = () => Array.from({ length: P.QUESTIONS }, (_, i) => `<i class="${i < st.rights ? 'on' : ''}" style="--i:${i}"></i>`).join('');
  const stairsLabel = () => `${st.rights} ${st.rights === 1 ? 'step' : 'steps'} climbed`;
  const stairs = () => { const el = $('#plStairs'); if (!el) return; el.innerHTML = stairsHTML(); el.setAttribute('aria-label', stairsLabel()); };

  /* The question on screen: Explorer's three big buttons (every Step, algebra included), else a choice question's chips
     or the one answer box; Hear it (again) and I'm not sure under it */
  function ask() {
    const ps = newPhase(), cur = st.current, main = $('#plMain');
    p = explorer ? P.asChoice(cur.p, rand) : cur.p;
    const n = P.stepNumber(st);
    const entry = p.kind === 'choice'
      ? `<div class="pr-choices place-choices" role="group" aria-label="Choices">${p.choices.map(c => `<button type="button" class="md-chip pr-choice" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>`
      : `<form class="pr-form place-form" id="plForm" autocomplete="off" novalidate><div class="pr-in"><label class="md-sr-only" for="plIn">Your answer</label><input class="ans-in" id="plIn" inputmode="${Number.isInteger(p.answer) && p.answer >= 0 ? 'numeric' : 'text'}" spellcheck="false" autocapitalize="off" enterkeyhint="go">${p.unit ? `<span class="pr-unit">${esc(p.unit)}</span>` : ''}</div><button type="submit" class="md-btn md-btn--primary" id="plCheck">Check</button></form>`;
    main.innerHTML = `<span class="star-tag" id="plStep">Step ${n}</span>
      <h2 class="pr-q place-q${String(p.q).replace(/<[^>]+>/g, '').length > 60 ? ' long' : ''}" id="plQ" tabindex="-1">${p.q}</h2>
      ${p.viz ? `<div class="mq-viz">${p.viz}</div>` : ''}${entry}
      <p class="place-acts place-acts--sm"><button type="button" class="md-btn md-btn--sm" id="plHear">${SPEAKER} ${explorer ? 'Hear it again' : 'Hear it'}</button><button type="button" class="md-btn md-btn--sm" id="plUnsure">I'm not sure</button></p>`;
    stairs();
    /* A tap just after the last answer is not an answer to this one: the buttons wake a moment after the question draws */
    const acts = [...main.querySelectorAll('.pr-choice, #plCheck, #plUnsure')]; acts.forEach(b => { b.disabled = true; }); input = false;
    later(() => { acts.forEach(b => { b.disabled = false; }); input = true; }, 350, ps);
    main.querySelectorAll('.pr-choice').forEach(b => on(b, 'click', () => { if (!input) return; main.querySelectorAll('.pr-choice').forEach(x => x.setAttribute('aria-pressed', String(x === b))); answer(b.dataset.v === String(p.answer)); }, ps));
    const form = $('#plForm');
    if (form) on(form, 'submit', e => {
      e.preventDefault(); if (!input) return;
      const r = checkOne({ ...p, plain: true }, $('#plIn').value);
      if (r.empty) { say('Type an answer first.', 'think'); return; }
      if (r.notAnswer) { say('Type just the answer, like 56.', 'think'); return; }
      answer(r.ok);
    }, ps);
    on($('#plHear'), 'click', () => fx.speakQuestion(p, true), ps);
    on($('#plUnsure'), 'click', () => { if (input) answer(false); }, ps);
    fx.announce(`Step ${n}.`);
    const q = $('#plQ'); q.focus({ preventScroll: true });
    if (!explorer && $('#plIn') && matchMedia('(pointer: fine)').matches) $('#plIn').focus({ preventScroll: true });
  }

  /* One answer, from a tap: the climb moves, Bolt says one line (never the answer), and the next question or the result
     follows at once, so what is read aloud still follows the tap */
  function answer(ok) {
    input = false;
    st = P.placementAnswer(st, ok);
    fx.sfx(ok ? 'ok' : 'no');
    const line = ok ? RIGHT_LINE : MISS_LINE;
    if (st.done) { finish(line, ok); return; }
    ask();
    say(line, ok ? 'cheer' : 'think');
    speakLines([line, p.say || p.q]);
  }

  /* ---------- The result ---------- */
  function finish(line, ok) {
    newPhase();
    const r = P.placementResult(st), me = store.player();
    /* Saved on this device only, in the Player's record (design decision 11): the level and the steps; Bolt's start Belt
       only ever moves forward; saved Ratings below the level's start are raised, none lowered (decision 7) */
    store.setPlacement(r);
    store.updatePlayer({ placedBelt: P.forwardBelt(me.placedBelt, P.beltFor(r.grade)) });
    store.upgrade(S => { const out = P.raiseOnly(S, r.grade); if (out === S) return false; S.ratings = out.ratings; return true; });
    store.setPlacementCard('done');
    metrics.placementDone(); /* the one fixed event, from the handler of the answer that ended the climb */
    const [head, sub] = resultLines(r.steps);
    root.innerHTML = `<div class="place place-result md-card${stillCls()}">
      <div class="place-stairs place-stairs--done" role="img" aria-label="${stairsLabel()}">${stairsHTML()}</div>
      <div class="place-talk"><span class="place-bolt">${boltHTML(ok ? 'cheer' : 'wink')}</span><div class="place-talk-t"><p class="place-say" id="plSay">${line}</p><h2 class="md-heading place-h" id="plH" tabindex="-1">${head}</h2><p class="md-lede place-lede">${sub}</p></div></div>
      <p class="place-acts"><a class="md-btn md-btn--primary" href="#/" id="plGo">Let's go</a></p></div>`;
    fx.announce(`${head} ${sub}`);
    speakLines([line, head, sub]);
    fx.sparkle($('.place-bolt'), { n: 10, signal });
    $('#plH').focus({ preventScroll: true });
  }

  offer();
}
