/* The Sky's data and rules (js/sky.js, openspec sky-home): Constellations, the path in Belt order, Bolt's suggestion,
   the opt-in switch, the layout, and the one-time migration of Kata progress to lit Stars. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';

const mem = { 'vm.sound': '0' };
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const sent = [];
globalThis.window = globalThis;
globalThis.siteTrack = (path, title) => sent.push(path);
const node = () => ({ classList: { add() {}, toggle() {}, remove() {} }, setAttribute() {}, append() {}, remove() {}, getContext: () => null, set innerHTML(v) {}, get innerHTML() { return ''; } });
globalThis.document = { querySelector: () => node(), createElement: node, body: node(), hidden: true, getElementById: () => null };
globalThis.matchMedia = () => ({ matches: true });

const SKY = await import('../js/sky.js');
const { TRICKS, BELTS } = await import('../js/vedic.js');
const { kataKey } = await import('../js/levels.js');
const { CONSTELLATIONS, SKY_LAYOUT, PATH, suggested, upcoming, skyOn, SKY_DEFAULT, migrateSky, LANDMARKS, TOWER_SLOT, labelLines, SKY_SIZE } = SKY;

/* ---------- 1.1 Constellations, path, suggestion, switch, layout ---------- */
test('17 Constellations hold all 63 Stars, one per Sutra name the Tricks use', () => {
  assert.equal(CONSTELLATIONS.length, 17);
  assert.equal(new Set(CONSTELLATIONS.map(c => c.sutra)).size, 17);
  assert.equal(new Set(CONSTELLATIONS.map(c => c.id)).size, 17);
  const tricks = CONSTELLATIONS.flatMap(c => c.tricks);
  assert.deepEqual([...tricks].sort(), TRICKS.map(t => t.id).sort());
  assert.equal(Object.values(SKY_LAYOUT).reduce((n, l) => n + Object.keys(l.stars).length, 0), 63);
  for (const c of CONSTELLATIONS) for (const t of c.tricks) assert.equal(TRICKS.find(x => x.id === t).sutra, c.sutra);
});

test('Ekādhikena Pūrveṇa holds sq5 and recip; the three Ūrdhva Tiryagbhyām variants are apart', () => {
  const e = CONSTELLATIONS.find(c => c.sutra === 'Ekādhikena Pūrveṇa');
  assert.deepEqual(e.tricks, ['sq5', 'recip']);
  assert.equal(e.id, 'ekadhikena-purvena', 'the spelling fix (ṇ) keeps the Constellation id');
  assert.deepEqual(CONSTELLATIONS.map(c => c.id).filter(id => /^(nikhila|sunyam)/.test(id)).sort(), ['nikhilam-division-by-9', 'nikhilam-navatascaramam-dasatah', 'sunyam-samyasamuccaye']);
  assert.equal(Object.keys(SKY_LAYOUT[e.id].stars).length, 6);
  assert.equal(CONSTELLATIONS.filter(c => c.sutra.startsWith('Ūrdhva Tiryagbhyām')).length, 3);
  assert.equal(CONSTELLATIONS[0].tricks[0], 'from9', 'white belt Sutras come first');
});

test('PATH is the 63 Stars in Belt order', () => {
  assert.equal(PATH.length, 63);
  assert.equal(new Set(PATH).size, 63);
  assert.deepEqual(PATH.slice(0, 4), ['from9:1', 'from9:2', 'from9:3', 'by11:1']);
  assert.equal(PATH.at(-1), 'zero-sum:3');
  assert.deepEqual(PATH.slice(9, 12), ['sq5:1', 'sq5:2', 'sq5:3'], 'yellow belt after white');
});

const lit = keys => Object.fromEntries(keys.map(k => [k, 1]));
test('suggested(): the first Star neither lit nor skipped, in Belt order', () => {
  assert.equal(suggested({}), 'from9:1');
  assert.equal(suggested({ lit: lit(['from9:1']), skipped: lit(['from9:2']) }), 'from9:3');
  assert.equal(suggested({ lit: lit(['from9:1', 'from9:2', 'from9:3']) }), 'by11:1');
  assert.deepEqual(upcoming({ lit: lit(['from9:1']), skipped: lit(['from9:2']) }), ['from9:3', 'by11:1', 'by11:2']);
});

test('suggested(): a Placement Belt starts the path there, and wraps round to white when nothing is open after it', () => {
  assert.equal(suggested({}, 'orange'), 'near-base:1');
  const after = PATH.slice(PATH.indexOf('near-base:1'));
  assert.equal(suggested({ lit: lit(after) }, 'orange'), 'from9:1');
  assert.equal(suggested({}, 'not-a-belt'), 'from9:1');
});

test('suggested(): the first skipped Star when nothing is open, and null when every Star is lit', () => {
  const skipped = ['sq5:2', 'div9:1'];
  const st = { lit: lit(PATH.filter(k => !skipped.includes(k))), skipped: lit(skipped) };
  assert.equal(suggested(st), 'sq5:2');
  assert.equal(suggested({ lit: lit(PATH) }), null);
  assert.deepEqual(upcoming({ lit: lit(PATH) }), []);
});

test('skyOn(): never for Explorer; for Challenger and Pro it follows sky ?? SKY_DEFAULT', () => {
  assert.equal(SKY_DEFAULT, false);
  for (const sky of [true, false, undefined]) assert.equal(skyOn({ mode: 'explorer', sky }), false);
  for (const mode of ['challenger', 'pro']) {
    assert.equal(skyOn({ mode, sky: true }), true);
    assert.equal(skyOn({ mode, sky: false }), false);
    assert.equal(skyOn({ mode }), SKY_DEFAULT);
  }
  assert.equal(skyOn({ mode: null, sky: true }), false);
  assert.equal(skyOn(null), false);
});

test('layout: every Star sits inside the viewBox and no two Stars are closer than 28 units', () => {
  const pts = Object.values(SKY_LAYOUT).flatMap(l => Object.entries(l.stars));
  for (const [k, [x, y]] of pts) assert.ok(x >= 24 && x <= SKY_SIZE - 24 && y >= 24 && y <= SKY_SIZE - 24, `${k} at ${x},${y}`);
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const d = Math.hypot(pts[i][1][0] - pts[j][1][0], pts[i][1][1] - pts[j][1][1]);
    assert.ok(d >= 28, `${pts[i][0]} and ${pts[j][0]} are ${d.toFixed(1)} apart`);
  }
  for (const l of Object.values(SKY_LAYOUT)) assert.ok(Number.isInteger(l.sector) && l.sector >= 0 && l.sector < 27);
  assert.equal(new Set(Object.values(SKY_LAYOUT).map(l => `${l.sector}:${l.r}`)).size, 17, 'one anchor each');
});

test('layout: no Sutra name meets a Star, another name or a Landmark slot', () => {
  const box = (x, y, w, h) => ({ x0: x - w / 2, x1: x + w / 2, y0: y, y1: y + h });
  const names = CONSTELLATIONS.map(c => ({ c, ...SKY.labelBox(c) }));
  assert.ok(names.every((n, i) => labelLines(CONSTELLATIONS[i].sutra).every(l => l.length <= 22)), "names fit in two short lines");
  const marks = [...LANDMARKS.map(m => m.at), TOWER_SLOT].map(([x, y]) => ({ c: { id: 'landmark' }, ...box(x, y - 45, 140, 90) }));
  const meet = (p, q) => p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 && q.y0 < p.y1;
  const all = [...names, ...marks];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) assert.ok(!meet(all[i], all[j]), `${all[i].c.id} meets ${all[j].c.id}`);
  for (const b of all) for (const c of CONSTELLATIONS) for (const [k, [x, y]] of Object.entries(SKY_LAYOUT[c.id].stars)) {
    if (b.c === c) continue;
    assert.ok(!meet(b, box(x, y - 16, 32, 32)), `${k} under ${b.c.id}`);
  }
  for (const n of names) assert.ok(n.x0 >= 0 && n.x1 <= SKY_SIZE && n.y1 <= SKY_SIZE, n.c.id);
});

test('Bolt has a spot beside every Star that covers no Star and no name', () => {
  const [w, h] = SKY.BOLT_BOX, names = CONSTELLATIONS.map(SKY.labelBox);
  const meet = (p, q) => p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 && q.y0 < p.y1;
  const stars = Object.values(SKY_LAYOUT).flatMap(l => Object.values(l.stars));
  for (const k of PATH) {
    const [cx, cy] = SKY.boltSpot(k), b = { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 }, [sx, sy] = SKY.starAt(k);
    assert.ok(b.x0 >= 0 && b.y0 >= 0 && b.x1 <= SKY_SIZE && b.y1 <= SKY_SIZE, k);
    assert.ok(Math.hypot(cx - sx, cy - sy) <= 110, `${k}: Bolt stays beside its Star`);
    for (const [x, y] of stars) assert.ok(!meet(b, { x0: x - 15, x1: x + 15, y0: y - 15, y1: y + 15 }), `${k}: Bolt covers the Star at ${x},${y}`);
    for (const n of names) assert.ok(!meet(b, n), `${k}: Bolt covers a name`);
  }
});

test('Landmarks: Arena, Duel, Games, Watch and the Skill map, with the tower slot left free', () => {
  assert.deepEqual(LANDMARKS.map(m => [m.href, m.what]), [['#/arena', 'race track'], ['#/arena/party', 'ring'], ['#/games', 'arcade'], ['#/watch', 'observatory'], ['#/learn', 'library']]);
  assert.ok(!LANDMARKS.some(m => m.at.join() === TOWER_SLOT.join()));
});

/* ---------- 1.3 Migration ---------- */
const katas = (trick, from, to) => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [kataKey(trick, from + i), 1]));
const mastered = { n: 10, c: 9, m: 0.9 };
test('migration: Katas 1 to 9 done lights Star 1 only', () => {
  const S = { katasDone: katas('sq5', 1, 9) };
  assert.equal(migrateSky(S, 5), true);
  assert.deepEqual(S.sky.lit, { 'sq5:1': 5 });
  assert.equal(S.skyMigrated, 1);
});
test('migration: 8 of Katas 18 to 34 does not light Star 2; 8 of Katas 35 to 50 lights Star 3', () => {
  const S = { katasDone: { ...katas('by11', 18, 25), ...katas('by11', 35, 42), ...katas('by11', 1, 8) } };
  migrateSky(S, 5);
  assert.deepEqual(S.sky.lit, { 'by11:3': 5 });
});
test('migration: Belts earned under the mastery rule are kept; a Belt short of one Trick is not', () => {
  const S = { skills: { 'v-from9': mastered, 'v-by11': mastered, 'v-times5': mastered, 'v-sq5': mastered, 'v-by9s': mastered } };
  migrateSky(S, 7);
  assert.deepEqual(S.belts, { white: 7 });
  assert.equal(S.sky, undefined, 'no Stars lit, so the Star record is left as it was');
});
test('migration: a second run changes nothing, makes no skipped marks, and keeps Stars already lit', () => {
  const S = { katasDone: { ...katas('sq5', 1, 17), ...katas('sq5', 18, 26) }, sky: { lit: { 'sq5:1': 2 }, skipped: { 'sq5:3': 3, 'sq5:2': 4 }, last: {} } };
  migrateSky(S, 9);
  assert.deepEqual(S.sky.lit, { 'sq5:1': 2, 'sq5:2': 9 });
  assert.deepEqual(S.sky.skipped, { 'sq5:3': 3 }, 'lighting clears a skipped mark; nothing new is marked');
  const before = JSON.stringify(S);
  assert.equal(migrateSky(S, 99), false);
  assert.equal(JSON.stringify(S), before);
});

test('migration through the store emits no Star Quest event, earns no Sparks, and runs again after an old backup is restored', async () => {
  const store = await import('../js/store.js');
  await store.loadBackup();
  const gm = await import('../js/gamify.js');
  mem['mathquest.v1.p1'] = JSON.stringify({ v: 3, skills: {}, sparks: 12, katasDone: { ...katas('from9', 1, 50), ...katas('by11', 1, 50), ...katas('times5', 1, 50), ...katas('sq5', 1, 9) } });
  sent.length = 0;
  gm.init();
  const d = JSON.parse(mem['mathquest.v1.p1']);
  assert.equal(d.skyMigrated, 1);
  assert.equal(Object.keys(d.sky.lit).length, 10);
  assert.equal(d.sparks, 12);
  assert.ok(d.belts.white > 0, 'nine lit white belt Stars keep the White belt');
  assert.ok(d.badges['belt-white'] > 0);
  assert.deepEqual(sent.filter(p => p.includes('star/')), []);
  // An old backup (no flag) is migrated again when restored
  store.importData(JSON.stringify({ data: { skills: {}, katasDone: katas('ends10', 35, 42) } }));
  assert.deepEqual(Object.keys(store.starStates().lit), ['ends10:3']);
  assert.equal(JSON.parse(mem['mathquest.v1.p1']).skyMigrated, 1);
  assert.deepEqual(sent.filter(p => p.includes('star/')), []);
});

test('BELTS hold 3 Tricks each, so 9 Stars a Belt', () => {
  for (const b of BELTS) assert.equal(b.tricks.length, 3);
});
