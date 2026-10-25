/* The explanation lines the studio voice records whole (js/explain-lines.js, openspec explanation-audio). The recording
   tool (tools/voice/lines.mjs) and the Listen buttons both read this list, so it must cover every explanation and
   every line must be something the provider accepts in one request. */
import test from './support/node-test.mjs';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { allExplanationLines, skillLines, skillPageLines, trickLines, sutraDeepLines, guideCounts } from '../js/explain-lines.js';
import { normalize } from '../js/voice.js';
import { SKILLS } from '../js/skills/index.js';
import { TRICKS } from '../js/vedic.js';
import { SUTRAS, SUBSUTRAS } from '../js/sutras.js';
import { GAMES } from '../js/games.js';
import { VIDEOS, LINKS } from '../js/videos.js';

const lines = allExplanationLines({ videos: VIDEOS, links: LINKS });

test('every Skill, Trick, Sutra deep dive and game has its explanation listed', () => {
  const has = new Set(lines.map(l => l.text));
  for (const s of SKILLS) for (const t of skillLines(s)) assert.ok(has.has(t), s.id);
  for (const t of TRICKS) for (const x of trickLines(t)) assert.ok(has.has(x), t.id);
  for (const c of [...SUTRAS, ...SUBSUTRAS]) assert.ok(sutraDeepLines(c.name).length > 0, c.name);
  for (const g of GAMES) assert.ok(has.has(g.desc), g.id);
  assert.ok(lines.some(l => l.src.startsWith('guide:explorer')) && lines.some(l => l.src.startsWith('tour:pro')));
});

/* A recording can only match a list that never changes: two loads with different random draws list the same lines */
test('the explanation lines are the same on every load (explanation-audio 4.6)', () => {
  const load = seed => execFileSync(process.execPath, ['--input-type=module', '-e', `
    let x = ${seed}; Math.random = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
    const { allExplanationLines } = await import(${JSON.stringify(new URL('../js/explain-lines.js', import.meta.url).href)});
    process.stdout.write(JSON.stringify(allExplanationLines()));`], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const a = JSON.parse(load(7)), b = JSON.parse(load(424242));
  assert.deepEqual(b.filter((l, i) => l.text !== a[i]?.text).slice(0, 5), [], 'lines drawn at random cannot be recorded whole');
  assert.equal(a.length, b.length);
});

test('a Skill page reads the lines its Skill records, and a Trick Skill reads when to use the Trick', () => {
  const count = SKILLS.find(s => s.id === 'k-count');
  assert.deepEqual(skillLines(count), [
    'Counting means saying one number for each thing, and the last number you say tells how many.',
    'Touch each dot once as you say a number.',
    'Use the ten frame: a full frame is 10, so start at 10 and count on.',
  ], count.id);
  for (const s of SKILLS) assert.deepEqual(skillPageLines(s), skillLines(s), s.id);
  for (const t of TRICKS) assert.deepEqual(skillLines(SKILLS.find(s => s.trick === t.id)), [t.idea, t.when].filter(Boolean), t.id);
});

test('every line says something and fits one provider request (5,000 bytes)', () => {
  for (const { text, src } of lines) {
    const w = normalize(text);
    assert.ok(w, `${src}: "${text}" says nothing`);
    assert.ok(Buffer.byteLength(w) < 4500, `${src}: ${Buffer.byteLength(w)} bytes`);
  }
});

test('guide counts come from the catalogs', () => {
  const n = guideCounts();
  assert.equal(n.tricks, TRICKS.length);
  assert.equal(n.sutras, SUTRAS.length);
  assert.equal(n.games, GAMES.length);
  for (const v of Object.values(n)) assert.ok(Number.isFinite(v) && v > 0);
});

/* Listen buttons (openspec explanation-audio): every key a page can ask for, in every Mode, reads lines that the
   recording list holds, so each one has a whole studio recording after a re-record */
import { listenKeys, linesForKey, tourLines } from '../js/explain-lines.js';
import { MODES } from '../js/guide.js';

test('every Listen key resolves to recorded lines in every Mode', () => {
  const all = new Set(lines.map(l => normalize(l.text))), miss = [];
  for (const m of MODES) {
    for (const k of listenKeys(m)) {
      const ls = linesForKey(k, m);
      if (!ls.length) miss.push(`${m} ${k}: no lines`);
      for (const t of ls) if (!all.has(normalize(t))) miss.push(`${m} ${k}: ${t.slice(0, 60)}`);
    }
    for (const t of tourLines(m)) if (!all.has(normalize(t))) miss.push(`${m} tour: ${t.slice(0, 60)}`);
  }
  assert.deepEqual(miss, []);
});

test('the keys the app draws exist', () => {
  const src = (f) => readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
  const app = src('app.js');
  for (const k of ["'skill:' + s.id", "'sutra-card:' + c.id", '`sutra:${c.id}:plain`', '`sutra:${c.id}:why`', '`sutra:${c.id}:examples`', '`sutra:${c.id}:uses`', "'history'", "'guide:' + s.id", "'game:' + g.id", "'formats'"])
    assert.ok(app.includes(`listenBtn(${k}`), k);
  assert.match(src('tour.js'), /listenBtn\('tour'/);
  assert.match(src('star.js'), /listenBtn\('from:\.star-step > p'/); // the Star replay's steps (worked steps: clips)
  assert.match(app, /listenBtn\('from:\.q-l'/); // today's quests, each a recorded label
});

/* explanation-audio 4.4 and 4.5: quest labels, format rules and the "Older roots" notes are in the recording list, in
   the words the page shows */
import { rootsLines, formatLines } from '../js/explain-lines.js';
import { BG_NOTES, ROOTS_INTRO } from '../js/sky-scene.js';
import { QUEST_POOL } from '../js/gamify.js';
import { FORMATS } from '../js/levels.js';

test('quest labels, format rules and the Older roots notes are listed for the studio voice', () => {
  const by = src => new Set(lines.filter(l => l.src === src).map(l => l.text));
  for (const q of Object.values(QUEST_POOL).flat()) assert.ok(by('quests').has(q.label), q.label);
  assert.deepEqual(formatLines(), Object.values(FORMATS).map(f => f.how));
  for (const t of formatLines()) assert.ok(by('formats').has(t), t);
  assert.equal(rootsLines()[0], ROOTS_INTRO);
  assert.equal(rootsLines().length, BG_NOTES.length + 1);
  for (const t of rootsLines()) assert.ok(by('roots').has(t), t);
});
