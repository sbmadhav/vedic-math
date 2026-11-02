/* The conversation's shared rules (family-talk.ts; openspec family-helpers helper-conversation spec, design D18): the
   Skill table, the strip, the four actions checked, never the answer, the clue count and the scripted lines. */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  TALK_SKILLS, TALK_LINES, SPEAKERS, MOODS, CLUES, PART_LABELS, plainText, talkSkill, skillFacts, questionNumbers, leaksAnswer, exampleClashes, freshExample,
  stripPersonal, checkActions, wordsOk, cluesUsed, cluesLeft, scriptedLine, scriptedReply, fillPlain, type Turn,
} from './family-talk.ts';
import { TRICKS, TRICK_SKILLS } from './vedic.ts';
import { byId } from './skills/index.ts';

const near = TALK_SKILLS['v-near-base']!, sq5 = TALK_SKILLS['v-sq5']!, mult = TALK_SKILLS['3-mult']!;

test('the table holds every Trick whose answer is one number, and the plain a op b school Skills', () => {
  const tricks = TRICKS.filter(t => !t.fields && !t.choice && t.id !== 'div9' && t.id !== 'recip');
  for (const t of tricks) assert.ok(talkSkill(`v-${t.id}`), t.id);
  for (const id of ['v-osculator', 'v-add-sub', 'v-ratio-zero', 'v-div9', 'v-recip', '7-prob', 'nope']) assert.equal(talkSkill(id), null, id);
  for (const id of ['3-mult', '2-add100', 'k-sub10']) assert.ok(talkSkill(id), id);
  assert.equal(talkSkill(undefined), null);
  assert.equal(talkSkill('constructor'), null);
  for (const row of Object.values(TALK_SKILLS)) { for (const p of row.parts) assert.ok(PART_LABELS[p], `${row.id}: a label for ${p}`); assert.ok(row.arity >= 1 && row.arity <= 4); }
});

test('every row agrees with the game: a generated question\'s numbers fit, and the answer is the question\'s', () => {
  for (const s of TRICK_SKILLS) {
    const row = talkSkill(s.id); if (!row) continue;
    for (let i = 0; i < 20; i++) {
      const p = s.gen(1), nums = questionNumbers(s.id, p);
      assert.ok(nums, `${s.id}: ${p.q}`);
      assert.equal(row.answer(nums), p.answer, `${s.id}: ${p.q}`);
      assert.equal(row.question(nums), plainText(p.q));
    }
  }
  for (const id of ['3-mult', '2-add100', '2-sub100', 'k-sub10', '1-doubles', '4-mult2']) {
    const s = byId[id]!, row = talkSkill(id)!;
    for (let i = 0; i < 20; i++) { const p = s.gen(1 + (i % 3)), nums = questionNumbers(id, p); assert.ok(nums, `${id}: ${p.q}`); assert.equal(row.answer(nums), p.answer, `${id}: ${p.q}`); }
  }
});

test('questionNumbers: a Trick\'s own values, else the digits of the question; null when they do not fit', () => {
  assert.deepEqual(questionNumbers('v-near-base', { q: '98 &times; 97 = ?', vals: [98, 97] }), [98, 97]);
  assert.deepEqual(questionNumbers('3-mult', { q: '7 &times; 8 = ?' }), [7, 8]);
  assert.equal(questionNumbers('v-near-base', { q: 'x', vals: [98, 2] }), null);
  assert.equal(questionNumbers('v-near-base', null), null);
  assert.equal(questionNumbers('7-prob', { q: '1 + 2 = ?' }), null);
});

test('never the answer: the whole answer, with separators, or both its parts at once', () => {
  assert.equal(leaksAnswer(near, [98, 97], 'It is 9506.'), true);
  assert.equal(leaksAnswer(near, [98, 97], 'It is 9,506 exactly'), true);
  assert.equal(leaksAnswer(near, [98, 97], 'Left part 95 and right part 06'), true);
  assert.equal(leaksAnswer(near, [98, 97], 'The left part is 95.'), false);
  assert.equal(leaksAnswer(near, [98, 97], 'Look at 98 and 97 and the base 100.'), false);
  assert.equal(leaksAnswer(sq5, [65], '4225 is yours'), true);
  assert.equal(leaksAnswer(sq5, [65], 'The part before the five is 6, so six times seven.'), false);
  assert.equal(leaksAnswer(mult, [7, 8], '7 times 8 is 56'), true);
});

test('showExample: never the question\'s numbers in either order, never its answer, never numbers outside the Skill', () => {
  assert.equal(exampleClashes(near, [98, 97], [97, 98]), true);
  assert.equal(exampleClashes(near, [98, 97], [94, 96]), false);
  assert.equal(exampleClashes(near, [97, 96], [96, 97]), true);
  assert.equal(exampleClashes(mult, [6, 8], [8, 6]), true);
  assert.equal(exampleClashes(mult, [6, 8], [4, 12]), true, 'the same result, 48');
  assert.equal(exampleClashes(mult, [6, 8], [7, 8]), false);
  assert.equal(exampleClashes(near, [98, 97], [50, 60]), true, 'not near a base');
  for (let i = 0; i < 20; i++) { const ex = freshExample(near, [98, 97]); assert.ok(ex); assert.equal(exampleClashes(near, [98, 97], ex), false); }
});

test('checkActions: the four actions pass only when they fit, one of each, anything else dropped', () => {
  const nums = [98, 97];
  assert.deepEqual(checkActions([{ type: 'showExample', a: 97, b: 98 }], near, nums), []);
  assert.deepEqual(checkActions([{ type: 'showExample', a: 94, b: 96 }], near, nums), [{ type: 'showExample', numbers: [94, 96] }]);
  assert.deepEqual(checkActions([{ type: 'showExample', a: 65 }], sq5, [65]), []);
  assert.deepEqual(checkActions([{ type: 'showExample', a: 85 }], sq5, [65]), [{ type: 'showExample', numbers: [85] }]);
  assert.deepEqual(checkActions([{ type: 'pointAt', part: 'distances' }, { type: 'pointAt', part: 'base' }], near, nums), [{ type: 'pointAt', part: 'distances' }]);
  assert.deepEqual(checkActions([{ type: 'pointAt', part: 'kitchen' }], near, nums), []);
  assert.deepEqual(checkActions([{ type: 'showSutra' }], near, nums), [{ type: 'showSutra' }]);
  assert.deepEqual(checkActions([{ type: 'showSutra' }], mult, [7, 8]), [], 'a Skill with no Sutra');
  assert.deepEqual(checkActions([{ type: 'react', mood: 'think' }, { type: 'react', mood: 'furious' }], near, nums), [{ type: 'react', mood: 'think' }]);
  assert.deepEqual(checkActions([{ type: 'nextQuestion' }, { type: 'setMode', mode: 'pro' }, null, 'react', { type: 'react' }], near, nums), []);
  assert.deepEqual(checkActions('nope', near, nums), []);
});

test('stripPersonal: email addresses, phone numbers and long numbers not in the question become blanks', () => {
  assert.deepEqual(stripPersonal('call me on 555 123 4567, how does this work?', [98, 97]), { text: 'call me on , how does this work?', removed: true });
  assert.deepEqual(stripPersonal('mail sam@example.com please', [98, 97]), { text: 'mail please', removed: true });
  assert.deepEqual(stripPersonal('is it 9506?', [98, 97]), { text: 'is it ?', removed: true });
  assert.deepEqual(stripPersonal('why does 98 times 97 work?', [98, 97]), { text: 'why does 98 times 97 work?', removed: false });
  assert.deepEqual(stripPersonal('what about 4134?', [4134]), { text: 'what about 4134?', removed: false });
  assert.deepEqual(stripPersonal('my pin is 1234 and 999 is fine', []), { text: 'my pin is and 999 is fine', removed: true });
  assert.equal(stripPersonal('x'.repeat(400), []).text.length, 300);
  assert.deepEqual(stripPersonal(null, []), { text: '', removed: false });
});

test('words and clues: the shape of a Visit\'s words, and the count of clues given', () => {
  const words: Turn[] = [{ who: 'player', line: 'help' }, { who: 'nava', line: 'Look at the distances.', clue: true }, { who: 'player', line: 'more?' }, { who: 'eka', line: 'In general the base matters.' }, { who: 'player', line: 'ok' }];
  assert.equal(wordsOk(words), null);
  assert.equal(cluesUsed(words), 1);
  assert.equal(cluesLeft(words), CLUES - 1);
  assert.equal(cluesLeft([...words, { who: 'bolt', line: 'a', clue: true }, { who: 'bolt', line: 'b', clue: true }, { who: 'bolt', line: 'c', clue: true }, { who: 'player', line: 'x' }]), 0);
  assert.match(wordsOk([]) ?? '', /list/);
  assert.match(wordsOk([{ who: 'player', line: '' }]) ?? '', /line/);
  assert.match(wordsOk([{ who: 'teacher', line: 'hi' }]) ?? '', /speaker/);
  assert.match(wordsOk([{ who: 'player', line: 'hi' }, { who: 'bolt', line: 'hi' }]) ?? '', /last/);
  assert.match(wordsOk(Array.from({ length: 41 }, () => ({ who: 'player', line: 'hi' }))) ?? '', /40/);
  assert.match(wordsOk([{ who: 'player', line: 'hi', clue: 'yes' }]) ?? '', /clue/);
});

test('the scripted lines: no em dashes, no digits, known placeholders, honest framing, never the answer, a line for every speaker and kind', () => {
  for (const [kind, bySpeaker] of Object.entries(TALK_LINES)) {
    for (const s of SPEAKERS) {
      assert.ok(bySpeaker[s] && bySpeaker[s].length, `${kind}.${s}`);
      for (const line of bySpeaker[s]) {
        const at = `${kind}.${s}: ${line}`;
        assert.doesNotMatch(line, /—/, at);
        assert.doesNotMatch(line, /\d/, at);
        for (const [, p] of line.matchAll(/\{(\w+)\}/g)) assert.ok(['idea', 'title', 'sutra', 'meaning'].includes(p as string), at);
        assert.doesNotMatch(line, /\bVedas?\b|ancient/i, at);
        assert.doesNotMatch(line, /answer is|the answer to/i, at);
        assert.doesNotMatch(line, /\bI am (your|the) teacher/i, at);
        assert.ok(line.split(/\s+/).length <= 32, `${at}: about 30 words`);
      }
    }
  }
  assert.deepEqual(MOODS, ['talk', 'wave', 'cheer', 'think']);
});

test('scriptedLine fills the Skill\'s facts; a Skill with no idea gets a fixed line; scriptedReply gives Bolt a why', () => {
  const facts = skillFacts(near);
  assert.equal(facts.sutra, 'Nikhilaṃ Navataścaramaṃ Daśataḥ');
  const l = scriptedLine('eka', 'sutra', facts, () => 0);
  assert.ok(l.includes('Nikhilaṃ') && l.includes('All from 9'), l);
  assert.equal(fillPlain('Bolt calls it {sutra}: {meaning}.', facts), `Bolt calls it ${facts.sutra}: ${facts.meaning}.`);
  const bare = scriptedLine('bolt', 'method', { title: 'x', idea: '', sutra: '', meaning: '' }, () => 0);
  assert.equal(bare, 'Let us look at the method together, one step at a time.');
  const why = scriptedReply(facts, 'why do we add 1?', { rng: () => 0 });
  assert.equal(why.lines[0]!.speaker, 'bolt');
  assert.equal(why.lines[1]!.speaker, 'eka');
  assert.deepEqual(why.actions, [{ type: 'showSutra' }]);
  assert.equal(why.source, 'scripted');
  assert.ok(why.lines.every(x => x.clue === false && !x.line.includes('9506')), 'never a clue, never the answer (the Sutra\'s meaning may hold a digit)');
  const other = scriptedReply(skillFacts(mult, { title: 'Times tables', idea: 'Build it from doubles.' }), 'just tell me', { rng: () => 0.9 });
  assert.equal(other.lines.length, 1);
  assert.ok(['shunya', 'nava'].includes(other.lines[0]!.speaker));
  assert.deepEqual(other.actions, [], 'no Sutra on a school Skill');
  assert.ok(other.lines[0]!.line.includes('Build it from doubles.'));
});
