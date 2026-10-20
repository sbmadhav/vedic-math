/* The explanation lines the studio voice records whole (js/explain-lines.js, openspec explanation-audio). The recording
   tool (tools/voice/lines.mjs) and the Listen buttons both read this list, so it must cover every explanation and
   every line must be something the provider accepts in one request. */
import test from './support/node-test.mjs';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { allExplanationLines, skillLines, trickLines, sutraDeepLines, guideCounts } from '../js/explain-lines.js';
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
  for (const k of ["'skill:' + s.id", "'sutra-card:' + c.id", '`sutra:${c.id}:plain`', '`sutra:${c.id}:why`', '`sutra:${c.id}:examples`', '`sutra:${c.id}:uses`', "'history'", "'guide:' + s.id", "'game:' + g.id"])
    assert.ok(app.includes(`listenBtn(${k}`), k);
  assert.match(src('tour.js'), /listenBtn\('tour'/);
});
