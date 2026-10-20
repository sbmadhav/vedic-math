/* Dot pictures (Which is more, Quick look): every dot sits inside the picture and the set is centred. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { dots } from '../js/viz.js';

const parse = s => {
  const [, w, h] = s.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
  const cs = [...s.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].map(m => m.slice(1).map(Number));
  return { w, h, cs };
};
const box = cs => ({
  x0: Math.min(...cs.map(([x, , r]) => x - r)), x1: Math.max(...cs.map(([x, , r]) => x + r)),
  y0: Math.min(...cs.map(([, y, r]) => y - r)), y1: Math.max(...cs.map(([, y, r]) => y + r))
});

test('dice dots: the right count, inside the frame, on a grid centred in it', () => {
  for (let n = 1; n <= 6; n++) {
    const { w, h, cs } = parse(dots(n, 'dice'));
    assert.equal(cs.length, n, `${n} dots`);
    const b = box(cs);
    assert.ok(b.x0 >= 6 && b.x1 <= w - 6 && b.y0 >= 6 && b.y1 <= h - 6, `${n}: dots stay inside the frame`);
    for (const [x, y] of cs) {
      assert.ok([20, 50, 80].includes(x) && [20, 50, 80].includes(y), `${n}: dot at ${x},${y} is on the centred 3 x 3 grid`);
    }
  }
  assert.deepEqual(parse(dots(1, 'dice')).cs.map(([x, y]) => [x, y]), [[50, 50]], 'one dot sits in the middle');
});

test('dots in groups of five: the right count, inside the picture and centred', () => {
  for (const n of [5, 7, 10, 13, 18, 20]) {
    const { w, h, cs } = parse(dots(n, 'line'));
    assert.equal(cs.length, n, `${n} dots`);
    const b = box(cs);
    assert.ok(b.x0 >= 0 && b.x1 <= w && b.y0 >= 0 && b.y1 <= h, `${n}: dots stay inside the picture`);
    assert.ok(Math.abs(b.x0 - (w - b.x1)) <= 1, `${n}: left and right margins match (${b.x0} vs ${w - b.x1})`);
  }
  const { h, cs } = parse(dots(5, 'line')), b = box(cs);
  assert.ok(Math.abs(b.y0 - (h - b.y1)) <= 1, 'a full group is centred top to bottom');
});
