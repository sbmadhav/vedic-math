/* Studio voice planning, shared by the app (js/voice.js) and the recording tools (tools/voice/).
   One normalized line (voice.js normalize()) is said either from a whole recorded file, named by lineHash(),
   or from short clips: numbers 0 to 99 (one clip each, in a mid-sentence and an end-of-sentence take), the
   scale words hundred, thousand, million, point and negative, and the word frames between numbers.
   Nothing here touches the network or the DOM, so Node and the browser get the same answers. */

/* cyrb53: a small, fast, synchronous 53-bit string hash (public domain). Not for security: it only names files. */
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
/* The file name of a whole line: 14 hex characters over "voice|words" */
export const lineHash = (voice, words) => cyrb53(`${voice}|${words}`).toString(16).padStart(14, '0');
/* The first 32 bits of a line hash, as stored in the sorted line set (l/set.<hash>.bin) */
export const lineKey = hash => parseInt(hash.slice(0, 8), 16) >>> 0;
/* Is this hash in a sorted Uint32Array line set? A rare false yes only costs a 404 and then the clips. */
export function inLineSet(set, hash) {
  const k = lineKey(hash); let lo = 0, hi = set.length - 1;
  while (lo <= hi) { const mid = (lo + hi) >> 1, v = set[mid]; if (v === k) return true; if (v < k) lo = mid + 1; else hi = mid - 1; }
  return false;
}

/* Number to clip ids: 0 to 99 are one clip each; then hundred, thousand, million, point and the digits after the point.
   last: the number ends a sentence, so its last clip uses the falling take (the id ends with a dot). */
export function numClips(s, last = false) {
  const out = []; const [int, dec] = s.replace('-', '').split('.'); if (s.startsWith('-')) out.push('w:negative');
  const n = +int;
  const under1000 = v => { const r = []; if (v >= 100) { r.push('n:' + Math.floor(v / 100), 'w:hundred'); v %= 100; if (v) r.push('n:' + v); } else r.push('n:' + v); return r; };
  if (n >= 1e6) { out.push(...under1000(Math.floor(n / 1e6)), 'w:million'); const rest = n % 1e6; if (rest >= 1000) out.push(...under1000(Math.floor(rest / 1000)), 'w:thousand'); if (rest % 1000) out.push(...under1000(rest % 1000)); }
  else if (n >= 1000) { out.push(...under1000(Math.floor(n / 1000)), 'w:thousand'); if (n % 1000) out.push(...under1000(n % 1000)); }
  else out.push(...under1000(n));
  if (dec !== undefined) { out.push('w:point'); for (const c of dec) out.push('n:' + c); }
  if (last) out[out.length - 1] += '.';
  return out;
}
/* A normalized line as parts: frames (runs of words), numbers, and pauses after punctuation that follows a number */
export function splitParts(text) {
  const toks = String(text).split(' ').filter(Boolean), parts = []; let cur = [];
  const flush = () => { if (cur.length) parts.push({ f: cur.join(' ') }); cur = []; };
  toks.forEach((tk, i) => {
    const m = tk.match(/^(-?\d+(?:\.\d+)?)([,.?!:]?)$/);
    if (m && Math.abs(+m[1]) < 1e9) {
      flush();
      parts.push({ n: m[1], last: (!!m[2] && m[2] !== ',') || i === toks.length - 1 });
      if (m[2]) parts.push({ pause: m[2] === ',' ? 'short' : 'long' });
    } else cur.push(tk);
  });
  flush();
  return parts;
}
/* The clips that say a line, in order: [{ clip: id } | { pause: 'short' | 'long' }]. Frame ids start with f: */
export const planLine = text => splitParts(text).flatMap(p => (p.pause ? [{ pause: p.pause }] : p.n !== undefined ? numClips(p.n, p.last).map(clip => ({ clip })) : [{ clip: 'f:' + p.f }]));

/* What the recording tool says for a clip id: "n:73" is "seventy three," (mid take) and "n:73." is "seventy three." */
const ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const word = n => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''));
export function clipText(id) {
  if (id.startsWith('f:')) return id.slice(2);
  const end = id.endsWith('.') ? '.' : ',', [k, v] = id.replace(/\.$/, '').split(':');
  return (k === 'n' ? word(+v) : v) + end;
}
/* Every number and scale-word clip, in both takes */
export const NUMBER_CLIPS = [
  ...Array.from({ length: 100 }, (_, n) => [`n:${n}`, `n:${n}.`]).flat(),
  ...['hundred', 'thousand', 'million', 'point', 'negative'].flatMap(w => [`w:${w}`, `w:${w}.`])
];
