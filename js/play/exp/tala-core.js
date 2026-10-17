/* Tala Lab core: the arithmetic of Konnakol, with no DOM, so node tests can check every number.
   Konnakol is the South Indian art of speaking rhythm in solkattu syllables; Carnatic tala is the cycle
   of beats it lives in. Both are living traditions (not Vedic). Here rhythm is counted, so it is math:
   gati is division, a polyrhythm meets at the least common multiple, phrases land by remainders and a
   tihai is a small equation that has to come out exactly on sam. */

/* ---------- Number helpers ---------- */
export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
export const lcm = (a, b) => (a && b ? Math.abs(a * b) / gcd(a, b) : 0);
export const lcmAll = list => list.reduce((m, x) => lcm(m, x), 1);
export const mod = (a, n) => ((a % n) + n) % n;

/* ---------- Syllables and voices ---------- */
/* Each syllable has a drum voice: thom is the deep left head of the mridangam, ta and na ring on the right
   head, di (dhi) is a pitched open stroke, ki, ka, mi and ju are soft closed strokes. */
export const VOICE = { ta: 'ta', na: 'ta', di: 'di', dhi: 'di', ki: 'ki', ka: 'ki', mi: 'ki', ju: 'ki', thom: 'thom', gi: 'ki', jho: 'thom', '': 'rest' };
export const voiceOf = s => VOICE[s] ?? 'ki';

/* Gati (also nadai): how many syllables fill one beat. The names are the five jatis. */
export const GATIS = {
  3: { n: 3, name: 'Tisra', words: ['ta', 'ki', 'ta'] },
  4: { n: 4, name: 'Chatusra', words: ['ta', 'ka', 'di', 'mi'] },
  5: { n: 5, name: 'Khanda', words: ['ta', 'di', 'ki', 'na', 'thom'] },
  7: { n: 7, name: 'Misra', words: ['ta', 'ki', 'ta', 'ta', 'ka', 'di', 'mi'] },
  9: { n: 9, name: 'Sankirna', words: ['ta', 'ka', 'di', 'mi', 'ta', 'di', 'ki', 'na', 'thom'] }
};
export const GATI_ORDER = [3, 4, 5, 7, 9];
/* Plain counting words for any group size, used when no classical name applies */
export const groupWords = n => GATIS[n]?.words || (n === 1 ? ['ta'] : n === 2 ? ['ta', 'ka'] : n === 6 ? ['ta', 'ki', 'ta', 'ta', 'ki', 'ta'] : n === 8 ? ['ta', 'ka', 'di', 'mi', 'ta', 'ka', 'ju', 'na'] : Array.from({ length: n }, (_, i) => GATIS[4].words[i % 4]));

/* A phrase of p counts that ends on a thom, as a tihai phrase usually does */
export function phrase(p) {
  if (p <= 1) return ['thom'];
  if (p < 5) return [...['ta', 'ka', 'di'].slice(0, p - 1), 'thom'];
  const out = []; let left = p - 5;
  const parts = [4, 3, 2]; /* fill the front with ta ka di mi, ta ki ta, ta ka */
  while (left > 0) { const k = parts.find(x => x <= left) || 1; out.push(...groupWords(k)); left -= k; }
  return [...out, 'ta', 'di', 'ki', 'na', 'thom'];
}

/* ---------- Timing and the scheduler ---------- */
export const secPerBeat = bpm => 60 / bpm;
/* A pattern: { len (counts per loop), perBeat (counts per beat), loop (repeat or play once), events: [{ at, voice, ... }] }.
   eventsInWindow returns the events whose time falls in [from, to), with absolute times, for a pattern
   that started at `start` (seconds on the audio clock). Each event gets its loop number `k`. */
export function eventsInWindow(pat, start, bpm, from, to) {
  const unit = secPerBeat(bpm) / pat.perBeat, span = pat.len * unit, out = [];
  if (to <= from || !pat.events.length) return out;
  const k0 = pat.loop ? Math.max(0, Math.floor((from - start) / span) - 1) : 0;
  const k1 = pat.loop ? Math.floor((to - start) / span) : 0;
  for (let k = k0; k <= k1; k++) {
    for (const e of pat.events) {
      const time = start + (k * pat.len + e.at) * unit;
      if (time >= from - 1e-9 && time < to - 1e-9) out.push({ ...e, k, time });
    }
  }
  return out.sort((a, b) => a.time - b.time);
}
/* The look-ahead plan: on each tick at audio time `now`, schedule everything up to now + ahead that has
   not been scheduled yet. Returns the new horizon and the window to schedule. Never schedules in the past
   by more than `grace` (so a stalled tab skips stale notes instead of playing a burst). */
export function plan(horizon, now, ahead = 0.12, grace = 0.05) {
  const from = Math.max(horizon, now - grace), to = now + ahead;
  return { from, to: Math.max(from, to), horizon: Math.max(horizon, to) };
}

/* Where a tap at `time` falls against a grid of pulses every `step` seconds from `start`.
   Returns the nearest pulse index and the signed error in milliseconds (positive is late). */
export function nearestPulse(time, start, step) {
  const i = Math.round((time - start) / step);
  return { index: i, ms: Math.round(((time - (start + i * step)) * 1000) * 10) / 10 };
}
/* Kind words for a timing error. Never harsh: everyone drifts. */
export function feel(ms, lv = 'challenger') {
  const a = Math.abs(ms), side = ms > 0 ? 'late' : 'early';
  if (a <= 25) return { grade: 3, text: lv === 'explorer' ? 'Right on the beat!' : 'Locked in' };
  if (a <= 60) return { grade: 2, text: lv === 'explorer' ? 'So close!' : `A hair ${side}` };
  if (a <= 120) return { grade: 1, text: lv === 'explorer' ? (ms > 0 ? 'A bit slow' : 'A bit quick') : `A little ${side}` };
  return { grade: 0, text: lv === 'explorer' ? 'Listen, then tap' : `Find the pulse (${side})` };
}
/* Mean absolute error of a list of taps, rounded to whole milliseconds */
export const meanAbs = list => (list.length ? Math.round(list.reduce((s, x) => s + Math.abs(x), 0) / list.length) : 0);

/* ---------- Gati ---------- */
/* One loop of `beats` beats in gati n: a clap on each beat, syllables on each count, the first of each
   group stressed. */
/* `n` is one gati for every beat, or a list with a gati per beat (a journey through the gatis). With a
   list, one beat is split into lcm(list) units so every gati sits on whole units. */
export function gatiPattern(n, beats = 4) {
  const seq = Array.isArray(n) ? n : Array.from({ length: beats }, () => n);
  const U = lcmAll(seq), events = [];
  seq.forEach((g, b) => {
    const words = groupWords(g), step = U / g;
    events.push({ at: b * U, voice: 'clap', beat: b, n: g, track: 'beat' });
    words.forEach((w, i) => events.push({ at: b * U + i * step, voice: voiceOf(w), word: w, beat: b, n: g, i, accent: i === 0, track: 'gati' }));
  });
  return { len: seq.length * U, perBeat: U, loop: true, events };
}
/* The gap between syllables in ms, and what fraction of a beat it is */
export const countMs = (bpm, n) => Math.round((60000 / bpm / n) * 10) / 10;

/* ---------- Polyrhythm necklace ---------- */
/* Counting 1, 2, 3, ... rhythm a strikes every a counts and rhythm b every b counts. They meet at
   multiples of lcm(a, b). firstMeet is the first count after 0 where all of them strike together. */
export const firstMeet = list => lcmAll(list);
export const strikes = (a, upTo) => Array.from({ length: Math.floor(upTo / a) }, (_, i) => (i + 1) * a);
/* Every count 1..L, and which rhythms strike there */
export function necklace(list) {
  const L = lcmAll(list);
  return Array.from({ length: L }, (_, i) => { const c = i + 1; return { count: c, hits: list.map((a, j) => (c % a === 0 ? j : -1)).filter(j => j >= 0) }; });
}
/* The pattern: one count is one pulse; a soft ki on every count, each rhythm's voice on its strikes, and
   a bloom where all strike together */
export function necklacePattern(list) {
  const L = lcmAll(list), V = ['ta', 'thom', 'di'], events = [];
  for (let c = 0; c < L; c++) {
    const hits = list.map((a, j) => (c % a === 0 ? j : -1)).filter(j => j >= 0);
    events.push({ at: c, voice: hits.length ? 'none' : 'ki', count: c, track: 'count', soft: true });
    hits.forEach(j => events.push({ at: c, voice: V[j], count: c, rhythm: j, track: 'r' + j }));
    if (c === 0) events.push({ at: c, voice: 'bloom', count: c, track: 'meet' });
  }
  return { len: L, perBeat: 2, loop: true, events };
}
/* Why the meeting point is where it is, in words */
export function meetWhy(list) {
  const L = lcmAll(list), prod = list.reduce((p, x) => p * x, 1);
  if (list.length === 2) {
    const [a, b] = list, g = gcd(a, b);
    if (g === 1) return `${a} and ${b} share no factor, so they meet at ${a} × ${b} = ${L}.`;
    if (a % b === 0 || b % a === 0) return `${Math.min(a, b)} fits inside ${Math.max(a, b)}, so they meet at ${L}.`;
    return `${a} and ${b} share a factor of ${g}, so they meet at ${a} × ${b} ÷ ${g} = ${L}, sooner than ${prod}.`;
  }
  return `The least common multiple of ${list.join(', ')} is ${L}${L < prod ? `, sooner than ${list.join(' × ')} = ${prod}` : ''}.`;
}

/* ---------- Tala cycles ---------- */
/* Hand gestures: clap, wave (palm turned) and finger counts (pinky, ring, middle) */
export const TALAS = {
  adi: { id: 'adi', name: 'Adi tala', beats: 8, parts: [4, 2, 2], hands: ['clap', 'pinky', 'ring', 'middle', 'clap', 'wave', 'clap', 'wave'], note: 'laghu of 4 (a clap and three finger counts), then two drutams (a clap and a wave each)' },
  rupaka: { id: 'rupaka', name: 'Rupaka tala', beats: 6, parts: [2, 4], hands: ['clap', 'wave', 'clap', 'pinky', 'ring', 'middle'], note: 'a drutam (clap, wave), then a laghu of 4' },
  misra: { id: 'misra', name: 'Misra chapu', beats: 7, parts: [3, 2, 2], hands: ['wave', 'count', 'count', 'clap', 'count', 'clap', 'count'], note: 'seven beats, often counted 3 + 2 + 2' },
  khanda: { id: 'khanda', name: 'Khanda chapu', beats: 5, parts: [2, 3], hands: ['clap', 'count', 'clap', 'clap', 'count'], note: 'five beats, counted 2 + 3' }
};
/* Phrase k (1-based) of length p starts on beat ((k - 1) p mod n) + 1 of an n-beat cycle */
export const landing = (p, n, k) => mod((k - 1) * p, n) + 1;
/* Every start until the phrases are back on sam: n / gcd(n, p) phrases visit n / gcd(n, p) beats */
export function landings(p, n) { const m = n / gcd(n, p); return Array.from({ length: m }, (_, i) => landing(p, n, i + 1)); }
export const phrasesToSam = (p, n) => lcm(p, n) / p;
/* The star the landings draw: {n/p} as a polygon (Schlaefli symbol), reduced */
export function star(p, n) { const g = gcd(n, p); return { points: n / g, step: mod(p, n) / g, polygons: g }; }
/* A tala pattern with the hand gestures, `perBeat` counts per beat */
export function talaPattern(tala, perBeat = 1) {
  const events = [];
  for (let b = 0; b < tala.beats; b++) {
    const h = tala.hands[b];
    events.push({ at: b * perBeat, voice: b === 0 ? 'sam' : h === 'clap' ? 'clap' : 'wave', beat: b, hand: h, track: 'tala' });
  }
  return { len: tala.beats * perBeat, perBeat, loop: true, events };
}

/* ---------- Tihai ---------- */
/* A tihai plays a phrase of p counts three times with a gap of g counts between, and its very last
   syllable lands on sam. Starting `start` counts into a cycle of C counts, the distance to the next sam
   is D = C - start (a whole cycle when start is 0). The last syllable begins at start + 3p + 2g - 1, so
   it lands on sam exactly when 3p + 2g = D + 1. */
export const toSam = (C, start) => (start === 0 ? C : C - mod(start, C));
export const tihaiSpan = (p, g) => 3 * p + 2 * g;
/* Signed miss in counts: 0 lands on sam, negative is early, positive is late */
export const tihaiMiss = (C, start, p, g) => tihaiSpan(p, g) - 1 - toSam(C, start);
/* Every (p, g) with p >= minP and g >= 0 that lands */
export function tihaiSolutions(C, start, minP = 2) {
  const need = toSam(C, start) + 1, out = [];
  for (let p = minP; 3 * p <= need; p++) { const r = need - 3 * p; if (r % 2 === 0) out.push({ p, g: r / 2 }); }
  return out;
}
/* The tihai as timed counts from its start: phrase syllables and gaps */
export function tihaiCounts(p, g) {
  const ph = phrase(p), out = [];
  for (let r = 0; r < 3; r++) {
    ph.forEach((w, i) => out.push({ word: w, rep: r, i, last: r === 2 && i === p - 1 }));
    if (r < 2) for (let i = 0; i < g; i++) out.push({ word: '', rep: r, gap: true });
  }
  return out;
}
/* The full pattern for playing a tihai puzzle: the tala claps for one cycle, the tihai from `start`, and
   the landing on the next sam. Counts per beat = gati. Plays once. */
export function tihaiPattern({ C, start, p, g, gati, tala = TALAS.adi }) {
  const events = [], counts = tihaiCounts(p, g), first = start, end = start + counts.length;
  const total = Math.max(C, end) + 1;
  for (let c = 0; c < total; c += gati) { const b = (c / gati) % tala.beats; events.push({ at: c, voice: b === 0 ? 'sam' : tala.hands[b] === 'clap' ? 'clap' : 'wave', beat: b, track: 'tala', soft: true }); }
  counts.forEach((x, i) => { if (x.word) events.push({ at: first + i, voice: voiceOf(x.word), word: x.word, rep: x.rep, last: x.last, idx: i, track: 'tihai' }); else events.push({ at: first + i, voice: 'none', idx: i, gap: true, track: 'tihai' }); });
  const landAt = first + counts.length - 1;
  events.push({ at: landAt, voice: tihaiMiss(C, start, p, g) === 0 ? 'bloom' : 'none', track: 'land', miss: tihaiMiss(C, start, p, g) });
  return { len: total, perBeat: gati, loop: false, events, landAt };
}
/* Puzzles, gentle to hard. C counts per cycle (Adi tala: 8 beats times the gati), start in counts, `fix`
   names a value that is given. */
export const TIHAI_PUZZLES = [
  { id: 't1', gati: 1, C: 8, start: 0, fix: { g: 0 }, say: 'Adi tala, one count per beat. No gaps. How long is the phrase?' },
  { id: 't2', gati: 2, C: 16, start: 0, fix: { p: 5 }, say: 'Two counts per beat now. The phrase is 5. How big are the gaps?' },
  { id: 't3', gati: 2, C: 16, start: 6, fix: null, say: 'Start late, on beat 4. Find a phrase and a gap that still land.' },
  { id: 't4', gati: 4, C: 32, start: 0, fix: null, say: 'Chatusra gati: 32 counts. Many tihais fit. Find one.' },
  { id: 't5', gati: 3, C: 24, start: 0, fix: null, say: 'Tisra gati: three counts per beat, 24 in the cycle.' },
  { id: 't6', gati: 4, C: 32, start: 8, fix: null, say: 'Begin on beat 3 of Adi tala in chatusra gati.' },
  { id: 't7', gati: 5, C: 40, start: 0, fix: null, say: 'Khanda gati: five counts per beat, 40 in the cycle.' },
  { id: 't8', gati: 7, C: 56, start: 21, fix: null, say: 'Misra gati, starting on beat 4. A long one.' }
];
/* Where the steppers start for a puzzle: the given value, and a guess for the rest that is never already the
   answer (t2 gives p = 5 in 16 counts, where the usual g = 1 would land before the player did anything) */
export function tihaiStart(z, lv) {
  let p = z.fix?.p ?? (lv === 'explorer' ? 2 : 4), g = z.fix?.g ?? 1;
  const free = ['g', 'p'].filter(k => !(z.fix && k in z.fix));
  for (let d = 1; tihaiMiss(z.C, z.start, p, g) === 0 && free.length && d < 40; d++) {
    const k = free[0], base = k === 'g' ? g : p, lo = k === 'g' ? 0 : 2, v = base - d >= lo ? base - d : base + d;
    if (tihaiMiss(z.C, z.start, k === 'p' ? v : p, k === 'g' ? v : g) !== 0) { if (k === 'g') g = v; else p = v; }
  }
  return { p, g };
}
export const puzzlesFor = lv => (lv === 'explorer' ? TIHAI_PUZZLES.slice(0, 3) : lv === 'challenger' ? TIHAI_PUZZLES.slice(0, 6) : TIHAI_PUZZLES);

/* ---------- Composer ---------- */
export const PALETTE = ['', 'ta', 'ka', 'ki', 'di', 'mi', 'na', 'thom'];
export const PRESETS = [
  { name: 'Ta ka di mi', n: 8, gati: 4, s: 'ta ka di mi ta ka di mi' },
  { name: 'Ta ki ta', n: 12, gati: 3, s: 'ta ki ta ta ki ta ta ki ta ta ki ta' },
  { name: '3 + 3 + 2', n: 8, gati: 4, s: 'ta ki ta ta ki ta ta ka' },
  { name: 'Ta di ki na thom', n: 10, gati: 5, s: 'ta di ki na thom ta di ki na thom' },
  { name: 'Thom and rest', n: 16, gati: 4, s: 'thom _ ta ka _ ka thom _ ta _ ki ta thom _ di _' }
];
export const parseSeq = s => s.split(/\s+/).filter(Boolean).map(w => (w === '_' ? '' : w));
export const COMPOSE_LIMITS = { n: [3, 32], gati: [1, 9], bpm: [40, 160] };
const clamp = (v, [lo, hi], d) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);
/* A clean composition from anything (a link someone pasted, an old save) */
export function cleanComp(c = {}) {
  const n = clamp(+c.n, COMPOSE_LIMITS.n, 8);
  const seq = Array.from({ length: n }, (_, i) => { const w = Array.isArray(c.seq) ? c.seq[i] : ''; return PALETTE.includes(w) ? w : ''; });
  return { n, gati: clamp(+c.gati, COMPOSE_LIMITS.gati, 4), bpm: clamp(+c.bpm, COMPOSE_LIMITS.bpm, 72), seq };
}
/* Compact text form: "v1.n.gati.bpm.digits" (digit = palette index), base64url wrapped */
export function encodeComp(c, b64) { const x = cleanComp(c); return b64.enc(`v1.${x.n}.${x.gati}.${x.bpm}.${x.seq.map(w => PALETTE.indexOf(w)).join('')}`); }
export function decodeComp(code, b64) {
  try {
    const [v, n, gati, bpm, digits] = b64.dec(code).split('.');
    if (v !== 'v1' || !/^\d*$/.test(digits || '')) return null;
    return cleanComp({ n: +n, gati: +gati, bpm: +bpm, seq: [...digits].map(d => PALETTE[+d] ?? '') });
  } catch (e) { return null; }
}
export function compPattern(c) {
  const x = cleanComp(c), events = [];
  x.seq.forEach((w, i) => { events.push({ at: i, voice: w ? voiceOf(w) : 'none', word: w, slot: i, accent: i % x.gati === 0, track: 'comp' }); });
  for (let i = 0; i < x.n; i += x.gati) events.push({ at: i, voice: 'tick', slot: i, track: 'beat', soft: true });
  return { len: x.n, perBeat: x.gati, loop: true, events };
}

/* ---------- Microphone claps: simple onset detection on loudness ---------- */
/* feed(level, ms) returns true when a clap starts: the level jumps above both a floor and `ratio` times
   the recent average, and no clap was heard in the last `refractory` ms. Runs on this device only. */
export function onsetDetector({ floor = 0.06, ratio = 3, refractory = 140, decay = 0.92 } = {}) {
  let avg = 0, last = -Infinity, prev = 0;
  return (level, ms) => {
    const rising = level > prev; prev = level;
    const hit = rising && level > floor && level > avg * ratio && ms - last > refractory;
    avg = avg * decay + level * (1 - decay);
    if (hit) last = ms;
    return hit;
  };
}
export const rms = buf => { let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return Math.sqrt(s / (buf.length || 1)); };
