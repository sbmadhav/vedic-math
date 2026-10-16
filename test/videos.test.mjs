/* The Watch shelf's data meets its schema and the bar (openspec watch-shelf, design decision 7). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { VIDEOS, LINKS } from '../js/videos.js';
import { byId } from '../js/skills/index.js';
import { TRICKS } from '../js/vedic.js';
import { MAX_LENGTH } from '../js/watch.js';

const MODES = ['explorer', 'challenger', 'pro'];
const TRICK_IDS = new Set(TRICKS.map(t => t.id));
const today = new Date().toISOString().slice(0, 10);
const dups = xs => xs.filter((x, i) => xs.indexOf(x) !== i);
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && s <= today;

test('ids are unique across videos and links; YouTube ids are well formed and unique', () => {
  assert.deepEqual(dups([...VIDEOS, ...LINKS].map(v => v.id)), []);
  assert.deepEqual(dups(VIDEOS.map(v => v.yt)), []);
  for (const v of VIDEOS) assert.match(v.yt, /^[\w-]{11}$/, v.id);
});

test('every video is under 12 minutes, for every Mode', () => {
  assert.equal(MAX_LENGTH, 720);
  for (const v of VIDEOS) assert.ok(Number.isInteger(v.duration) && v.duration > 0 && v.duration < MAX_LENGTH, `${v.id}: ${v.duration}s`);
});

test('every video has the full schema', () => {
  for (const v of VIDEOS) {
    assert.ok(['video', 'short'].includes(v.kind), v.id);
    assert.ok(v.modes.length && v.modes.every(m => MODES.includes(m)), `${v.id} modes`);
    assert.ok(typeof v.title === 'string' && v.title.trim(), `${v.id} title`);
    assert.ok(typeof v.channel === 'string' && v.channel.trim(), `${v.id} channel`);
    assert.equal(typeof v.madeForKids, 'boolean', `${v.id} madeForKids`);
    assert.equal(typeof v.captions, 'boolean', `${v.id} captions`);
    assert.ok(isDate(v.checked), `${v.id} checked ${v.checked}`);
    assert.ok(typeof v.why === 'string' && v.why.trim(), `${v.id} why`);
    assert.ok(Array.isArray(v.skills) && Array.isArray(v.tricks), `${v.id} skills and tricks`);
  }
});

test('Skills and Tricks named by an entry exist', () => {
  for (const v of [...VIDEOS, ...LINKS]) {
    for (const s of v.skills) assert.ok(byId[s] && !s.startsWith('v-'), `${v.id}: no Skill ${s} (name a Trick in tricks)`);
    for (const t of v.tricks) assert.ok(TRICK_IDS.has(t), `${v.id}: no Trick ${t}`);
  }
});

test('critiques are for Pro only', () => {
  for (const v of VIDEOS) if (v.critique) assert.deepEqual(v.modes, ['pro'], v.id);
});

test('no video carries a URL; links are https and not YouTube', () => {
  for (const v of VIDEOS) assert.doesNotMatch(JSON.stringify(v), /https?:|www\.|youtu/i, v.id);
  for (const l of LINKS) {
    assert.match(l.url, /^https:\/\//, l.id);
    assert.doesNotMatch(l.url, /youtube\.com|youtu\.be/, l.id);
    assert.ok(['site', 'game'].includes(l.kind), l.id);
    assert.ok(!('modes' in l), `${l.id}: links are Pro only and have no modes`);
    assert.ok(isDate(l.checked), l.id);
    assert.ok(l.why && l.why.trim(), l.id);
  }
});

test('no title or why line says "from the Vedas" or uses an em dash', () => {
  for (const v of [...VIDEOS, ...LINKS]) for (const s of [v.title, v.why]) {
    assert.doesNotMatch(s, /from the Vedas/i, v.id);
    assert.doesNotMatch(s, /—/, v.id);
  }
});

test('the migration left no playlist or channel', () => {
  for (const l of LINKS) assert.doesNotMatch(l.url, /[?&]list=|\/@|\/channel\//, l.id);
});
