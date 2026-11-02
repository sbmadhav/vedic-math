/* Progress hand-off from the old site on sbmadhav.com to learnvedicmath.com (openspec change learnvedicmath, design D9,
   progress-handoff spec). One module, published on both sides: the moved page on the old origin packs with it
   (moved/handoff-pack.js) and the import page here (js/handoff.js) checks with it, so both use the same allow-list.

   What moves: each Player (id, Nickname, avatar, Mode, created time, Age answer), each Player's progress record
   (mathquest.v1.<id>), each Player's play-experience records (vm.play.<id>.<key>, optional) and the device settings
   in SETTINGS. Never: World board identities, the Device board, analytics milestones, the retired Parent step, the
   device's voice choices, or anything not listed here (EXCLUDED; test/handoff.test.mjs fails on a vm.* key in js/ that
   is in neither list).

   Payload: { v: 1, from, at, players: { active, list }, records: { <id>: record }, play?: { <id>: { <key>: value } },
   settings: { <key>: string }, dropped?: [part] }, as JSON, gzip, base64url. The fragment is
   #v=1&d=<payload>&r=<hash route>. The packer cleans what it reads (sanitize*: unknown fields and out-of-range values
   are left behind), and the importer accepts only a payload that already matches exactly (validatePayload). The Me
   page's backup code (js/store.js) is the same payload as JSON text, from FROM_BACKUP and with no size cap, and
   Restore from code checks it the same way. Nothing here touches the DOM, and no value is ever evaluated.
   Self-contained: no imports, so the old origin needs only this file and the packer. */

export const VERSION = 1;
export const FROM = 'sbmadhav.com';            // a hand-off from the old site (the moved page, the export page)
export const FROM_BACKUP = 'learnvedicmath.com'; // a backup code made on this site (the Me page)
export const MAX_PAYLOAD = 32 * 1024;   // characters of base64url in the fragment (browsers allow far longer URLs)
export const MAX_JSON = 256 * 1024;     // bytes after decompression; decoding stops past this
export const MAX_PLAYERS = 12;
export const MAX_RECORD_KEYS = 5000;    // entries in one progress record, all its maps together
export const MAX_PLAY_KEYS = 40;        // play-experience records per Player
export const MAX_PLAY_NODES = 3000;     // values in one play-experience record
export const ROUTE_RE = /^#\/[\w/-]{0,80}$/;
export const ID_RE = /^p[0-9a-z]{1,12}$/;
export const PLAY_KEY_RE = /^[a-z][a-z0-9-]{0,31}$/;
/* Nicknames are made from these words only (js/store.js makeName; test/handoff.test.mjs checks they match) */
export const ADJ = ['Swift', 'Clever', 'Mighty', 'Cosmic', 'Brave', 'Lucky', 'Sunny', 'Zippy', 'Witty', 'Bold', 'Jolly', 'Turbo', 'Nimble', 'Sparky', 'Quiet', 'Rapid'];
export const NOUN = ['Tiger', 'Falcon', 'Otter', 'Panda', 'Comet', 'Rocket', 'Koala', 'Dolphin', 'Phoenix', 'Lynx', 'Gecko', 'Orca', 'Yak', 'Robin', 'Badger', 'Narwhal'];
export const AVATARS = ['coral', 'teal', 'sun', 'sky', 'plum'];
export const MODES = ['explorer', 'challenger', 'pro'];
/* The Belts in order (js/vedic.js BELTS; test/handoff.test.mjs checks they match): a Placement's placedBelt is one */
export const BELT_IDS = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'black'];
/* The Placement level's grades (openspec placement): a record's placement.grade is one of these */
export const PLACEMENT_GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const NAME_RE = /^([A-Z][a-z]+) ([A-Z][a-z]+) (\d{2})$/;

const BIT = ['0', '1'];
/* Device settings that move, each with the values it may take */
export const SETTINGS = {
  theme: ['light', 'dark'],
  'motion-paused': ['1'],
  'vm.text': ['a', 'a+'],
  'vm.calm': BIT, 'vm.sound': BIT, 'vm.voice': BIT, 'vm.bg': BIT, 'vm.homeMore': BIT, 'vm.studioVoice': BIT,
  'vm.sutraAmb': BIT, 'vm.sutraHum': BIT, 'vm.sutraOm': BIT,
  'vm.tour': ['shown', 'done', 'skipped'],
  'vm.track': /^[a-z][a-z0-9-]{0,23}$/,
  'vm.vol': /^(0(\.\d{1,3})?|1(\.0{1,3})?)$/,
};
/* Keys that stay behind on purpose. vm.players, mathquest.v1.<id> and vm.play.<id>.<key> move as Players. */
export const MOVED_KEYS = ['vm.players', 'mathquest.v1', 'vm.play', ...Object.keys(SETTINGS)];
export const EXCLUDED = [
  'vm.cloudUids', 'vm.cloudUid', 'vm.cloudForget', // World board identities (ADR 0002): a new site starts new ones
  'vm.board',                                      // the Device board starts fresh, like World boards
  'vm.metrics', 'vm.firstSeen',                    // analytics milestones start fresh
  'vm.migratedAt',                                 // written by the hand-off itself, on each side
  'vm.voiceName', 'vm.naturalVoice', 'vm.naturalVoiceId', // this device's speech engine and its 100 MB download
  'vm.familyMute', 'vm.familyHi', 'vm.familyTicket', // the Family helpers' Not now, greeting and conversation ticket, for one browser session (sessionStorage)
  'vm.install',                                    // the Install nudge's schedule (openspec change install-app): this site's app, not the old one
  'vm.split',                                      // one box instead of the answer slots (openspec change working-memory-scaffolds): new on this site, the old one never wrote it
];
/* Parts the packer may leave out, biggest first, to fit MAX_PAYLOAD; the import page names them */
export const OPTIONAL = ['play', 'seen', 'days', 'skyLast', 'questDay'];
export const PART_NAMES = { play: 'game extras (puzzles, gallery, daily games)', seen: 'tips already seen', days: 'the calendar of days played', skyLast: 'the last Sky rounds', questDay: "today's quests" };

/* ---------- small checks ---------- */
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
/* Keys and ids in records: no markup characters, no control characters (the app may later show some of them) */
const KEY_RE = /^[^<>"'&`\\\u0000-\u001f\u007f]{1,120}$/;
const okKey = k => typeof k === 'string' && KEY_RE.test(k) && !BAD_KEYS.has(k);
const STR_RE = /^[^<>"'&`\\\u0000-\u001f\u007f]{0,200}$/;
const okNum = (v, max = 1e13) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
const okTime = v => okNum(v, 4102444800000); // up to 2100
export const validName = s => {
  const m = typeof s === 'string' && NAME_RE.exec(s);
  return !!m && ADJ.includes(m[1]) && NOUN.includes(m[2]) && +m[3] >= 10;
};
const okAge = a => a === undefined || a === null || a === 'adult' || (Number.isInteger(a) && a >= 1 && a <= 120);
const okSetting = (k, v) => {
  const rule = SETTINGS[k];
  return typeof v === 'string' && (Array.isArray(rule) ? rule.includes(v) : rule.test(v));
};

/* ---------- progress record: field -> [kind, max] ---------- */
const NUMS = { v: 9, sparks: 1e7, xp: 1e7, skyMigrated: 4102444800000, hookSeen: 4102444800000 };
const MAPS = { days: 1e6, best: 1e9, badges: 4102444800000, counts: 1e9, seen: 4102444800000, medals: 3, katasDone: 4102444800000,
  ratings: 20, weekSparks: 1e7, belts: 4102444800000, weekXp: 1e7, stars: 3 };
const SKILL = { n: 1e9, c: 1e9, m: 1, streak: 1e9, last: 4102444800000 };
/* The Sparks history (js/store.js sparksLog, openspec change muse-review-polish): up to LOG_CAP entries of
   { n, why, at, k? }, why a short lower-case word with : and - at most (quest, answer, play:locks) */
const LOG_CAP = 50, LOG_WHY_RE = /^[a-z][a-z0-9:-]{0,40}$/;
const okLog = e => isObj(e) && Object.keys(e).every(k => ['n', 'why', 'at', 'k'].includes(k)) && okNum(e.n, 1e7) && typeof e.why === 'string' && LOG_WHY_RE.test(e.why) && okTime(e.at) && (e.k === undefined || okNum(e.k, 1e9));
const RECORD_FIELDS = new Set([...Object.keys(NUMS), ...Object.keys(MAPS), 'skills', 'last', 'grade', 'questDay', 'sky', 'placement', 'placementCard', 'sparksLog']);
/* A Placement result (openspec placement): the grade, the steps climbed (0 to 12) and when; nothing else */
const okPlacement = v => isObj(v) && Object.keys(v).every(k => ['grade', 'steps', 'at'].includes(k)) && PLACEMENT_GRADES.includes(v.grade) && Number.isInteger(v.steps) && v.steps >= 0 && v.steps <= 12 && okTime(v.at);

/* Strict check of one progress record. Returns the number of map entries, or throws with the reason. */
function checkRecord(d) {
  if (!isObj(d)) throw new Error('record is not an object');
  let n = 0;
  const map = (m, max, what) => {
    if (!isObj(m)) throw new Error(`${what} is not an object`);
    for (const [k, v] of Object.entries(m)) {
      if (!okKey(k)) throw new Error(`${what}: bad key`);
      if (!okNum(v, max)) throw new Error(`${what}.${k}: out of range`);
      n++;
    }
  };
  for (const [f, v] of Object.entries(d)) {
    if (!RECORD_FIELDS.has(f)) throw new Error(`record: unknown field ${f.slice(0, 40)}`);
    if (f in NUMS) { if (!okNum(v, NUMS[f])) throw new Error(`record.${f}: out of range`); }
    else if (f in MAPS) map(v, MAPS[f], f);
    else if (f === 'skills') {
      if (!isObj(v)) throw new Error('skills is not an object');
      for (const [id, s] of Object.entries(v)) {
        if (!okKey(id) || !isObj(s)) throw new Error('skills: bad entry');
        for (const [k, x] of Object.entries(s)) if (!(k in SKILL) || !okNum(x, SKILL[k])) throw new Error(`skills.${id}.${k}: bad value`);
        n++;
      }
    } else if (f === 'last' || f === 'grade') { if (!(v === null || okKey(v))) throw new Error(`record.${f}: bad value`); }
    else if (f === 'placement') { if (!okPlacement(v)) throw new Error('placement: bad value'); }
    else if (f === 'placementCard') { if (v !== 'done') throw new Error('placementCard: bad value'); }
    else if (f === 'questDay') {
      if (v === null) continue;
      if (!isObj(v) || !okKey(v.day) || Object.keys(v).some(k => !['day', 'base', 'done'].includes(k))) throw new Error('questDay: bad value');
      map(v.base || {}, 1e9, 'questDay.base'); map(v.done || {}, 4102444800000, 'questDay.done');
    } else if (f === 'sky') {
      if (!isObj(v) || Object.keys(v).some(k => !['lit', 'skipped', 'last'].includes(k))) throw new Error('sky: bad value');
      map(v.lit || {}, 4102444800000, 'sky.lit'); map(v.skipped || {}, 4102444800000, 'sky.skipped');
      if (v.last !== undefined) {
        if (!isObj(v.last)) throw new Error('sky.last: bad value');
        for (const [k, a] of Object.entries(v.last)) {
          if (!okKey(k) || !Array.isArray(a) || a.length > 50 || !a.every(okKey)) throw new Error('sky.last: bad entry');
          n++;
        }
      }
    } else if (f === 'sparksLog') {
      if (!Array.isArray(v) || v.length > LOG_CAP || !v.every(okLog)) throw new Error('sparksLog: bad value');
      n += v.length;
    }
    if (n > MAX_RECORD_KEYS) throw new Error('record: too many entries');
  }
  return n;
}

/* A play-experience record: plain JSON data only (no markup characters in any string), bounded in depth and size */
function checkPlayValue(v, depth = 0, count = { n: 0 }) {
  if (++count.n > MAX_PLAY_NODES) throw new Error('play record: too big');
  if (depth > 6) throw new Error('play record: too deep');
  if (v === null || typeof v === 'boolean') return;
  if (typeof v === 'number') { if (!Number.isFinite(v) || Math.abs(v) > 1e13) throw new Error('play record: bad number'); return; }
  if (typeof v === 'string') { if (!STR_RE.test(v)) throw new Error('play record: bad text'); return; }
  if (Array.isArray(v)) { if (v.length > 500) throw new Error('play record: list too long'); v.forEach(x => checkPlayValue(x, depth + 1, count)); return; }
  if (isObj(v)) { for (const [k, x] of Object.entries(v)) { if (!okKey(k)) throw new Error('play record: bad key'); checkPlayValue(x, depth + 1, count); } return; }
  throw new Error('play record: bad value');
}

function checkPlayer(p) {
  if (!isObj(p)) throw new Error('player is not an object');
  for (const k of Object.keys(p)) if (!['id', 'name', 'avatar', 'mode', 'created', 'age', 'modeGuess', 'placedBelt'].includes(k)) throw new Error(`player: unknown field ${k.slice(0, 40)}`);
  if (!(p.placedBelt === undefined || BELT_IDS.includes(p.placedBelt))) throw new Error('player: bad placedBelt');
  if (typeof p.id !== 'string' || !ID_RE.test(p.id)) throw new Error('player: bad id');
  if (!validName(p.name)) throw new Error('player: bad Nickname');
  if (!AVATARS.includes(p.avatar)) throw new Error('player: bad avatar');
  if (!(p.mode === null || p.mode === undefined || MODES.includes(p.mode))) throw new Error('player: bad Mode');
  if (!okTime(p.created)) throw new Error('player: bad created time');
  if (!okAge(p.age)) throw new Error('player: bad Age answer');
  if (!(p.modeGuess === undefined || p.modeGuess === true)) throw new Error('player: bad modeGuess');
}

/* The whole payload, exactly as the schema says, or { ok: false, error } */
export function validatePayload(x) {
  try {
    if (!isObj(x)) throw new Error('not an object');
    for (const k of Object.keys(x)) if (!['v', 'from', 'at', 'players', 'records', 'play', 'settings', 'dropped'].includes(k)) throw new Error(`unknown key ${k.slice(0, 40)}`);
    if (x.v !== VERSION) throw new Error('unknown version');
    if (x.from !== FROM && x.from !== FROM_BACKUP) throw new Error('unknown source');
    if (!okTime(x.at)) throw new Error('bad time');
    const P = x.players;
    if (!isObj(P) || Object.keys(P).some(k => k !== 'active' && k !== 'list') || !Array.isArray(P.list)) throw new Error('bad players');
    if (P.list.length < 1 || P.list.length > MAX_PLAYERS) throw new Error('too many or no players');
    P.list.forEach(checkPlayer);
    const ids = P.list.map(p => p.id);
    if (new Set(ids).size !== ids.length) throw new Error('duplicate player id');
    if (!ids.includes(P.active)) throw new Error('active player not listed');
    if (!isObj(x.records)) throw new Error('bad records');
    for (const [id, r] of Object.entries(x.records)) { if (!ids.includes(id)) throw new Error('record for an unknown player'); checkRecord(r); }
    if (x.play !== undefined) {
      if (!isObj(x.play)) throw new Error('bad play');
      for (const [id, m] of Object.entries(x.play)) {
        if (!ids.includes(id) || !isObj(m)) throw new Error('play for an unknown player');
        const keys = Object.keys(m);
        if (keys.length > MAX_PLAY_KEYS || !keys.every(k => PLAY_KEY_RE.test(k))) throw new Error('bad play keys');
        for (const k of keys) checkPlayValue(m[k]);
      }
    }
    if (!isObj(x.settings)) throw new Error('bad settings');
    for (const [k, v] of Object.entries(x.settings)) if (!Object.hasOwn(SETTINGS, k) || !okSetting(k, v)) throw new Error(`bad setting ${k.slice(0, 40)}`);
    if (x.dropped !== undefined && !(Array.isArray(x.dropped) && x.dropped.length <= OPTIONAL.length && x.dropped.every(p => OPTIONAL.includes(p))))
      throw new Error('bad dropped list');
    return { ok: true, value: x };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}

/* ---------- packing (old origin): read what is there, keep only what passes ---------- */
const json = (get, k) => { try { return JSON.parse(get(k)); } catch (e) { return null; } };
const filterMap = (m, max) => (isObj(m) ? Object.fromEntries(Object.entries(m).filter(([k, v]) => okKey(k) && okNum(v, max))) : {});

/* One record, cleaned: known fields in range only (the same fields js/store.js clean keeps) */
export function sanitizeRecord(d) {
  if (!isObj(d)) return null;
  const out = {};
  for (const [f, max] of Object.entries(NUMS)) if (okNum(d[f], max)) out[f] = d[f];
  for (const [f, max] of Object.entries(MAPS)) if (f in d) out[f] = filterMap(d[f], max);
  if (isObj(d.skills)) out.skills = Object.fromEntries(Object.entries(d.skills).filter(([k, s]) => okKey(k) && isObj(s))
    .map(([k, s]) => [k, Object.fromEntries(Object.entries(s).filter(([f, v]) => f in SKILL && okNum(v, SKILL[f])))]));
  if (d.last === null || okKey(d.last)) out.last = d.last;
  if (d.grade === null || okKey(d.grade)) out.grade = d.grade;
  if (isObj(d.questDay) && okKey(d.questDay.day)) out.questDay = { day: d.questDay.day, base: filterMap(d.questDay.base, 1e9), done: filterMap(d.questDay.done, 4102444800000) };
  if (isObj(d.placement)) { const p = { grade: String(d.placement.grade), steps: d.placement.steps, at: d.placement.at }; if (okPlacement(p)) out.placement = p; }
  if (d.placementCard === 'done') out.placementCard = 'done';
  if (isObj(d.sky)) {
    out.sky = { lit: filterMap(d.sky.lit, 4102444800000), skipped: filterMap(d.sky.skipped, 4102444800000) };
    if (isObj(d.sky.last)) out.sky.last = Object.fromEntries(Object.entries(d.sky.last).filter(([k, a]) => okKey(k) && Array.isArray(a)).map(([k, a]) => [k, a.filter(okKey).slice(0, 50)]));
  }
  if (Array.isArray(d.sparksLog)) out.sparksLog = d.sparksLog.filter(okLog).slice(0, LOG_CAP).map(e => ({ ...e }));
  // Over the cap (never seen in practice): the least useful maps go first
  for (const f of ['seen', 'days', 'counts', 'badges']) { try { checkRecord(out); break; } catch (e) { if (/too many/.test(e.message)) out[f] = {}; else throw e; } }
  try { checkRecord(out); } catch (e) { return null; }
  return out;
}

/* Mirrors store.makeName, from a seed so a test can pin it */
export const nameFrom = (r = Math.random) => `${ADJ[Math.floor(r() * ADJ.length)]} ${NOUN[Math.floor(r() * NOUN.length)]} ${Math.floor(r() * 90) + 10}`;

/* This device's hand-off: { players, records, play, settings }, or null when there is nothing to bring.
   get(key) and keys() read storage (localStorage on the page, a Map in tests). A device last used before Players
   existed has a bare mathquest.v1 record: it is packed as Player p1, as js/store.js would convert it (never written). */
export function readDevice(get, keys, { now = Date.now(), random = Math.random } = {}) {
  let P = json(get, 'vm.players');
  const legacy = json(get, 'mathquest.v1');
  const hasLegacy = isObj(legacy) && isObj(legacy.skills);
  let list = isObj(P) && Array.isArray(P.list) ? P.list.filter(isObj) : [];
  const records = {};
  if (!list.length) {
    if (!hasLegacy) return null;
    list = [{ id: 'p1', name: nameFrom(random), avatar: 'teal', mode: null, created: now }];
    const r = sanitizeRecord(legacy); if (r) records.p1 = r;
    P = { active: 'p1' };
  }
  const seen = new Set();
  const players = [];
  for (const p of list) {
    if (typeof p.id !== 'string' || !ID_RE.test(p.id) || seen.has(p.id) || players.length >= MAX_PLAYERS) continue;
    seen.add(p.id);
    const q = { id: p.id, name: validName(p.name) ? p.name : nameFrom(random), avatar: AVATARS.includes(p.avatar) ? p.avatar : 'teal',
      mode: MODES.includes(p.mode) ? p.mode : null, created: okTime(p.created) ? p.created : now };
    if (p.age !== undefined && p.age !== null && okAge(p.age)) q.age = p.age;
    if (p.modeGuess === true) q.modeGuess = true;
    if (BELT_IDS.includes(p.placedBelt)) q.placedBelt = p.placedBelt; // Bolt's start Belt from a Placement (openspec placement)
    players.push(q); // parentOk, and any other field, stays behind
  }
  if (!players.length) return null;
  for (const p of players) {
    if (records[p.id]) continue;
    const r = sanitizeRecord(json(get, 'mathquest.v1.' + p.id));
    if (r) records[p.id] = r;
  }
  const play = {};
  for (const k of keys()) {
    const m = /^vm\.play\.(p[0-9a-z]{1,12})\.([a-z][a-z0-9-]{0,31})$/.exec(k);
    if (!m || !seen.has(m[1])) continue;
    const v = json(get, k);
    if (v === null) continue;
    try { checkPlayValue(v); } catch (e) { continue; }
    const mine = play[m[1]] ||= {};
    if (Object.keys(mine).length < MAX_PLAY_KEYS) mine[m[2]] = v;
  }
  const settings = {};
  for (const k of Object.keys(SETTINGS)) { const v = get(k); if (v !== null && v !== undefined && okSetting(k, v)) settings[k] = v; }
  const active = players.some(p => p.id === P.active) ? P.active : players[0].id;
  return { players: { active, list: players }, records, play, settings };
}

/* The payload object for a device, without the parts named in drop; from names the side that made it */
export function payloadOf(device, drop = [], at = Date.now(), from = FROM) {
  const records = {};
  for (const [id, r] of Object.entries(device.records)) {
    const c = { ...r };
    if (drop.includes('seen')) delete c.seen;
    if (drop.includes('days')) delete c.days;
    if (drop.includes('questDay')) delete c.questDay;
    if (drop.includes('skyLast') && c.sky) { c.sky = { ...c.sky }; delete c.sky.last; }
    records[id] = c;
  }
  const out = { v: VERSION, from, at, players: device.players, records };
  if (!drop.includes('play') && Object.keys(device.play || {}).length) out.play = device.play;
  out.settings = device.settings;
  if (drop.length) out.dropped = OPTIONAL.filter(p => drop.includes(p));
  return out;
}

/* How big each optional part is in a device's payload (JSON characters), to drop the biggest first */
export function partSizes(device) {
  const size = v => (v === undefined ? 0 : JSON.stringify(v).length);
  const recs = Object.values(device.records);
  return {
    play: size(device.play),
    seen: recs.reduce((n, r) => n + size(r.seen), 0),
    days: recs.reduce((n, r) => n + size(r.days), 0),
    skyLast: recs.reduce((n, r) => n + size(r.sky && r.sky.last), 0),
    questDay: recs.reduce((n, r) => n + size(r.questDay), 0),
  };
}

/* ---------- encoding: JSON, gzip, base64url ---------- */
const b64url = bytes => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export async function encode(obj) {
  const stream = new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('gzip'));
  return b64url(new Uint8Array(await new Response(stream).arrayBuffer()));
}

/* The payload object from base64url text, or throws. Reads at most MAX_JSON bytes of decompressed data. */
export async function decode(text, maxBytes = MAX_JSON) {
  if (typeof text !== 'string' || !/^[A-Za-z0-9_-]{1,}$/.test(text) || text.length > MAX_PAYLOAD) throw new Error('not a payload');
  let bin;
  try { bin = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4)); } catch (e) { throw new Error('not base64url'); }
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const parts = []; let n = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      n += value.length;
      if (n > maxBytes) { reader.cancel().catch(() => {}); throw new Error('too big'); }
      parts.push(value);
    }
  } catch (e) { throw new Error(e.message === 'too big' ? 'too big' : 'not gzip'); }
  const all = new Uint8Array(n); let o = 0;
  for (const p of parts) { all.set(p, o); o += p.length; }
  let text2;
  try { text2 = new TextDecoder('utf-8', { fatal: true }).decode(all); } catch (e) { throw new Error('not text'); }
  try { return JSON.parse(text2); } catch (e) { throw new Error('not JSON'); }
}

/* Packs a device to fit MAX_PAYLOAD, leaving out the biggest optional parts first.
   Returns { data, dropped } or { tooBig: true }. */
export async function pack(device, at = Date.now()) {
  const sizes = partSizes(device);
  const order = OPTIONAL.filter(p => sizes[p] > 0).sort((a, b) => sizes[b] - sizes[a]);
  const drop = [];
  for (;;) {
    const data = await encode(payloadOf(device, drop, at));
    if (data.length <= MAX_PAYLOAD) return { data, dropped: drop.slice() };
    if (!order.length) return { tooBig: true };
    drop.push(order.shift());
  }
}

/* The fragment for the import page */
export const fragment = (data, route) => `#v=${VERSION}&d=${data}` + (ROUTE_RE.test(route || '') ? `&r=${encodeURIComponent(route)}` : '');

/* The fragment's parts, or null. Never throws. */
export function readFragment(hash) {
  try {
    if (typeof hash !== 'string' || hash.length > MAX_PAYLOAD + 400) return null;
    const q = new URLSearchParams(hash.replace(/^#/, ''));
    const r = q.get('r');
    return { v: q.get('v'), d: q.get('d'), route: r && ROUTE_RE.test(r) ? r : '' };
  } catch (e) { return null; }
}
