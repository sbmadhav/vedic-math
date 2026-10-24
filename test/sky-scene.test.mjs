/* The background sky's scene data (js/sky-scene.js): one featured story at a time, placement that keeps clear of the
   page, phone sizes that are never cropped, and captions taken from the history notes the app already had. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STORIES, NOTES, BG_NOTES, LEVELS, TIMING, DIGITS, FALCON_BRICKS, BRAHMI, storyAt, placeStory, storySizes, artSizes, glimpseBox, horizon, levelFor, powerNumber, superscript, meruRows } from '../js/sky-scene.js';

test('stories run one at a time, in order, with an empty sky between them', () => {
  const seen = [];
  let prev = null;
  for (let t = 0; t < 400; t += 0.25) {
    const at = storyAt(t);
    assert.ok(at.index >= -1 && at.index < STORIES.length);
    if (at.index >= 0 && at.phase !== 'gap' && (!prev || prev.n !== at.n)) seen.push(STORIES[at.index].id);
    if (prev && prev.index >= 0 && at.index >= 0 && prev.index !== at.index) assert.equal(prev.phase, 'gap', 'a story ends with a gap before the next');
    prev = at;
  }
  assert.deepEqual(seen.slice(0, STORIES.length), STORIES.map(s => s.id));
  assert.equal(storyAt(0).index, -1, 'nothing at first');
  assert.equal(storyAt(TIMING.first + 0.1).phase, 'in');
  assert.equal(storyAt(TIMING.first + STORIES[0].draw + 1).phase, 'hold');
});

test('quiet has no featured stories and no horizon; full has both', () => {
  assert.equal(LEVELS.quiet.stories, false); assert.equal(LEVELS.quiet.horizon, false);
  assert.equal(LEVELS.full.stories, true); assert.equal(LEVELS.full.horizon, true);
  assert.ok(LEVELS.quiet.constellations.drift < LEVELS.full.constellations.drift, 'quiet drifts slower');
  assert.ok(LEVELS.quiet.fps < LEVELS.full.fps);
});

test('the full scene is for the Mode picker and home, never the Star Quest Sky; other routes are quiet', () => {
  assert.equal(levelFor('#/'), 'full'); assert.equal(levelFor(''), 'full');
  assert.equal(levelFor('#/learn', { picker: true }), 'full');
  assert.equal(levelFor('#/', { sky: true }), 'quiet');
  for (const h of ['#/learn', '#/me', '#/arena', '#/game/balloons', '#/sutras']) assert.equal(levelFor(h), 'quiet', h);
});

test('a story is placed only where nothing on the page is', () => {
  const st = STORIES[0], capH = w => 120;
  const sizes = storySizes(st, 1280, capH);
  const obstacles = [[0, 0, 1280, 70], [80, 120, 820, 360], [80, 400, 1200, 660]];
  const spot = placeStory(1280, 800, obstacles, sizes);
  assert.ok(spot, 'room on the right');
  const box = [spot.x, spot.y, spot.x + spot.w, spot.y + spot.h];
  for (const o of obstacles) assert.ok(!(o[0] < box[2] && box[0] < o[2] && o[1] < box[3] && box[1] < o[3]), `clear of ${o}`);
  assert.ok(box[2] <= 1280 && box[3] <= 800 && box[0] >= 0 && box[1] >= 0);
  assert.equal(placeStory(375, 812, [[0, 0, 375, 812]], storySizes(st, 375, capH)), null, 'a full screen has no room');
});

test('on phones (320 to 430 px) every size a story may take fits the screen with its margins: nothing is cropped', () => {
  for (const w of [320, 360, 375, 390, 414, 430]) for (const st of STORIES) {
    const g = glimpseBox(st, w, 700), hz = horizon(w, 700);
    assert.ok(g.x >= 16 && g.x + g.w <= w - 16, `${st.id} at ${w}px: ${JSON.stringify(g)}`);
    assert.ok(g.y >= 0 && g.y + g.h <= hz.cy - hz.R + 1, `${st.id} sits above the horizon at ${w}px`);
    const compact = storySizes(st, w, (cw, c) => (c ? 64 : 140)).filter(s => s.compact);
    assert.ok(compact.length, 'phones get compact captions');
    assert.ok(compact.some(s => s.w <= w - 32), `${st.id}: a compact size fits ${w}px`);
    for (const s of artSizes(st, w, 700)) assert.ok(s.w <= w - 32, `${st.id}: drawing alone fits ${w}px`);
  }
  const st = STORIES.find(s => s.id === 'falcon'), spot = placeStory(375, 812, [[0, 0, 375, 300], [0, 560, 375, 812]], storySizes(st, 375, (cw, c) => (c ? 64 : 160)), { anchor: [0.5, 0.6] });
  assert.ok(spot && spot.size.compact, 'a 260 px gap on a phone takes a compact caption');
  assert.ok(spot.x >= 0 && spot.x + spot.w <= 375);
});

test('captions come from the history notes this app already had; no em dashes', () => {
  const ambient = readFileSync(new URL('../js/sky-scene.js', import.meta.url), 'utf8');
  assert.doesNotMatch(ambient, /—/);
  for (const s of STORIES) {
    assert.ok(s.title && s.line, s.id);
    assert.ok(s.line.length <= 110, `${s.id}: one short line`);
  }
  for (const [h, b] of BG_NOTES) assert.ok(h && b);
  assert.match(NOTES.brahmi[1], /stylized/);
  assert.match(STORIES.find(s => s.id === 'brahmi').line, /stylized/, 'the Brahmi story says its shapes are stylized');
});

test('drawing data stays in its boxes', () => {
  for (const [d, strokes] of Object.entries(DIGITS)) for (const s of strokes) for (const [x, y] of s) assert.ok(Math.abs(x) <= 0.6 && Math.abs(y) <= 1, d);
  for (const [x, y, w, h] of FALCON_BRICKS) assert.ok(x >= -1 && x + w <= 1 && y >= -1 && y + h <= 1);
  assert.equal(Object.keys(DIGITS).length, 10);
  assert.equal(BRAHMI.length, 9, 'Brahmi 1 to 9 (no zero)');
  assert.deepEqual(meruRows(5)[4], [1, 4, 6, 4, 1]);
  assert.equal(powerNumber(3), '1,000'); assert.equal(powerNumber(12), '1,000,000,000,000');
  assert.equal(superscript(12), '¹²');
});

test('the sky keeps out of a hero, draws the plaque without an edge, and never a compact caption (design audit)', async () => {
  const { KEEP_CLEAR } = await import('../js/sky-bg.js');
  const sels = KEEP_CLEAR.split(',').map(s => s.trim());
  for (const sel of ['[data-sky-clear]', '.lv-hero', '.mq-hero']) assert.ok(sels.includes(sel), `${sel} is kept clear`);
  const src = readFileSync(new URL('../js/sky-bg.js', import.meta.url), 'utf8');
  assert.match(src, /querySelectorAll\(KEEP_CLEAR\)/, 'measure() lists every match as an obstacle');
  const cap = src.slice(src.indexOf('function caption('), src.indexOf('function measure('));
  assert.match(cap, /roundRect\(0, 0, w, h, 12\)/, 'the plaque corner is radius-sm (12)');
  assert.doesNotMatch(cap, /strokeStyle|\.stroke\(/, 'no stroked edge: a stroked plaque read as a card');
  const place = src.slice(src.indexOf('function place('), src.indexOf('const overlaps'));
  assert.match(place, /\.filter\(s => !s\.compact\)/, 'a compact caption (the title without its line) is never placed; the drawing goes alone');
});

test('circling the square: Baudhayana\'s rule gives a circle of nearly the square\'s area, and the drawing fits its box', async () => {
  const { SULBA, sulbaRadius, FAMILY, CAMEO, PALETTE } = await import('../js/sky-scene.js');
  const a = SULBA.a, r = sulbaRadius(a);
  assert.ok(Math.abs(r - (a + (a * Math.SQRT2 - a) / 3)) < 1e-12);
  const ratio = (Math.PI * r * r) / ((2 * a) ** 2);
  assert.ok(ratio > 1 && ratio < 1.02, `circle over square area: ${ratio}`);
  assert.ok(a * Math.SQRT2 <= 0.95 && r <= 0.95, 'the rope and the circle stay in the box');
  const steps = Object.values(SULBA.steps);
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i][0] >= steps[i - 1][0] && steps[i][1] <= 1);
  assert.equal(STORIES[0].id, 'sulba', 'the rope-and-peg story comes first');
  for (const [, fill, stroke] of FAMILY) for (const k of [fill, stroke].filter(Boolean)) for (const s of ['dark', 'light']) assert.ok(PALETTE[s][k], `${k} is a token in ${s}`);
  assert.ok(CAMEO.at + CAMEO.for < TIMING.hold, 'the family has gone again before the story fades');
});
