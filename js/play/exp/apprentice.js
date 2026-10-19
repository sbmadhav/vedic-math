/* Teach the Apprentice (#/games/apprentice): Bindu, a round and earnest apprentice, works problems step by step on a
   chalkboard. Sometimes one step hides a real misconception; sometimes every step is right. Find the wrong
   step, pick the coaching tip that fixes it, and watch Bindu redo it and earn belts. Logic: apprentice-core.js. */
import { head, level, t, store, rng, tone, sfx, PENTA, say, confetti, toast, track, reducedMotion, esc } from '../kit.js';
import { on, later, child } from '../life.js';
import * as A from './apprentice-core.js';

const KEY = 'apprentice';
const NAME = 'Bindu';
const fresh = () => (Math.random() * 2 ** 32) >>> 0;
const LINES = {
  start: ['Okay, teacher, watch me work!', 'I think I have got this one.', 'Here goes. Chalk ready!', 'Let me show you how I did it.'],
  ask: ['Did I get it right?', 'How did I do?', 'Is every step right?'],
  wrongPick: ['I checked that one twice. It holds!', 'Hmm, that step looks right to me.', 'Are you sure? I think that one is fine.'],
  claimRight: ['Hmm, are you sure? Something feels off.', 'I have a funny feeling one step is wrong.'],
  found: ['Oh! That step? What should I remember?', 'Oops. You spotted it. What is the trick?', 'Ah, that one. Coach me!'],
  badTip: ['I tried that, but my mistake is something else.', 'Good advice, but it does not fix this step.', 'Hmm, that is not quite my problem here.'],
  fixed: ['Got it! Let me redo it.', 'Oh, that makes sense now!', 'Thank you, teacher!'],
  clean: ['Yes! I did it all by myself!', 'All right? Hooray!', 'I knew it! Thank you for checking.']
};
const say1 = (r, k) => LINES[k][Math.floor(r() * LINES[k].length)];

/* Bindu: a round apprentice with a sprout, big round glasses and a belt in the current color */
const BINDU = `<svg class="ap-bindu-svg" viewBox="0 0 120 130" aria-hidden="true">
  <ellipse class="ap-b-shadow" cx="60" cy="124" rx="34" ry="5"/>
  <path class="ap-b-leaf" d="M60 22 C58 12 50 6 40 8 C44 18 52 22 60 22 Z M60 22 C62 10 72 4 82 8 C78 18 70 22 60 22 Z"/>
  <path class="ap-b-stem" d="M60 30 V20"/>
  <circle class="ap-b-body" cx="60" cy="74" r="46"/>
  <path class="ap-b-belt" d="M24 101 Q60 111 96 101 L92 111 Q60 121 28 111 Z"/>
  <path class="ap-b-knot" d="M57 113 l-5 10 M63 113 l5 10"/>
  <g class="ap-b-face">
    <circle class="ap-b-cheek" cx="30" cy="78" r="6"/><circle class="ap-b-cheek" cx="90" cy="78" r="6"/>
    <circle class="ap-b-glass" cx="44" cy="64" r="13"/><circle class="ap-b-glass" cx="76" cy="64" r="13"/><path class="ap-b-bridge" d="M57 63 h6"/>
    <g class="ap-b-eyes"><circle class="ap-b-eye" cx="45" cy="65" r="4.5"/><circle class="ap-b-eye" cx="77" cy="65" r="4.5"/></g>
    <path class="ap-b-mouth m-ok" d="M50 84 Q60 91 70 84"/>
    <path class="ap-b-mouth m-happy" d="M46 82 Q60 98 74 82 Z"/>
    <path class="ap-b-mouth m-oops" d="M50 88 q5 -5 10 0 q5 5 10 0"/>
    <circle class="ap-b-mouth m-think" cx="62" cy="87" r="3.5"/>
    <path class="ap-b-sweat" d="M96 46 q-5 8 0 11 q5 -3 0 -11 z"/>
  </g>
  <path class="ap-b-arm" d="M100 80 q14 -6 14 -20"/><rect class="ap-b-chalk" x="109" y="50" width="6" height="12" rx="2" transform="rotate(20 112 56)"/>
</svg>`;

export function mount({ root, signal }) {
  const lv = level();
  const S = { points: 0, rounds: 0, recent: [], ...(store.get(KEY, {}) || {}) };
  const save = () => store.set(KEY, S);
  const r = rng(fresh());
  root.innerHTML = `<div class="md-wrap ap">
    ${head({ title: 'Teach the Apprentice', kicker: 'You are the teacher', intro: `${NAME} is learning math and works out loud. Find the step that went wrong and coach ${NAME} with the right tip. Careful: sometimes every step is right.`, color: 'coral' })}
    <div class="ap-belt" aria-live="off"></div>
    <div class="ap-stage">
      <figure class="ap-bindu" data-mood="ok">${BINDU}<figcaption class="ap-bubble"></figcaption></figure>
      <section class="ap-board" aria-label="${NAME}'s chalkboard">
        <p class="ap-q"></p>
        <ol class="ap-steps"></ol>
        <div class="ap-actions"></div>
      </section>
    </div>
  </div>`;
  const $ = s => root.querySelector(s);
  const bindu = $('.ap-bindu'), bubble = $('.ap-bubble'), stepsEl = $('.ap-steps'), actions = $('.ap-actions'), qEl = $('.ap-q'), beltEl = $('.ap-belt');
  let round = null, phase = 'idle', ctl = null, misses = 0;

  const mood = (m, line) => {
    bindu.dataset.mood = m;
    if (line !== undefined) { bubble.textContent = line; bubble.classList.remove('is-pop'); void bubble.offsetWidth; bubble.classList.add('is-pop'); }
  };
  const drawBelt = (up = false) => {
    const b = A.beltOf(S.points);
    bindu.style.setProperty('--belt', `var(--ap-belt-${b.id})`);
    beltEl.innerHTML = `<span class="ap-belt-swatch ap-belt--${b.id}" aria-hidden="true"></span><b>${NAME}: ${esc(b.name)}</b>
      <span class="ap-belt-bar" role="progressbar" aria-label="Progress to the next belt" aria-valuemin="0" aria-valuemax="${A.PER_BELT}" aria-valuenow="${b.into}">${Array.from({ length: A.PER_BELT }, (_, i) => `<i class="${i < b.into ? 'is-on' : ''}"></i>`).join('')}</span>
      <span class="px-note">${b.index === A.BELTS.length - 1 ? 'Master of the chalkboard' : `Next: ${esc(A.BELTS[b.index + 1].name)}`}</span>`;
    if (up) beltEl.classList.add('is-up');
  };
  /* Caught, holds, crossed out and redone are colors and lines on screen; screen readers get the same words */
  const mark = (li, text) => {
    if (!li) return;
    const host = li.querySelector('.ap-step-btn') || li;
    let vh = host.querySelector('.ap-vh'); if (!vh) { vh = document.createElement('span'); vh.className = 'ap-vh'; host.append(vh); }
    vh.textContent = `, ${text}`;
  };
  const stepHtml = (s, i, cls = '') => `<li class="ap-step ${cls}" style="--i:${i}"><button type="button" class="ap-step-btn" data-step="${i}"><span class="ap-step-n">${i + 1}</span><span class="ap-step-t">${esc(s.t)}</span></button></li>`;

  const next = () => {
    if (ctl) ctl.abort();
    ctl = child(signal); const sig = ctl.signal;
    round = A.makeRound(r, lv, { avoid: S.recent });
    S.recent = [round.tpl.id, ...S.recent].slice(0, 6); save();
    misses = 0; phase = 'writing';
    qEl.innerHTML = `<span class="ap-topic">${esc(round.tpl.topic)}</span>${esc(round.q)}`;
    stepsEl.innerHTML = ''; actions.innerHTML = '';
    mood('think', say1(r, 'start'));
    const gap = reducedMotion() ? 60 : 650;
    round.steps.forEach((s, i) => later(() => {
      stepsEl.insertAdjacentHTML('beforeend', stepHtml(s, i, 'is-new'));
      tone(PENTA[2 + i], { dur: 0.06, type: 'triangle', gain: 0.05 });
      stepsEl.querySelectorAll('.ap-step-btn').forEach(b => { b.disabled = true; });
    }, 300 + i * gap, sig));
    later(() => {
      phase = 'judge';
      stepsEl.querySelectorAll('.ap-step-btn').forEach(b => { b.disabled = false; });
      mood('ok', say1(r, 'ask'));
      actions.innerHTML = `<p class="ap-prompt">${t({ explorer: 'Tap the step that went wrong, or say it is all right.', challenger: 'Tap the wrong step, or tell Bindu every step is right.', pro: 'Find the faulty step, or confirm the work.' })}</p>
        <button type="button" class="md-btn ap-allright">Every step is right</button>`;
      say(`${NAME} solved ${round.q} in ${round.steps.length} steps: ${round.steps.map((s, i) => `step ${i + 1}, ${s.t}`).join(' ')} Find the wrong step, or say every step is right.`);
    }, 300 + round.steps.length * gap + 200, sig);
  };

  const gain = () => {
    const before = A.beltOf(S.points).index;
    S.points++; S.rounds++; save();
    const after = A.beltOf(S.points).index;
    drawBelt(after > before);
    if (after > before) { confetti(70); sfx('win'); toast(`${NAME} earned the ${A.BELTS[after].name}!`); say(`${NAME} earned the ${A.BELTS[after].name}.`); track('apprentice/belt', A.BELTS[after].name); }
  };
  const done = (msg) => {
    phase = 'done';
    actions.innerHTML = `<p class="ap-prompt">${esc(msg)}</p><button type="button" class="md-btn md-btn--primary ap-next">Next problem</button>`;
    actions.querySelector('.ap-next').focus({ preventScroll: true });
  };

  const coach = () => {
    phase = 'coach';
    actions.innerHTML = `<p class="ap-prompt">Which tip fixes step ${round.wrongAt + 1}?</p><div class="ap-tips" role="group" aria-label="Coaching tips">${round.tips.map((tp, i) => `<button type="button" class="ap-tip" data-tip="${i}">${esc(tp)}</button>`).join('')}</div>`;
    actions.querySelector('.ap-tip').focus({ preventScroll: true });
  };
  const redo = () => {
    const i = round.wrongAt;
    const li = stepsEl.children[i];
    li.classList.add('is-crossed'); mark(li, 'crossed out');
    tone(PENTA[4], { dur: 0.15 }); tone(PENTA[7], { dur: 0.25, when: 0.12 });
    const olds = [...stepsEl.children];
    later(() => {
      round.right.slice(i).forEach((s, k) => {
        const old = olds[i + k];
        const fixed = document.createElement('li'); fixed.className = 'ap-step is-fixed'; fixed.style.setProperty('--i', k);
        fixed.innerHTML = `<span class="ap-step-n" aria-hidden="true">${i + k + 1}</span><span class="ap-step-t">${esc(s.t)}</span><span class="ap-vh">, redone</span>`;
        old.after(fixed); if (k > 0) { old.classList.add('is-crossed'); mark(old, 'crossed out'); }
      });
      stepsEl.querySelectorAll('.ap-step-btn').forEach(b => { b.disabled = true; });
      mood('happy', say1(r, 'fixed'));
      say(`${NAME} redid it: ${round.right.slice(i).map(s => s.t).join(' ')}`);
      gain(); sfx('ok');
      done(misses ? 'Fixed. Teaching is hard work!' : 'Spot on, and the perfect tip.');
    }, reducedMotion() ? 50 : 500, ctl.signal);
  };

  on(root, 'click', e => {
    const sb = e.target.closest('[data-step]');
    if (sb && phase === 'judge') {
      const i = +sb.dataset.step;
      if (i === round.wrongAt) {
        sb.closest('li').classList.add('is-caught'); mark(sb.closest('li'), 'the wrong step'); mood('oops', say1(r, 'found')); tone(PENTA[3], { dur: 0.1 }); tone(PENTA[1], { dur: 0.18, when: 0.1 });
        say(`Yes, step ${i + 1} is wrong. Which tip fixes it?`); coach();
      } else {
        misses++; sb.closest('li').classList.add('is-checked'); mark(sb.closest('li'), 'holds'); mood('ok', say1(r, 'wrongPick'));
        tone(220, { dur: 0.15, type: 'triangle', gain: 0.08 });
        say(`${NAME} says step ${i + 1} is right: ${round.steps[i].t}`);
      }
      return;
    }
    if (e.target.closest('.ap-allright') && phase === 'judge') {
      if (round.wrongAt < 0) {
        mood('happy', say1(r, 'clean')); sfx('ok');
        stepsEl.querySelectorAll('.ap-step').forEach(li => { li.classList.add('is-good'); mark(li, 'right'); });
        stepsEl.querySelectorAll('.ap-step-btn').forEach(b => { b.disabled = true; });
        gain(); say(`Right: every step was correct.`);
        done('Every step was right. Trusting good work is part of teaching too.');
      } else { misses++; mood('think', say1(r, 'claimRight')); tone(220, { dur: 0.15, type: 'triangle', gain: 0.08 }); say(`${NAME} thinks one step is wrong. Look again.`); }
      return;
    }
    const tb = e.target.closest('[data-tip]');
    if (tb && phase === 'coach') {
      const tip = round.tips[+tb.dataset.tip];
      if (tip === round.fix) {
        phase = 'redo'; tb.classList.add('is-right'); actions.querySelectorAll('.ap-tip').forEach(b => { b.disabled = true; });
        /* Only coaching without a miss is tracked (and earns Sparks): tapping through every step and tip does not */
        if (misses === 0) track('apprentice/coach', round.tpl.topic);
        redo();
      } else {
        misses++; tb.classList.add('is-wrong'); tb.disabled = true;
        const line = say1(r, 'badTip'); mood('think', `“${tip}” ${line}`); say(`${NAME}: ${line}`);
        tone(196, { dur: 0.2, type: 'triangle', gain: 0.08 });
      }
      return;
    }
    if (e.target.closest('.ap-next')) next();
  }, signal);

  drawBelt(); next();
}
