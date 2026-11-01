/* Progress hand-off (openspec change learnvedicmath, design D9, progress-handoff spec; tasks 10.1 and 10.4): the schema
   both sides share (js/handoff-schema.js), the packer's reading of a device, the encoding, the strict validator, and
   the import's writes (js/handoff.js). Hostile and oversized input imports nothing. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import * as S from '../js/handoff-schema.js';
import { applyHandoff, progressHere, playerRow, RESULTS } from '../js/handoff.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const b64url = buf => Buffer.from(buf).toString('base64url');

/* A storage stand-in with the shape both sides use */
const storage = (init = {}) => {
  const m = new Map(Object.entries(init).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  return { m, get: k => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, String(v)), remove: k => m.delete(k), keys: () => [...m.keys()] };
};
const device = init => { const st = storage(init); return S.readDevice(st.get, st.keys, { now: 1_700_000_000_000, random: () => 0.5 }); };
const record = (extra = {}) => ({ v: 3, sparks: 120, skills: { 'mul-11': { n: 9, c: 8, m: 0.9, streak: 3, last: 1_700_000_000_000 } }, days: { '2026-10-01': 4 }, best: { bolt: 12 },
  last: 'mul-11', grade: '5', badges: { first: 1_700_000_000_000 }, counts: { answers: 9 }, seen: { tip: 1 }, medals: { 'g:bolt:1': 2 }, katasDone: { 'k:mul-11:1': 1 },
  ratings: { bolt: 7 }, weekSparks: { '2026-W40': 50 }, questDay: { day: '2026-10-01', base: { answers: 1 }, done: {} }, sky: { lit: { 'mul-11:1': 1 }, skipped: {}, last: { 'mul-11:1': ['a', 'b'] } }, ...extra });
const players = (list, active = list[0].id) => ({ active, list });
const P1 = { id: 'p1', name: 'Swift Tiger 42', avatar: 'teal', mode: 'challenger', created: 1_700_000_000_000 };
const P2 = { id: 'pabc123', name: 'Brave Otter 17', avatar: 'plum', mode: 'explorer', created: 1_700_000_000_000, age: 10 };
const goodPayload = () => S.payloadOf(device({ 'vm.players': players([P1, P2]), 'mathquest.v1.p1': record(), 'mathquest.v1.pabc123': record({ sparks: 5 }), theme: 'dark', 'vm.calm': '1' }), [], 1_700_000_000_000);

/* ---------- the allow-list ---------- */
test('the word lists, avatars and Nickname form match shared/src/names.ts (moved from js/store.js)', () => {
  const src = readFileSync(join(repo, 'shared/src/names.ts'), 'utf8');
  const list = name => JSON.parse(src.match(new RegExp(`const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
  assert.deepEqual(S.ADJ, list('ADJ'));
  assert.deepEqual(S.NOUN, list('NOUN'));
  assert.deepEqual(S.AVATARS, JSON.parse(src.match(/export const AVATARS = (\[[^\]]*\])/)[1].replace(/'/g, '"')));
  for (let i = 0; i < 200; i++) { const n = S.nameFrom(); assert.ok(S.validName(n), n); }
});

test('every vm.* key the app uses is either moved or excluded on purpose', () => {
  const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
  const keys = new Set();
  for (const f of walk(join(repo, 'js'))) {
    if (/handoff(-schema)?\.js$/.test(f)) continue;
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/['"`](vm\.[A-Za-z]+)[.'"`]/g)) keys.add(m[1]);
    // Settings saved through a helper that adds the vm. prefix (fx.js, ambient.js, voice.js, sutra-ambience.js)
    if (/localStorage\.(get|set)Item\('vm\.' \+ KEYS/.test(src)) for (const m of src.matchAll(/\w+: \['(\w+)', '[01]'\]/g)) keys.add('vm.' + m[1]);
    else if (/localStorage\.(get|set)Item\('vm\.' \+/.test(src)) for (const m of src.matchAll(/\b(?:pref|setPref|get|put)\('(\w+)'/g)) keys.add('vm.' + m[1]);
  }
  assert.ok(keys.has('vm.players') && keys.has('vm.calm') && keys.has('vm.studioVoice') && keys.has('vm.sutraOm'), 'the scan finds the keys');
  const listed = new Set([...S.MOVED_KEYS, ...S.EXCLUDED]);
  assert.deepEqual([...keys].filter(k => !listed.has(k)).sort(), [], 'add each key to SETTINGS (moved) or EXCLUDED in js/handoff-schema.js');
  for (const k of S.EXCLUDED) assert.ok(!(k in S.SETTINGS), k);
});

/* ---------- reading a device (the moved page) ---------- */
test('a device with Players packs its Players, records and listed settings, and nothing else', () => {
  const d = device({
    'vm.players': players([{ ...P1, parentOk: 1_700_000_000_000, extra: '<b>' }, P2], 'pabc123'), 'mathquest.v1.p1': record({ stray: 1 }), 'mathquest.v1.pabc123': record(),
    'vm.play.p1.art': { gallery: [{ c: 'abc_-', at: '2026-10-01' }] }, 'vm.play.p1.bad': { x: '<img src=x onerror=alert(1)>' },
    'vm.cloudUids': { p1: 'uid-secret' }, 'vm.cloudUid': 'uid-old', 'vm.board': [{ board: 'x', pid: 'p1', score: 9 }], 'vm.metrics': { a: 1 }, 'vm.firstSeen': '1',
    'vm.voiceName': 'Samantha', theme: 'dark', 'vm.text': 'a+', 'vm.vol': '0.25', 'vm.calm': 'yes', kidmode: '1',
  });
  assert.equal(d.players.active, 'pabc123');
  assert.deepEqual(d.players.list[0], P1, 'parentOk and unknown fields stay behind');
  assert.equal(d.players.list[1].age, 10);
  assert.ok(!('stray' in d.records.p1));
  assert.deepEqual(Object.keys(d.play), ['p1']);
  assert.deepEqual(Object.keys(d.play.p1), ['art'], 'a play record with markup in it stays behind');
  assert.deepEqual(d.settings, { theme: 'dark', 'vm.text': 'a+', 'vm.vol': '0.25' }, 'only listed settings with listed values');
  const all = JSON.stringify(S.payloadOf(d));
  for (const gone of ['uid-secret', 'uid-old', 'parentOk', 'Samantha', 'metrics', 'board', 'kidmode']) assert.ok(!all.includes(gone), gone);
  assert.equal(S.validatePayload(S.payloadOf(d)).ok, true);
});

test('a device on the oldest format (a bare mathquest.v1 record) is packed as p1, not treated as empty', () => {
  const d = device({ 'mathquest.v1': { skills: { a: { n: 1, c: 1, m: 0.35, streak: 1, last: 1 } }, xp: 40, weekXp: { '2026-W40': 40 }, stars: { 'g:bolt:1': 2 } } });
  assert.equal(d.players.list.length, 1);
  assert.equal(d.players.list[0].id, 'p1');
  assert.equal(d.players.list[0].avatar, 'teal');
  assert.equal(d.players.list[0].mode, null);
  assert.ok(S.validName(d.players.list[0].name));
  assert.equal(d.records.p1.xp, 40, 'the new site migrates XP to Sparks on load (js/store.js migrate)');
  assert.equal(S.validatePayload(S.payloadOf(d)).ok, true);
});

test('an empty device has nothing to bring', () => {
  assert.equal(device({}), null);
  assert.equal(device({ theme: 'dark', 'vm.players': { active: 'p1', list: [] } }), null);
  assert.equal(device({ 'mathquest.v1': { sparks: 3 } }), null, 'a bare record without skills is not progress');
  assert.equal(device({ 'vm.players': '{not json' }), null);
});

test('a Nickname not from the word lists is replaced, never carried', () => {
  const d = device({ 'vm.players': players([{ ...P1, name: '<img src=x onerror=alert(1)>' }]) });
  assert.ok(S.validName(d.players.list[0].name));
});

/* ---------- encoding ---------- */
test('a payload survives encode and decode, and the fragment carries only a safe route', async () => {
  const p = goodPayload();
  const { data, dropped } = await S.pack(device({ 'vm.players': players([P1]), 'mathquest.v1.p1': record() }));
  assert.deepEqual(dropped, []);
  assert.match(data, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(await S.decode(await S.encode(p)), p);
  const f = S.readFragment(S.fragment(data, '#/arena'));
  assert.equal(f.v, '1'); assert.equal(f.d, data); assert.equal(f.route, '#/arena');
  assert.equal(S.readFragment(S.fragment(data, '#/x"><script>')).route, '');
  assert.equal(S.readFragment('#v=1&d=abc&r=' + encodeURIComponent('javascript:alert(1)')).route, '');
  assert.equal(S.readFragment('#' + 'a'.repeat(S.MAX_PAYLOAD + 1000)), null);
});

test('over the size cap the biggest optional parts are left out first, and named', async () => {
  // Thousands of random play-record strings do not compress: only leaving them out fits
  const big = { gallery: Array.from({ length: 400 }, (_, i) => ({ c: b64url(Buffer.from(Array.from({ length: 60 }, () => Math.random() * 256 | 0))), at: '2026-10-' + (10 + (i % 20)) })) };
  const d = device({ 'vm.players': players([P1]), 'mathquest.v1.p1': record(), 'vm.play.p1.art': big });
  const { data, dropped } = await S.pack(d);
  assert.ok(data.length <= S.MAX_PAYLOAD);
  assert.deepEqual(dropped, ['play']);
  const back = await S.decode(data);
  assert.equal(back.play, undefined);
  assert.deepEqual(back.dropped, ['play']);
  assert.equal(back.records.p1.sparks, 120, 'the progress itself still comes');
  assert.equal(S.validatePayload(back).ok, true);
});

test('when even the core does not fit, nothing is sent with the link', async () => {
  const skills = Object.fromEntries(Array.from({ length: 4000 }, (_, i) => [b64url(Buffer.from(String(Math.random()))).slice(0, 20) + i, { n: i, c: i, m: Math.random(), streak: 1, last: Date.now() - i }]));
  const many = Array.from({ length: 6 }, (_, i) => ({ ...P1, id: 'p' + (i + 1) }));
  const init = { 'vm.players': players(many) };
  for (const p of many) init['mathquest.v1.' + p.id] = { skills };
  assert.deepEqual(await S.pack(device(init)), { tooBig: true });
});

test('decode refuses oversized, malformed and non-JSON input', async () => {
  const bomb = b64url(gzipSync(Buffer.alloc(S.MAX_JSON + 10, 32))); // compresses to well under the cap, inflates past it
  assert.ok(bomb.length < S.MAX_PAYLOAD);
  await assert.rejects(S.decode(bomb), /too big/);
  await assert.rejects(S.decode('a'.repeat(S.MAX_PAYLOAD + 1)), /not a payload/);
  await assert.rejects(S.decode('abc$def'), /not a payload/);
  await assert.rejects(S.decode(''), /not a payload/);
  await assert.rejects(S.decode(b64url(Buffer.from('plain text'))), /not gzip/);
  await assert.rejects(S.decode(b64url(gzipSync('{"v":1,'))), /not JSON/);
  await assert.rejects(S.decode(b64url(gzipSync(Buffer.from([0xff, 0xfe, 0xfd])))), /not text/);
});

/* ---------- strict validation (the import page) ---------- */
test('the validator accepts a packed payload and rejects anything off the schema', () => {
  assert.equal(S.validatePayload(goodPayload()).ok, true);
  const bad = {
    'not an object': () => [],
    'bad version': p => { p.v = 2; },
    'unknown top-level key': p => { p.cloudUids = { p1: 'x' }; },
    'unknown source': p => { p.from = 'evil.example'; },
    'script in a Nickname': p => { p.players.list[0].name = '<img src=x onerror=alert(1)>'; },
    'Nickname not from the word lists': p => { p.players.list[0].name = 'Evil Hacker 66'; },
    'parentOk on a Player': p => { p.players.list[0].parentOk = 1; },
    'bad avatar': p => { p.players.list[0].avatar = 'red;background:url(x)'; },
    'bad Mode': p => { p.players.list[0].mode = 'admin'; },
    'bad Age answer': p => { p.players.list[0].age = 500; },
    'bad id': p => { p.players.list[0].id = '../x'; p.players.active = '../x'; },
    'duplicate id': p => { p.players.list[1].id = 'p1'; },
    'active not listed': p => { p.players.active = 'p9'; },
    'too many Players': p => { p.players.list = Array.from({ length: S.MAX_PLAYERS + 1 }, (_, i) => ({ ...P1, id: 'p' + (i + 1) })); },
    'no Players': p => { p.players.list = []; },
    'record for an unknown Player': p => { p.records.p9 = {}; },
    'unknown record field': p => { p.records.p1.evil = 1; },
    'wrong type': p => { p.records.p1.sparks = '120'; },
    'number out of range': p => { p.records.p1.sparks = 1e12; },
    'medal out of range': p => { p.records.p1.medals['g:bolt:1'] = 4; },
    'NaN-like value': p => { p.records.p1.ratings.bolt = null; },
    'markup in a key': p => { p.records.p1.badges['<script>'] = 1; },
    '__proto__ key': p => { p.records.p1.counts = JSON.parse('{"__proto__": 1}'); },
    'extra skill field': p => { p.records.p1.skills['mul-11'].html = 1; },
    'too many entries': p => { p.records.p1.counts = Object.fromEntries(Array.from({ length: S.MAX_RECORD_KEYS + 1 }, (_, i) => ['c' + i, 1])); },
    'bad setting value': p => { p.settings.theme = 'url(javascript:alert(1))'; },
    'unlisted setting': p => { p.settings['vm.cloudUids'] = '{}'; },
    'markup in a play record': p => { p.play = { p1: { art: { c: '<svg onload=alert(1)>' } } }; },
    'too deep a play record': p => { let v = 1; for (let i = 0; i < 10; i++) v = [v]; p.play = { p1: { art: v } }; },
    'bad play key': p => { p.play = { p1: { 'Bad Key': 1 } }; },
    'unknown dropped part': p => { p.dropped = ['everything']; },
  };
  for (const [what, edit] of Object.entries(bad)) {
    const p = goodPayload();
    const r = edit(p);
    assert.equal(S.validatePayload(r === undefined ? p : r).ok, false, what);
  }
  for (const x of [null, undefined, 1, 'x', true]) assert.equal(S.validatePayload(x).ok, false);
});

/* ---------- the offer's Player rows (the import page) ---------- */
/* A document stand-in: elements hold a class, text and children, and setting innerHTML throws, so a row built from
   the payload can only be built from text */
const fakeDoc = () => ({ createElement: tag => ({ tag, className: '', textContent: '', attrs: {}, children: [], setAttribute(k, v) { this.attrs[k] = v; }, append(...c) { this.children.push(...c); }, set innerHTML(v) { throw new Error('innerHTML with payload data'); } }) });
const textOf = n => (typeof n === 'string' ? n : n.textContent || n.children.map(textOf).join(''));

test('a Player row: an avatar tile coloured by Mode with the first letter, the Nickname, then the Mode word and Sparks, from text only', () => {
  const li = playerRow(P2, 1234, fakeDoc());
  assert.equal(li.tag, 'li'); assert.equal(li.className, 'ho-player');
  const [avatar, gap, text] = li.children;
  assert.equal(avatar.className, 'ho-avatar ho-avatar--sun', 'Explorer is sun');
  assert.equal(avatar.textContent, 'B'); assert.equal(avatar.attrs['aria-hidden'], 'true');
  assert.equal(gap, ' ', 'readable before the styles load; never shown in the flex row');
  assert.deepEqual(text.children.map(c => (typeof c === 'string' ? c : c.className)), ['ho-name', ' ', 'ho-meta']);
  assert.equal(text.children[0].textContent, 'Brave Otter 17');
  assert.equal(text.children[2].textContent, 'Explorer, 1,234 Sparks');
  assert.equal(textOf(li), 'B Brave Otter 17 Explorer, 1,234 Sparks');
  const meta = (p, n) => playerRow(p, n, fakeDoc()).children[2].children[2].textContent;
  assert.equal(playerRow(P1, 1, fakeDoc()).children[0].className, 'ho-avatar ho-avatar--sky', 'Challenger is sky');
  assert.equal(meta(P1, 1), 'Challenger, 1 Spark');
  assert.equal(playerRow({ ...P1, mode: 'pro' }, 0, fakeDoc()).children[0].className, 'ho-avatar ho-avatar--plum', 'Pro is plum');
  const noMode = playerRow({ ...P1, mode: null }, 40, fakeDoc());
  assert.equal(noMode.children[0].className, 'ho-avatar', 'the oldest format packs no Mode');
  assert.equal(meta({ ...P1, mode: null }, 40), '40 Sparks');
});

test('the Mode words in the rows are the ones js/fx.js shows', () => {
  const src = readFileSync(join(repo, 'js/fx.js'), 'utf8');
  for (const [mode, word] of [['explorer', 'Explorer'], ['challenger', 'Challenger'], ['pro', 'Pro']]) {
    assert.match(src, new RegExp(`${mode}: \\{ name: '${word}'`), `fx.js MODES.${mode}.name`);
    assert.equal(playerRow({ ...P1, mode }, 2, fakeDoc()).children[2].children[2].textContent, `${word}, 2 Sparks`);
  }
});

/* ---------- writing (the import page) ---------- */
const imported = async () => (await S.decode(await S.encode(goodPayload())));

test('a first hand-off writes the Players, their progress and settings', async () => {
  const st = storage({ 'vm.players': players([{ ...P1, name: 'Sunny Koala 11' }]), 'vm.sound': '0' }); // a first visit's blank p1
  assert.equal(progressHere(st).has, false);
  applyHandoff(st, await imported(), 'replace', 5);
  const P = JSON.parse(st.get('vm.players'));
  assert.deepEqual(P.list.map(p => p.name), ['Swift Tiger 42', 'Brave Otter 17']);
  assert.equal(P.list[1].age, 10, 'the Age answer comes; the Parent step does not');
  assert.equal(JSON.parse(st.get('mathquest.v1.p1')).sparks, 120);
  assert.equal(st.get('theme'), 'dark');
  assert.equal(st.get('vm.migratedAt'), '5');
});

test('Use the old site\'s replaces this device\'s Players; a Player with a World board identity here never lends it', async () => {
  const st = storage({ 'vm.players': players([P1, { ...P1, id: 'pzz', name: 'Bold Yak 55' }]), 'mathquest.v1.p1': record({ sparks: 999 }), 'mathquest.v1.pzz': record(),
    'vm.play.pzz.art': { gallery: [] }, 'vm.board': [{ pid: 'pzz' }], 'vm.cloudUids': { p1: 'u1', pzz: 'u2' }, theme: 'light' });
  assert.equal(progressHere(st).has, true);
  const written = applyHandoff(st, await imported(), 'replace');
  const P = JSON.parse(st.get('vm.players'));
  assert.equal(P.list.length, 2);
  assert.notEqual(written[0].id, 'p1', 'p1 had an identity here: the imported p1 gets a new id');
  assert.equal(P.active, written[0].id);
  assert.equal(st.get('mathquest.v1.p1'), null);
  assert.equal(JSON.parse(st.get('mathquest.v1.' + written[0].id)).sparks, 120);
  for (const gone of ['mathquest.v1.pzz', 'vm.play.pzz.art', 'vm.board']) assert.equal(st.get(gone), null, gone);
  assert.deepEqual(JSON.parse(st.get('vm.cloudUids')), {});
  assert.deepEqual(JSON.parse(st.get('vm.cloudForget')), ['pzz'], 'signed out at the next post (js/cloud.js clearForgotten)');
  assert.equal(st.get('theme'), 'dark');
});

test('Keep both adds the old site\'s Players next to these, with new ids where they clash; this device\'s settings win', async () => {
  const st = storage({ 'vm.players': players([P1]), 'mathquest.v1.p1': record({ sparks: 999 }), theme: 'light' });
  const written = applyHandoff(st, await imported(), 'both');
  const P = JSON.parse(st.get('vm.players'));
  assert.equal(P.list.length, 3);
  assert.equal(JSON.parse(st.get('mathquest.v1.p1')).sparks, 999, 'this device\'s Player is untouched');
  assert.notEqual(written[0].id, 'p1');
  assert.equal(JSON.parse(st.get('mathquest.v1.' + written[0].id)).sparks, 120);
  assert.equal(written[1].id, 'pabc123');
  assert.equal(st.get('theme'), 'light');
  assert.equal(st.get('vm.calm'), '1', 'a setting not made here comes over');
  assert.equal(new Set(P.list.map(p => p.id)).size, 3);
});

test('the game reads what the hand-off wrote', async () => {
  const st = storage();
  applyHandoff(st, await imported(), 'replace');
  const mem = Object.fromEntries(st.m);
  globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, get length() { return Object.keys(mem).length; }, key: i => Object.keys(mem)[i] ?? null };
  const store = await import('../js/store.js?handoff');
  assert.equal(store.allPlayers().length, 2);
  assert.equal(store.player().name, 'Swift Tiger 42');
  assert.equal(store.sparks(), 120);
  assert.equal(store.medal('g:bolt:1'), 2);
  store.switchPlayer('pabc123');
  assert.equal(store.sparks(), 5);
});

/* A storage with a byte cap, as a full browser behaves: a write that would go over it throws QuotaExceededError and
   leaves the key as it was */
const capped = (init, cap) => {
  const st = storage(init), set = st.set;
  st.size = () => [...st.m.entries()].reduce((n, [k, v]) => n + k.length + v.length, 0);
  st.set = (k, v) => {
    const had = st.m.has(k) ? st.m.get(k) : null;
    set(k, v);
    if (st.size() > cap) { if (had === null) st.m.delete(k); else st.m.set(k, had); const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; }
  };
  return st;
};

test('a rollback frees every touched key before the old values go back, so a full browser gets its progress back whole', () => {
  // This device: a Device board stored first, then a small record for p1; the old site's p1 brings a much bigger record
  const entry = (k, v) => k.length + v.length;
  const board = JSON.stringify(Array.from({ length: 30 }, (_, i) => ({ board: 'daily-2026-10-' + i, pid: 'p1', score: 100 + i, ts: 1_700_000_000_000 })));
  const old = JSON.stringify(record());
  const init = { 'vm.board': board, 'vm.players': players([P1]), 'mathquest.v1.p1': old };
  const big = record({ seen: Object.fromEntries(Array.from({ length: 300 }, (_, i) => ['tip-' + i, 1_700_000_000_000])) });
  const payload = S.payloadOf(device({ 'vm.players': players([P1]), 'mathquest.v1.p1': big }), [], 1_700_000_000_000);
  assert.equal(S.validatePayload(payload).ok, true);
  const probe = storage(init), snapshot = [...probe.m.entries()].sort();
  const total = [...probe.m.entries()].reduce((n, [k, v]) => n + entry(k, v), 0);
  // The cap lets the big record in once the board and the old record are gone, and nothing more: the Players list fails
  const cap = total - entry('vm.board', board) - entry('mathquest.v1.p1', old) + entry('mathquest.v1.p1', JSON.stringify(payload.records.p1)) + 20;
  assert.ok(total <= cap, 'what the device held fitted its browser');
  const st = capped(init, cap);
  assert.throws(() => applyHandoff(st, payload, 'replace'), /full/);
  assert.deepEqual([...st.m.entries()].sort(), snapshot, 'the board, the record and the Players list are back as they were');
});

test('a write that fails part way (storage full) leaves every key exactly as it was, for both choices', async () => {
  const payload = await imported();
  const start = { 'vm.players': players([P1, { ...P1, id: 'pzz', name: 'Bold Yak 55' }]), 'mathquest.v1.p1': record({ sparks: 999 }), 'mathquest.v1.pzz': record(),
    'vm.play.pzz.art': { gallery: [] }, 'vm.board': [{ pid: 'pzz' }], 'vm.cloudUids': { p1: 'u1', pzz: 'u2' }, 'vm.cloudUid': 'u0', theme: 'light', 'vm.sound': '0' };
  for (const choice of ['replace', 'both']) {
    // How many writes a full run makes, then fail on each one in turn
    const probe = storage(start); let writes = 0;
    const set0 = probe.set; probe.set = (k, v) => { writes++; set0(k, v); };
    applyHandoff(probe, payload, choice);
    assert.ok(writes > 3, choice);
    for (let n = 1; n <= writes; n++) {
      const st = storage(start), snapshot = [...st.m.entries()].sort();
      let calls = 0; const set = st.set;
      st.set = (k, v) => { if (++calls === n) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } set(k, v); };
      assert.throws(() => applyHandoff(st, payload, choice), /full/, `${choice} write ${n}`);
      assert.deepEqual([...st.m.entries()].sort(), snapshot, `${choice}: failing write ${n} of ${writes} restores every key`);
    }
  }
});

/* ---------- the one count the import page sends (analytics spec, task 9.2) ---------- */
test('the import page\'s result buckets are exactly the ones the analytics spec lists', () => {
  // The requirement "Hand-off results are counted" lives in the main spec once the change is archived, in its delta until then
  const spec = ['openspec/specs/analytics/spec.md', 'openspec/changes/learnvedicmath/specs/analytics/spec.md']
    .map(f => { try { return readFileSync(join(repo, f), 'utf8'); } catch (e) { return ''; } })
    .find(s => s.includes('### Requirement: Hand-off results are counted'));
  assert.ok(spec, 'the requirement is in a spec');
  const m = /`math\/handoff\/<result>` event per visit, where the result is one of ([^.]+), and only after the fragment/.exec(spec);
  assert.ok(m, 'the requirement names the results');
  assert.deepEqual(RESULTS, m[1].split(/, | or /));
  assert.ok(RESULTS.every(r => /^[a-z-]+$/.test(r)), 'fixed words only');
  const src = readFileSync(join(repo, 'js/handoff.js'), 'utf8');
  assert.deepEqual([...src.matchAll(/math\/handoff\/([a-z-]+)/g)].map(x => x[1]), [], 'every count goes through count(result), never a literal path');
  for (const r of src.matchAll(/count\('([a-z-]+)'\)/g)) assert.ok(RESULTS.includes(r[1]), r[1]);
});

/* The Grade answer and the Read aloud choice (openspec change age-bands, ADR 0008) move with the Player, as the Age
   answer does: packed, validated, and refused when off the schema */
test('a Player\'s Grade answer and Read aloud choice are packed and validated; a bad one is refused', () => {
  const d = device({ 'vm.players': players([{ ...P1, reading: { grade: 'k', at: 1_700_000_000_000 }, voice: false }, { ...P2, reading: { age: 15 } }]), 'mathquest.v1.p1': record() });
  assert.deepEqual(d.players.list[0].reading, { grade: 'k', at: 1_700_000_000_000 });
  assert.equal(d.players.list[0].voice, false);
  assert.deepEqual(d.players.list[1].reading, { age: 15 });
  assert.equal(S.validatePayload(S.payloadOf(d)).ok, true);
  const dirty = device({ 'vm.players': players([{ ...P1, reading: { grade: '13' } }, { ...P2, reading: { age: 9, grade: '3' }, voice: 'yes' }]) });
  assert.ok(!('reading' in dirty.players.list[0]), 'a grade off the list stays behind');
  assert.ok(!('reading' in dirty.players.list[1]) && !('voice' in dirty.players.list[1]), 'an answer with both, and a voice that is not true or false, stay behind');
  for (const [name, reading] of [['bad grade', { grade: 'x' }], ['both', { grade: 'k', age: 9 }], ['neither', { at: 1 }], ['extra field', { grade: 'k', band: 'early' }], ['bad age', { age: 500 }], ['bad time', { grade: 'k', at: -1 }]]) {
    const p = goodPayload(); p.players.list[0].reading = reading;
    assert.equal(S.validatePayload(p).ok, false, name);
  }
  const p = goodPayload(); p.players.list[0].voice = 'on';
  assert.equal(S.validatePayload(p).ok, false, 'voice is true or false');
});
