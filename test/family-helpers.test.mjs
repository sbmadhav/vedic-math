/* The Nikhilam Family helpers' engine (openspec family-helpers): the help signals, escalation, the 3 minute rule,
   Not now, Only when I ask, the race hold, memory, placement and the worked example on other numbers. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCoach, planVisit, showMeTurn, placeVisit, exampleFor, skillInfo, bandFor, nickWords, memoryAfter, wasHard, familyOn, helpSetting, fill, FRIENDS, RULES, FAMILY_DEFAULT } from '../js/family-helpers.js';
import { helpersOn, talkEligible, talkOn } from '../js/family-hook.js';
import { friendSVG, FRIEND_IDS, FRIEND_POSES } from '../js/family.js';
import { byId } from '../js/skills/index.js';
import { TRICKS } from '../js/vedic.js';
import { answerText } from '../js/answers.js';

const clock = (t = 0) => { const c = () => t; c.add = ms => { t += ms; }; return c; };
const MIN3 = RULES.restMs;

test('three friends, each with a Chirp 3 HD voice distinct from Bolt (Aoede) and from each other', () => {
  assert.deepEqual(Object.keys(FRIENDS), ['shunya', 'nava', 'eka']);
  const voices = Object.values(FRIENDS).map(f => f.voice);
  assert.equal(new Set(voices).size, 3);
  for (const v of voices) { assert.match(v, /^en-US-Chirp3-HD-/); assert.doesNotMatch(v, /Aoede/); }
  assert.deepEqual(voices, ['en-US-Chirp3-HD-Puck', 'en-US-Chirp3-HD-Leda', 'en-US-Chirp3-HD-Charon']);
});

test('the switch is off by default; the hook and the engine read it the same way', () => {
  assert.equal(FAMILY_DEFAULT, false);
  const cases = [{}, { family: true }, { family: false }, { family: true, familyHelp: 'ask' }, { family: true, familyHelp: 'off' }, { family: 'yes' }, null];
  for (const p of cases) assert.equal(helpersOn(p), familyOn(p) && helpSetting(p) !== 'off', JSON.stringify(p));
  assert.equal(helpSetting({ familyHelp: 'nonsense' }), 'always');
});

/* Talking with the Family (step 3, design D15): 13 and over by the Age answer, or with none a Grade answer of 9 or above */
test('talking with the Family is offered to 13 and over only, off until turned on, and never under 13 whatever the Grade', () => {
  assert.equal(talkEligible(13, null), true);
  assert.equal(talkEligible(15, '3'), true);
  assert.equal(talkEligible('adult', null), true);
  assert.equal(talkEligible(12, '12'), false, 'an Age answer under 13 always rules it out');
  assert.equal(talkEligible(11, null), false);
  assert.equal(talkEligible(null, '9'), true);
  assert.equal(talkEligible(undefined, 12), true);
  assert.equal(talkEligible(null, '8'), false, 'grade 8 starts at 12 or 13');
  assert.equal(talkEligible(null, 'K'), false);
  assert.equal(talkEligible(null, 'V'), false);
  assert.equal(talkEligible(null, null), false);
  assert.equal(talkOn({ family: true, familyTalk: true, age: 15 }, null), true);
  assert.equal(talkOn({ family: true, age: 15 }, null), false, 'off until turned on');
  assert.equal(talkOn({ family: true, familyTalk: true, age: 11 }, '12'), false);
  assert.equal(talkOn({ familyTalk: true, age: 15 }, null), false, 'the helpers must be on');
  assert.equal(talkOn({ family: true, familyHelp: 'off', familyTalk: true, age: 15 }, null), false);
});

test('the band: a Grade answer when age-bands saves one, else the Mode', () => {
  assert.equal(bandFor({ mode: 'explorer' }), 'early');
  assert.equal(bandFor({ mode: 'challenger' }), 'growing');
  assert.equal(bandFor({ mode: 'pro' }), 'fluent');
  assert.equal(bandFor({ mode: null }), 'growing');
  assert.equal(bandFor({ mode: 'pro', reading: { grade: 'k' } }), 'early');
  assert.equal(bandFor({ mode: 'explorer', reading: { grade: '3' } }), 'growing');
  assert.equal(bandFor({ mode: 'explorer', reading: { grade: 'adult' } }), 'fluent');
  assert.equal(bandFor({ mode: 'pro', reading: { age: 6 } }), 'early');
  assert.equal(bandFor({ mode: 'pro', reading: { age: 9 } }), 'growing');
  assert.equal(bandFor({ mode: 'explorer', reading: { age: 'adult' } }), 'fluent');
});

test('the Nickname is greeted by its two words', () => {
  assert.equal(nickWords('Swift Tiger 42'), 'Swift Tiger');
  assert.equal(nickWords(''), '');
});

test('two misses in a row on one Skill start a level 1 Visit; a right answer in between resets it', () => {
  const c = createCoach({ now: clock() });
  assert.equal(c.note({ type: 'miss', skill: 'a' }), null);
  assert.equal(c.note({ type: 'right', skill: 'a', first: false }), null);
  assert.equal(c.note({ type: 'miss', skill: 'a' }), null);
  const v = c.note({ type: 'miss', skill: 'a' });
  assert.deepEqual([v.level, v.kind, v.reason], [1, 'help', 'row']);
});

test('misses on different Skills do not make a row, but three in a round start a level 2 Visit', () => {
  const c = createCoach({ now: clock() });
  assert.equal(c.note({ type: 'miss', skill: 'a' }), null);
  assert.equal(c.note({ type: 'miss', skill: 'b' }), null);
  const v = c.note({ type: 'miss', skill: 'c' });
  assert.deepEqual([v.level, v.reason], [2, 'round']);
});

test('Hint pressed twice on one question starts a Visit, once; idle starts one; a new question resets the hint count', () => {
  const t = clock(), c = createCoach({ now: t });
  c.note({ type: 'question', skill: 'a' });
  assert.equal(c.note({ type: 'hint', skill: 'a' }), null);
  c.note({ type: 'question', skill: 'a' });
  assert.equal(c.note({ type: 'hint', skill: 'a' }), null);
  assert.equal(c.note({ type: 'hint', skill: 'a' }).reason, 'hint');
  t.add(MIN3);
  assert.equal(c.note({ type: 'hint', skill: 'a' }), null, 'not twice on the same question');
  assert.equal(c.note({ type: 'idle', skill: 'a' }).reason, 'idle');
});

test('escalation: one, then two, then three friends on the same Skill, each after the 3 minute rest', () => {
  const t = clock(), c = createCoach({ now: t, rules: { ...RULES, inRound: 99 } }); /* rows only; misses in a round have their own test */
  const twice = s => { c.note({ type: 'miss', skill: s }); return c.note({ type: 'miss', skill: s }); };
  assert.equal(twice('a').level, 1);
  assert.equal(twice('a'), null, 'resting: under 3 minutes');
  t.add(MIN3 - 1); assert.equal(twice('a'), null);
  t.add(1); assert.equal(twice('a').level, 2);
  t.add(MIN3); assert.equal(twice('a').level, 3);
  t.add(MIN3); assert.equal(twice('a').level, 3, 'stays at three');
  t.add(MIN3); assert.equal(twice('b').level, 1, 'another Skill starts at one');
});

test('Ask a friend works any time: resting, muted, or with the setting at Only when I ask', () => {
  const t = clock(), c = createCoach({ now: t, setting: 'ask' });
  c.note({ type: 'miss', skill: 'a' });
  assert.equal(c.note({ type: 'miss', skill: 'a' }), null, 'Only when I ask: no automatic Visit');
  assert.equal(c.note({ type: 'idle', skill: 'a' }), null);
  const v = c.note({ type: 'ask', skill: 'a' });
  assert.deepEqual([v.level, v.asked], [1, true]);
  c.mute();
  assert.equal(c.note({ type: 'ask', skill: 'a' }).level, 2, 'asking again goes one further');
  c.setSetting('off');
  assert.equal(c.note({ type: 'ask', skill: 'a' }), null, 'Off: nothing');
});

test('Not now mutes automatic Visits for the session', () => {
  const t = clock(), c = createCoach({ now: t });
  c.mute(); t.add(10 * MIN3);
  c.note({ type: 'miss', skill: 'a' });
  assert.equal(c.note({ type: 'miss', skill: 'a' }), null);
  assert.equal(c.note({ type: 'idle', skill: 'a' }), null);
  assert.equal(createCoach({ now: t, muted: true }).note({ type: 'idle', skill: 'a' }), null);
});

test('a quiet note counts but starts nothing (a Visit is open)', () => {
  const c = createCoach({ now: clock() });
  c.note({ type: 'miss', skill: 'a' });
  assert.equal(c.note({ type: 'miss', skill: 'a' }, { quiet: true }), null);
  assert.equal(c.state().visits.a, undefined, 'not recorded as a Visit');
});

test('a breakthrough: right first try after a level 2 Visit cheers; it ends a used Visit at once, else waits for the rest', () => {
  const rules = { ...RULES, inRound: 99 }, t = clock(), c = createCoach({ now: t, rules });
  const twice = s => { c.note({ type: 'miss', skill: s }); return c.note({ type: 'miss', skill: s }); };
  twice('a'); t.add(MIN3); assert.equal(twice('a').level, 2);
  assert.equal(c.note({ type: 'right', skill: 'a', first: true }), null, 'unused Visit, under 3 minutes');
  const d = createCoach({ now: t, rules });
  const twiceD = s => { d.note({ type: 'miss', skill: s }); return d.note({ type: 'miss', skill: s }); };
  twiceD('a'); t.add(MIN3); twiceD('a'); d.used();
  assert.equal(d.note({ type: 'right', skill: 'a', first: false }), null, 'not on a second try');
  const v = d.note({ type: 'right', skill: 'a', first: true });
  assert.deepEqual([v.kind, v.level], ['cheer', 3]);
  assert.equal(d.note({ type: 'right', skill: 'a', first: true }), null, 'one cheer');
});

test('a timed race holds what is noticed until its end; a Star with two or more misses gets a Visit at the end', () => {
  const t = clock(), c = createCoach({ now: t });
  c.note({ type: 'raceStart' });
  c.note({ type: 'miss', skill: 'v-sq5' });
  assert.equal(c.note({ type: 'miss', skill: 'v-sq5' }), null, 'never mid-race');
  assert.equal(c.note({ type: 'idle', skill: 'v-sq5' }), null);
  const held = c.note({ type: 'roundEnd', skill: 'v-sq5', misses: 1 });
  assert.equal(held.level, 1, 'the held Visit comes at the end');
  const s = createCoach({ now: t });
  s.note({ type: 'raceStart' });
  assert.equal(s.note({ type: 'roundEnd', skill: 'v-sq5', misses: 2 }).level, 2);
  const s3 = createCoach({ now: t });
  assert.equal(s3.note({ type: 'roundEnd', skill: 'v-sq5', misses: 3 }).level, 3);
  assert.equal(createCoach({ now: t }).note({ type: 'roundEnd', skill: 'v-sq5', misses: 0 }), null);
  const lit = createCoach({ now: t }).note({ type: 'roundEnd', skill: 'v-sq5', misses: 0, lit: true, hard: true });
  assert.equal(lit.kind, 'cheer');
  /* a Star left before its end screen: nothing held carries into the next round */
  const left = createCoach({ now: t });
  left.note({ type: 'raceStart' }); left.note({ type: 'miss', skill: 'v-sq5' }); left.note({ type: 'miss', skill: 'v-sq5' });
  assert.equal(left.note({ type: 'raceEnd' }), null);
  assert.equal(left.note({ type: 'leave', skill: 'v-sq5' }), null, 'no goodbye for the race that was left');
  left.note({ type: 'miss', skill: 'a' });
  assert.equal(left.note({ type: 'miss', skill: 'a' }).level, 1, 'the next round is not held');
});

test('leaving a round after a miss with no right answer since starts a short leave Visit', () => {
  const t = clock(), c = createCoach({ now: t });
  assert.equal(c.note({ type: 'leave', skill: 'a' }), null);
  c.note({ type: 'miss', skill: 'a' }); c.note({ type: 'right', skill: 'a' });
  assert.equal(c.note({ type: 'leave', skill: 'a' }), null, 'a right answer since');
  c.note({ type: 'miss', skill: 'a' });
  const v = c.note({ type: 'leave', skill: 'a' });
  assert.deepEqual([v.kind, v.level], ['leave', 1]);
});

test('memory: the hard Sutra or Skill, bounded, and cleared as "last" by a breakthrough', () => {
  let m = memoryAfter(null, 'sutra:s1');
  m = memoryAfter(m, 'sutra:s1');
  assert.deepEqual(m, { hard: { 'sutra:s1': 2 }, last: 'sutra:s1' });
  assert.ok(wasHard(m, 'sutra:s1')); assert.ok(!wasHard(m, 'skill:x')); assert.ok(!wasHard(null, 'sutra:s1'));
  assert.equal(memoryAfter(m, 'sutra:s1', { solved: true }).last, null);
  for (let i = 0; i < 60; i++) m = memoryAfter(m, 'skill:' + i);
  assert.ok(Object.keys(m.hard).length <= 41);
  const info = skillInfo(byId['v-sq5'], TRICKS.find(x => x.id === 'sq5'));
  assert.equal(info.key, 'sutra:s1');
  assert.equal(info.sutra, 'Ekādhikena Pūrveṇa');
  assert.equal(skillInfo(byId['3-mult']).key, 'skill:3-mult');
});

test('the worked example is never the Player\'s question nor its answer, on many Skills and seeds', () => {
  const ids = ['3-mult', 'v-sq5', 'v-near-base', 'v-from9', '4-fracadd', 'K-count'].filter(id => byId[id]);
  assert.ok(ids.length >= 4);
  for (const id of ids) {
    const s = byId[id];
    for (let k = 0; k < 40; k++) {
      const p = s.gen(1), ex = exampleFor({ gen: () => s.gen(1), answerOf: e => answerText(e, s), q: p.q, answer: answerText(p, s) });
      if (!ex) continue;
      assert.notEqual(ex.q, p.q, id);
      assert.notEqual(ex.answer, answerText(p, s), id);
      assert.ok(ex.steps.length > 0);
    }
  }
  assert.equal(exampleFor({ gen: () => ({ q: 'same', steps: ['x'], answer: 1 }), answerOf: () => '1', q: 'same', answer: '2' }), null, 'gives up rather than repeat the question');
  assert.equal(exampleFor({ gen: () => ({ q: 'other', steps: ['x'] }), answerOf: () => '2', q: 'same', answer: '2' }), null, 'or the answer');
});

const rngOf = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };
const example = { q: '25 &times; 25 = ?', steps: ['Take 2.', 'Two times three is six.', 'Write 25 after it.'], answer: '625' };
const sq5 = skillInfo(byId['v-sq5'], TRICKS.find(x => x.id === 'sq5'));

test('a level 1 Visit is one friend; level 2 is Eka with the Sutra then an encourager; level 3 all three with the example', () => {
  const one = planVisit({ plan: { level: 1, kind: 'help' }, band: 'growing', info: sq5, rng: rngOf(0.1) });
  assert.equal(new Set(one.turns.map(t => t.friend)).size, 1);
  assert.deepEqual(one.buttons, ['show', 'hint', 'notnow']);
  const two = planVisit({ plan: { level: 2, kind: 'help' }, band: 'fluent', info: sq5, rng: rngOf(0.9) });
  assert.equal(two.turns[0].friend, 'eka');
  assert.match(two.turns[0].html, /<span lang="sa-Latn">Ekādhikena Pūrveṇa<\/span>/);
  assert.ok(['nava', 'shunya'].includes(two.turns[1].friend));
  const three = planVisit({ plan: { level: 3, kind: 'help' }, band: 'growing', info: sq5, example, rng: rngOf(0.9) });
  assert.deepEqual([...new Set(three.turns.map(t => t.friend))].sort(), ['eka', 'nava', 'shunya']);
  const steps = three.turns.find(t => t.steps);
  assert.equal(steps.friend, 'eka'); assert.deepEqual(steps.steps, example.steps);
  assert.deepEqual(three.buttons, ['hint', 'notnow']);
  assert.deepEqual(planVisit({ plan: { level: 1, kind: 'help' }, info: sq5, canHint: false }).buttons, ['show', 'notnow']);
});

test('peer mistakes: Shunya on the example, caught, only in Growing and Fluent, never in Early', () => {
  const mk = band => planVisit({ plan: { level: 3, kind: 'help' }, band, info: sq5, example, rng: () => 0.01 });
  for (const band of ['growing', 'fluent']) {
    const v = mk(band), i = v.turns.findIndex(t => t.example && !t.steps);
    assert.ok(i >= 0, band); assert.equal(v.turns[i].friend, 'shunya'); assert.match(v.turns[i].html, /626/);
    assert.ok(['nava', 'eka'].includes(v.turns[i + 1].friend));
  }
  assert.ok(!mk('early').turns.some(t => /626/.test(t.html)), 'never for Early readers');
  const rare = planVisit({ plan: { level: 3, kind: 'help' }, band: 'growing', info: sq5, example, rng: () => 0.5 });
  assert.ok(!rare.turns.some(t => /626/.test(t.html)), 'rarely: not at 0.5');
});

test('a first Visit greets by Nickname; memory adds a remember line; a cheer is all three with one button', () => {
  const v = planVisit({ plan: { level: 1, kind: 'help' }, band: 'early', info: sq5, nick: 'Swift Tiger', greet: true, rng: rngOf(0.1) });
  assert.match(v.turns[0].html, /<span class="fh-nick"><\/span>/);
  assert.doesNotMatch(JSON.stringify(v), /Swift|Tiger/, 'never in markup');
  const r = planVisit({ plan: { level: 2, kind: 'help' }, band: 'growing', info: sq5, remember: true, rng: rngOf(0.1) });
  assert.ok(r.turns.some(t => t.friend === 'eka' && /Square numbers ending in 5/.test(t.html)));
  const c = planVisit({ plan: { level: 3, kind: 'cheer' }, band: 'fluent', info: sq5 });
  assert.deepEqual(c.turns.map(t => t.friend), ['shunya', 'nava', 'eka']);
  assert.deepEqual(c.buttons, ['thanks']);
  const show = showMeTurn({ band: 'growing', info: sq5, example });
  assert.equal(show.friend, 'eka'); assert.deepEqual(show.steps, example.steps);
});

test('fill escapes data, marks the Sutra as Sanskrit and leaves the Nickname out of markup', () => {
  assert.equal(fill('Hi, {name}!', { name: '<b>x</b>' }), 'Hi, <span class="fh-nick"></span>!', 'the Nickname is filled in as text by the overlay');
  assert.equal(fill('{title}', { title: '<b>x</b>' }), '&lt;b&gt;x&lt;/b&gt;');
  assert.equal(fill('It is {sutra}.', { sutra: 'Ekādhikena' }), 'It is <span lang="sa-Latn">Ekādhikena</span>.');
  assert.equal(fill('{missing}', {}), '');
});

const R = (left, top, w, h) => ({ left, top, right: left + w, bottom: top + h, width: w, height: h });
const hits = (at, box, rs) => rs.some(r => !(at.x + box.w <= r.left || at.x >= r.right || at.y + box.h <= r.top || at.y >= r.bottom));

test('placeVisit never covers a protected rect: margins on a wide screen, below or docked on a phone', () => {
  const box = { w: 300, h: 180 };
  const wide = placeVisit({ w: 1280, h: 800, top: 60 }, [R(340, 120, 600, 80), R(340, 220, 600, 160)], box);
  assert.equal(wide.side, 'right'); assert.ok(!hits(wide, box, [R(340, 120, 600, 80), R(340, 220, 600, 160)]));
  const leftOnly = [R(700, 120, 560, 300)];
  assert.equal(placeVisit({ w: 1280, h: 800, top: 60 }, leftOnly, box).side, 'left');
  const phone = [R(16, 100, 288, 60), R(16, 170, 288, 150)];
  const below = placeVisit({ w: 320, h: 640, top: 56 }, phone, { w: 288, h: 200 });
  assert.equal(below.side, 'below'); assert.ok(!hits(below, { w: 288, h: 200 }, phone));
  const full = [R(16, 60, 288, 560)];
  assert.equal(placeVisit({ w: 320, h: 640, top: 56 }, full, { w: 288, h: 200 }).side, 'dock');
  const offscreen = placeVisit({ w: 320, h: 640 }, [R(0, -500, 300, 100)], { w: 200, h: 100 });
  assert.notEqual(offscreen.side, 'dock', 'rects off screen do not count');
});

test('the friends\' art: cut from the brand drawing, tokens only, hidden from assistive technology, with poses', () => {
  assert.deepEqual(FRIEND_IDS, ['shunya', 'nava', 'eka']);
  for (const f of FRIEND_IDS) {
    const svg = friendSVG(f);
    assert.match(svg, /aria-hidden="true"/); assert.match(svg, /focusable="false"/);
    assert.doesNotMatch(svg, /#[0-9a-f]{3,8}\b/i);
    assert.ok(svg.length > 300, f);
    for (const p of FRIEND_POSES) assert.match(friendSVG(f, p), new RegExp(`data-pose="${p}"`));
  }
  assert.throws(() => friendSVG('bolt'), RangeError);
  assert.throws(() => friendSVG('eka', 'dance'), RangeError);
  const css = readFileSync(new URL('../math.css', import.meta.url), 'utf8');
  const block = css.slice(css.indexOf('/* ---------- Family helpers'));
  assert.ok(block.length > 500);
  assert.doesNotMatch(block, /#[0-9a-f]{3,8}\b/i, 'tokens only');
  assert.match(css, /--vm-z-family: 125/); assert.match(css, /\.fh-layer \{[^}]*z-index: var\(--vm-z-family\)/);
  assert.match(css, /\.fx-toasts \{[^}]*z-index: var\(--vm-z-toasts\)/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.fh-visit/);
});

test('text only until the recording lands: no Family module speaks or loads a voice (design D13)', () => {
  for (const f of ['family-view.js', 'family-hook.js', 'family-helpers.js', 'family-lines.js']) {
    const src = readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /\bspeak\w*\(|voice\.js|speechSynthesis|new Audio|\.play\(/, f);
  }
});
