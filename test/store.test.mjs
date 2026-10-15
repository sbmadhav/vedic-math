/* Posting consent lives on each Player's record on this device: the Age answer (age) and the Parent step
   (parentOk). Set, read, kept apart per Player, and removed with the Player. */
import test from 'node:test';
import assert from 'node:assert/strict';

const mem = {};
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const store = await import('../js/store.js');
const saved = () => JSON.parse(mem['vm.players']);

test('a new Player has no Age answer and no Parent step', () => {
  const p = store.player();
  assert.equal(p.age, undefined);
  assert.equal(p.parentOk, undefined);
});

test('setAge stores a whole number of years or adult, on this device only', () => {
  store.setAge(9);
  assert.equal(store.player().age, 9);
  assert.equal(saved().list[0].age, 9);
  store.setAge('adult');
  assert.equal(store.player().age, 'adult');
  for (const bad of [0, -1, 9.5, '9', null, undefined, 'grown-up', 500]) assert.throws(() => store.setAge(bad), String(bad));
  assert.equal(store.player().age, 'adult');
});

test('setParentOk gives the Parent step with a time and withdraws it with null', () => {
  const t0 = Date.now();
  store.setParentOk(true);
  assert.ok(store.player().parentOk >= t0);
  assert.equal(saved().list[0].parentOk, store.player().parentOk);
  store.setParentOk(false);
  assert.equal(store.player().parentOk, null);
  assert.equal(saved().list[0].parentOk, null);
});

test('each Player keeps their own answer and step across switches', () => {
  const first = store.player().id;
  store.setAge(8); store.setParentOk(true);
  const second = store.addPlayer();
  assert.equal(store.player().id, second.id);
  assert.equal(store.player().age, undefined);
  assert.equal(store.player().parentOk, undefined);
  store.setAge(15);
  store.switchPlayer(first);
  assert.equal(store.player().age, 8);
  assert.ok(store.player().parentOk);
  store.switchPlayer(second.id);
  assert.equal(store.player().age, 15);
  assert.equal(store.player().parentOk, undefined);
});

test('removing a Player removes their Age answer and Parent step', () => {
  const gone = store.player().id;
  store.removePlayer(gone);
  assert.ok(!saved().list.some(p => p.id === gone));
  assert.ok(!mem['vm.players'].includes('"age":15'));
  assert.equal(store.allPlayers().length, 1);
  assert.equal(store.player().age, 8);
});
