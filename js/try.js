/* Try a trick (openspec try-trick-in-modes): one short lesson inside each Mode, on one Trick from Bharati Krishna
   Tirtha's 1965 book, taught under the Sutra that Trick belongs to in js/vedic.js and js/sutras.js:
   Explorer, the 11 sandwich (Ūrdhva-Tiryagbhyām, s3); Challenger, squares ending in 5 (Ekādhikena Pūrveṇa, s1);
   Pro, multiplying near 100 (Nikhilaṃ Navataścaramaṃ Daśataḥ, s2).
   It teaches first (one card, every step at once), then asks three questions, then ends on a card with the next step.
   A lesson, not practice: right answers earn Sparks and count the day; no Rating, mastery, Keep going, Star or Belt
   changes. The data and the pure helpers have no DOM and are node-tested (test/try.test.mjs); runTry() draws it. */
import { TRICKS } from './vedic.js';
import { SUTRAS } from './sutras.js';
import { checkOne } from './check.js';
import { on, child } from './life.js';
import { tag as sutraTag, fillTags } from './sutra-tag-slot.js'; /* js/sutra-tag.js loads on demand (#126 review) */
import * as store from './store.js';
import * as fx from './fx.js';
import * as metrics from './metrics.js';

export const QUESTIONS = 3;
export const SPARKS = 10;

const H = (s, c = 'coral') => `<b class="hl hl-${c}">${s}</b>`;
/* The 11 sandwich as a picture: the two digits as bread, the middle as the filling (empty until known) */
const sandwich = (a, b, mid = '') => `<span class="try-sw" aria-hidden="true"><i>${a}</i><i class="try-sw-mid${mid === '' ? ' is-empty' : ''}">${mid === '' ? '?' : mid}</i><i>${b}</i></span>`;
const split = n => [Math.floor(n / 10), n % 10];

/* Explorer's steps, in Explorer words (short sentences): the crosswise step of Ūrdhva-Tiryagbhyām is the middle sum */
function sandwichSteps([n]) {
  const [a, b] = split(n);
  return [
    { say: `Split ${n} into ${a} and ${b}.`, show: sandwich(a, b) },
    { say: `Add them: ${a} + ${b} = ${a + b}.`, show: `${H(a)} + ${H(b, 'teal')} = ${H(a + b, 'sky')}` },
    { say: `Put ${a + b} in the middle. ${n} × 11 = ${n * 11}.`, show: sandwich(a, b, a + b) }
  ];
}

const trick = id => TRICKS.find(t => t.id === id);
/* The three Try a tricks. example: the worked example's numbers; questions: the three asked, never the example.
   steps(vals): the steps shown (the Trick's own, except Explorer's shorter ones); answer(vals): the answer typed or,
   for Explorer, the middle digit tapped (product(vals) is the whole answer). */
export const TRY = {
  explorer: {
    trick: 'by11', sutra: 's3', title: 'The 11 sandwich',
    lede: 'Times 11 in your head. Split the number, add, and fill the middle.',
    mean: 'Its name means straight down and across.',
    why: 'The middle is the across part. Add the two digits.',
    example: [23], questions: [[34], [26], [41]],
    q: ([n]) => `${n} × 11`, ask: 'What goes in the middle?', steps: sandwichSteps,
    answer: ([n]) => split(n)[0] + split(n)[1], product: ([n]) => n * 11,
    start: 'My turn', next: { href: '#/', label: 'Back home' }
  },
  challenger: {
    trick: 'sq5', sutra: 's1', title: 'Square numbers ending in 5',
    lede: 'Square 35 in your head, in one breath.',
    mean: 'By one more than the one before',
    why: 'The one before is the digit before the 5. Multiply it by one more than itself, then write 25.',
    example: [35], questions: [[25], [45], [65]],
    q: ([n]) => `${n}<sup>2</sup> = ?`, steps: v => trick('sq5').steps(v),
    answer: ([n]) => n * n, product: ([n]) => n * n,
    start: 'Your turn', next: { href: '#/star/sq5/1', label: 'Play Star 1' }
  },
  pro: {
    trick: 'near-base', sutra: 's2', title: 'Multiply numbers near 100',
    lede: 'Multiply 97 × 96 in one line, with no long multiplication.',
    mean: 'All from 9 and the last from 10',
    why: 'The sutra gives each distance from 100: for 97, 9 − 9 = 0 and 10 − 7 = 3, so 97 is 3 below. You multiply the small distances, not the big numbers. Above 100 the distances are added instead.',
    example: [97, 96], questions: [[98, 97], [94, 96], [103, 106]],
    q: ([a, b]) => `${a} × ${b} = ?`, steps: v => trick('near-base').steps(v),
    answer: ([a, b]) => a * b, product: ([a, b]) => a * b,
    start: 'Your turn', next: { href: '#/star/near-base/1', label: 'Play Star 1' }
  }
};
export const tryFor = mode => TRY[mode] || TRY.challenger;
export const sutraOf = mode => { const id = tryFor(mode).sutra, n = +id.slice(1); return { id, ...SUTRAS.find(s => s.n === n) }; };
/* Explorer's three big buttons: the sum and its two neighbours (never below 0), in an order that depends on rand */
export function choicesFor(sum, rand = Math.random) {
  const c = sum === 0 ? [0, 1, 2] : [sum - 1, sum, sum + 1];
  for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
  return c;
}
/* Has this Player finished their Mode's Try a trick on this device? (a seen mark in their progress, in the backup code) */
export const finished = mode => store.seen('try:' + mode);

/* ---------- The view ---------- */
const plain = h => String(h).replace(/<sup>2<\/sup>/g, ' squared').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

/* Draws the Try a trick of mode in root. signal: the view's (everything stops when it aborts). Returns nothing. */
export function runTry(root, { mode, signal }) {
  const T = tryFor(mode), S = sutraOf(mode), explorer = mode === 'explorer', round = child(signal), rs = round.signal;
  let phase = null, k = 0, right = 0, startNow = null;
  const newPhase = () => { if (phase) phase.abort(); phase = child(rs); startNow = null; return phase.signal; };
  root.innerHTML = `<div class="try try--${mode}"><span class="md-tag md-tag--coral">Try a trick</span>
    <h1 class="md-heading try-h" id="tyH">${T.title}</h1><div id="tyMain"></div></div>`;
  const main = root.querySelector('#tyMain'), $ = s => root.querySelector(s);
  const stepsHTML = vals => `<ol class="star-steps star-steps--still try-steps">${T.steps(vals).map(s => `<li class="star-step"><div class="anim-show">${s.show}</div><p>${s.say}</p></li>`).join('')}</ol>`;
  const nextBtn = (label, fn, ps) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'md-btn md-btn--primary'; b.id = 'tyNext'; b.textContent = label;
    $('.try-acts').append(b); on(b, 'click', fn, ps); b.focus({ preventScroll: true });
  };
  /* Escape starts on the card, as Enter or Space on its focused button do */
  on(document, 'keydown', e => { if (e.key === 'Escape' && startNow && !e.defaultPrevented) { e.preventDefault(); startNow(); } }, rs);

  function teach() {
    const ps = newPhase();
    /* The Sutra block is the Trick's Sutra tag (js/sutra-tag.js, openspec sutras-first): the kind word, the name as a
       link to the Deep dive, this card's own meaning line, Say it and the Respelling, then the why line */
    main.innerHTML = `<p class="md-lede try-lede">${T.lede}</p>
      ${sutraTag('trickTagHTML', T.trick, { mode, size: 'full', surface: 'try', mean: T.mean, cls: 'try-sutra', extra: `<p class="try-why">${T.why}</p>` })}
      <h2 class="try-k">Worked example: ${T.q(T.example).replace(/ = \?$/, '')}</h2>
      ${stepsHTML(T.example)}
      <p class="try-acts"><button type="button" class="md-btn md-btn--primary" id="tyStart" aria-describedby="tyH">${T.start}</button></p>
      <p class="mq-small try-src">Then ${QUESTIONS} questions like it. From Bharati Krishna Tirtha's 1965 book.</p>`;
    fillTags(main, ps);
    fx.announce(`Try a trick: ${T.title}. A worked example, then ${T.start}.`);
    const go = () => { if (ps.aborted) return; ask(); };
    startNow = go; on($('#tyStart'), 'click', go, ps);
    $('#tyStart').focus({ preventScroll: true });
  }

  function ask() {
    const ps = newPhase(), vals = T.questions[k], ans = T.answer(vals);
    let tries = 0, done = false;
    const tag = `<span class="star-tag">Question ${k + 1} of ${QUESTIONS}</span>`;
    const entry = explorer
      ? `${sandwich(...split(vals[0]))}<p class="try-ask">${T.ask}</p><div class="pr-choices try-choices" role="group" aria-label="Choices">${choicesFor(ans).map(c => `<button type="button" class="md-btn pr-choice" data-v="${c}">${c}</button>`).join('')}</div>`
      : `<form class="try-form" id="tyForm" novalidate><label class="md-sr-only" for="tyIn">Your answer</label><input class="ans-in" id="tyIn" inputmode="numeric" autocomplete="off" enterkeyhint="go" spellcheck="false"><button type="submit" class="md-btn md-btn--primary" id="tyCheck">Check</button></form>`;
    main.innerHTML = `<div class="try-q">${tag}<h2 class="try-qh" id="tyQ" tabindex="-1">${T.q(vals)}</h2>${entry}<p class="try-say" id="tySay"></p><div id="tyShow"></div><p class="try-acts"></p></div>`;
    const say = h => { $('#tySay').innerHTML = h; };
    const after = () => { if (ps.aborted) return; k++; if (k < QUESTIONS) ask(); else end(); };
    const nextLabel = () => (k + 1 < QUESTIONS ? 'Next question' : 'See how you did');
    function result(ok) {
      done = true; store.touchDay(); metrics.answered('try', ok);
      if (ok) { right++; store.addSparks(SPARKS, 'try'); }
      root.querySelectorAll('.pr-choice, #tyIn, #tyCheck').forEach(b => { b.disabled = true; });
    }
    if (explorer) {
      const [a, b] = split(vals[0]), whole = `${a} + ${b} = ${ans}. So ${vals[0]} × 11 = ${T.product(vals)}.`;
      root.querySelectorAll('.pr-choice').forEach(btn => on(btn, 'click', () => {
        if (done || btn.disabled) return;
        tries++; const ok = +btn.dataset.v === ans;
        if (ok) {
          result(true); btn.classList.add('ok'); $('.try-sw').outerHTML = sandwich(a, b, ans);
          say(`Yes! ${whole} <span class="fx-sparks">+${SPARKS} Sparks</span>`); fx.announce(`Yes! ${whole} ${SPARKS} Sparks.`);
          fx.sfx('ok'); fx.sparkle($('.try-sw'), { n: 8, signal: ps }); fx.speak('You got it!');
          nextBtn(nextLabel(), after, ps);
        } else if (tries === 1) {
          btn.disabled = true; say('Not quite. Try again!'); fx.announce('Not quite. Try again!'); fx.sfx('no'); fx.speak('Not quite. Try again!');
          const left = [...root.querySelectorAll('.pr-choice')].find(x => !x.disabled); if (left) left.focus({ preventScroll: true });
        } else {
          result(false); $('.try-sw').outerHTML = sandwich(a, b, ans);
          say(`It is ${ans}. ${whole}`); fx.announce(`It is ${ans}. ${whole}`); fx.sfx('no');
          nextBtn(nextLabel(), after, ps);
        }
      }, ps));
      $('#tyQ').focus({ preventScroll: true });
    } else {
      on($('#tyForm'), 'submit', e => {
        e.preventDefault(); if (done) return;
        const r = checkOne({ kind: 'num', answer: ans, plain: true }, $('#tyIn').value);
        if (r.empty) { say('Type an answer first.'); return; }
        if (r.notAnswer) { say('Type just the answer, like 56.'); return; }
        result(r.ok);
        if (r.ok) {
          say(`Right! ${plain(T.q(vals)).replace(/ = \?$/, '')} = ${ans}. <span class="fx-sparks">+${SPARKS} Sparks</span>`);
          fx.announce(`Right, ${ans}. ${SPARKS} Sparks.`); fx.sfx('ok'); fx.sparkle($('#tyIn'), { n: 8, signal: ps });
        } else {
          say(`Not quite. It is <b>${ans}</b>. Here is the trick on these numbers.`);
          fx.announce(`Not quite. It is ${ans}. Here is the trick on these numbers.`); fx.sfx('no');
          $('#tyShow').innerHTML = stepsHTML(vals);
        }
        nextBtn(nextLabel(), after, ps);
      }, ps);
      $('#tyIn').focus({ preventScroll: true });
    }
  }

  function end() {
    newPhase(); store.markSeen('try:' + mode);
    const head = explorer ? 'You did it!' : right >= 2 ? 'Trick learned!' : 'Good start!';
    const line = explorer ? `You made ${right} of ${QUESTIONS} sandwiches.` : `${right} of ${QUESTIONS} right.`;
    const more = explorer ? `The 11 sandwich comes from ${S.name}.` : `That is ${S.name} at work. Star 1 of this Trick has four more like it.`;
    main.innerHTML = `<div class="try-end"><h2 class="try-qh" id="tyQ" tabindex="-1">${head}</h2>
      <p class="try-end-n">${line}${right ? ` <span class="fx-sparks">+${right * SPARKS} Sparks</span>` : ''}</p><p>${more}</p>
      <p class="try-acts"><a class="md-btn md-btn--primary" href="${T.next.href}" id="tyGoOn">${T.next.label}</a>${explorer ? '<button type="button" class="md-btn" id="tyAgain">Do it again</button>' : '<a class="md-btn" href="#/" id="tyHome">Back home</a>'}</p>
      <p class="mq-small"><a href="#/sutras/${S.id}" id="tySutra">${explorer ? 'See the sutra card' : `Read about ${S.name}`}</a></p></div>`;
    fx.announce(`${head} ${line}`);
    const again = $('#tyAgain'); if (again) on(again, 'click', () => { k = 0; right = 0; teach(); }, rs);
    $('#tyQ').focus({ preventScroll: true });
  }

  teach();
}
