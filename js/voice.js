/* Read-aloud voice for Vedic Math. No API keys, nothing leaves the browser.
   Tier 1 (default and fallback): the browser's built-in Web Speech voice, ranked for quality and tuned for kids.
   Tier 2 (opt-in): Kokoro, a small neural voice that runs in a Web Worker. It downloads only after the
   player turns it on in Me settings; on later visits it loads the first time something is read aloud.
   Any error falls back to Tier 1. Speech only ever follows a tap. */

/* ---------- Math-aware normalization: question HTML to natural speech ----------
   normalize(html) is what the read-aloud voice says for a question, hint or line. The rules are general
   (openspec read-aloud-wording); test/voice-normalize.test.mjs holds a table of inputs and the words expected.
   A question can carry an optional `say` (HTML, normalized the same way) when its screen text depends on a
   picture or needs different words heard; callers speak `p.say || p.q` (fx.speakQuestion). */
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
  'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const ORD = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth',
  'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth'];
const cardinal = n => (n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
  : ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + cardinal(n % 100) : ''));
/* 1 to 999 as an ordinal word: 3 third, 12 twelfth, 21 twenty first, 40 fortieth, 100 one hundredth */
export function ordinalWord(n) {
  n = +n; if (n === 1000) return 'thousandth';
  if (!Number.isInteger(n) || n < 0 || n > 999) return null;
  if (n < 20) return ORD[n];
  if (n < 100) return n % 10 ? `${TENS[Math.floor(n / 10)]} ${ORD[n % 10]}` : TENS[n / 10].replace(/y$/, 'ieth');
  if (n === 100) return 'hundredth';
  return n % 100 ? `${cardinal(n - (n % 100))} ${ordinalWord(n % 100)}` : `${cardinal(n)}th`;
}
/* The name of a denominator: 2 half or halves, otherwise the ordinal (thirds, fourths, twelfths) */
export const denomWord = (d, plural) => (d === 2 ? (plural ? 'halves' : 'half') : ordinalWord(d) + (plural ? 's' : ''));
const named = d => (d >= 2 && d <= 100) || d === 1000; // denominators said as words: thirds to hundredths, and thousandths
const ENT = {
  times: '×', divide: '÷', minus: '−', middot: '·', le: '≤', ge: '≥', lt: '<', gt: '>', pi: 'π', plusmn: '±', asymp: '≈',
  deg: '°', rarr: '→', larr: '←', lang: '⟨', rang: '⟩', radic: '√', prime: '′', int: '∫', amp: '&', quot: '"', apos: "'",
  nbsp: ' ', thinsp: ' ', hairsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', frac13: '⅓', frac23: '⅔', infin: '∞', ne: '≠', hellip: '…', theta: 'θ'
};
const decodeEntities = s => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z0-9]+);/gi, (m, k) => (k in ENT ? ENT[k] : ' '));
const stripTags = s => s.replace(/<[^>]+>/g, '');
const MARK = '\u0001'; // ends a spoken group ("x plus 3,"); removed before the words are returned
const SIMPLE = /^\s*[−-]?\s*(?:\d+(?:\.\d+)?|[A-Za-zθπ])\s*$/; // one number, a negative number or one letter
const ONE_TERM = /^\s*[−-]?\s*(?:\d+(?:\.\d+)?)?\s*[A-Za-zθπ]?\s*$/; // also 2x, -3y
/* A fraction of whole numbers in words: two thirds, seven twelfths, 40 hundredths, negative one half; 3 over 13 */
function fracName(n, d) {
  const m = n.match(/^(?:&minus;|−|-)?\s*(\d+)$/), dd = /^\d+$/.test(d) ? +d : 0;
  if (!m || !dd) return null;
  const a = +m[1], sign = m[0] !== m[1] ? 'negative ' : '';
  if (a >= 1 && named(dd)) return `${sign}${a <= 10 ? ONES[a] : a} ${denomWord(dd, a !== 1)}`;
  return `${sign}${a} over ${dd}`;
}
const FW = '\u0002', FE = '\u0003'; // around a fraction already in words, so brackets treat it as one term
function fracWords(n, d) {
  n = n.trim(); d = d.trim();
  if (n === '?') return `what over ${d}`;
  const w = fracName(n, d); if (w) return FW + w + FE;
  const big = x => !ONE_TERM.test(decodeEntities(x).replace(/\^\{[^{}]*\}/g, ''));
  if (big(d)) return big(n) ? ` ${n}, all over ${d}, ${MARK}` : ` ${n} over, ${d}, ${MARK}`;
  return big(n) ? ` ${n}, over ${d}, ${MARK}` : ` ${n} over ${d} `;
}
/* Function names that read "of" before their argument: f(x) f of x, F(x), p(0), sin(30°) sine of 30 degrees */
const FN_LETTER = /(^|[^A-Za-z])([fghpqFGHPQ])\s*(′*)\s*(\^\{\s*[−-]\s*1\s*\})?\s*$/;
const FN_WORD = /\b(sin|cos|tan|log|ln)\s*$/;
const FN_NAME = { sin: 'sine of', cos: 'cosine of', tan: 'tangent of', log: 'log of', ln: 'natural log of' };
const MATH_WORDS = /\b(sub|sin|cos|tan|log|ln|of|pi|sqrt)\b/g;
const isProse = c => /[A-Za-z]{3,}/.test(c.replace(MATH_WORDS, ''));
const operandEnd = pre => /(?:\d|[}′]|(?:^|[^A-Za-z])[A-Za-zθπ])\s*$/.test(pre) || pre.trimEnd().endsWith(MARK);
/* One innermost (...) group, read by what it is: a function argument, an aside, a point, one term, or a group of terms.
   A group of terms is said with a comma pause after it, and before it when it follows a number or an operator:
   2(x + 3) "2 times, x plus 3,"; (x − 7)(x − 8) "x minus 7, times x minus 8,"; (4x + 3)⁴ "4 x plus 3, all to the power of 4" */
/* What comes before a group of terms: "times," after a number or letter, "times" after another group, a pause after an operator */
const lead = pre => {
  const p = pre.trimEnd();
  if (p.endsWith(MARK)) return ' times ';
  if (operandEnd(pre)) return ' times, ';
  if (/[×·]$/.test(p) && p.slice(0, -1).trimEnd().endsWith(MARK)) return ' '; // (a)·(b) reads like (a)(b)
  if (/\S\s*[×·÷+−-]$/.test(p)) return ', ';
  return ' ';
};
function group(pre, c, post) {
  const t = c.replace(/\u0002[^\u0003]*\u0003/g, '1'); // what the brackets hold, with a worded fraction as one number
  const tail = c.trim().endsWith(',') ? '' : ',', simple = SIMPLE.test(t);
  let m = pre.match(FN_LETTER);
  if (m) {
    const name = `${m[2]}${m[3] ? ' prime'.repeat(m[3].length) : ''}${m[4] ? ' inverse' : ''}`;
    return [pre.slice(0, pre.length - m[0].length) + m[1] + name + ' of ', simple || ONE_TERM.test(t) ? ` ${c} ` : ` ${c}${tail} ${MARK} `];
  }
  if ((m = pre.match(FN_WORD))) return [pre.slice(0, pre.length - m[0].length) + FN_NAME[m[1]] + ' ', simple ? ` ${c} ` : ` ${c}${tail} ${MARK} `];
  if (/√\s*$/.test(pre)) return [pre.replace(/√\s*$/, ' the square root of '), simple ? ` ${c} ` : ` ${c}${tail} ${MARK} `];
  if (isProse(t)) {
    c = c.trim();
    if (/[.!?]$/.test(c)) return [/[.!?]\s*$/.test(pre) ? pre : pre.trimEnd() + '.', ` ${c} `];
    if (/,/.test(c)) return [pre.trimEnd() + '.', ` ${c}. `]; // an aside that is a list is its own sentence
    if (/\?\s*$/.test(pre) && !/\d/.test(c) && c.split(/\s+/).length <= 3) return [pre.replace(/\?\s*$/, ''), ` in ${c}? `];
    return [pre.trimEnd(), `, ${c}, ${MARK} `];
  }
  if (/^\s*[−-]?\s*[\w.]+\s*(?:,\s*[−-]?\s*[\w.]+\s*){1,2}$/.test(t)) return [pre, `${/\bpoint\s*$/i.test(pre) ? '' : ' the point '} ${c}, ${MARK} `];
  if (simple) {
    if (/^\s*\^/.test(post)) return [pre, lead(pre) + (/[A-Za-z]/.test(t) && !/[−-]/.test(t) ? c : `${c}, ${MARK}`)];
    if (/[A-Za-z]{2,}\s*$/.test(pre) && /[A-Za-z]/.test(t)) return [pre.trimEnd(), `, ${c.trim()}, ${MARK} `];
    return [pre, (operandEnd(pre) ? ' times ' : ' ') + c + ' '];
  }
  return [pre, lead(pre) + `${c}${tail} ${MARK}` + (/^\s*(?:[\d√(]|[A-Za-z](?![A-Za-z]))/.test(post) ? ' times ' : ' ')];
}
function groups(s) {
  for (let guard = 0; guard < 400; guard++) {
    const m = s.match(/\(([^()]*)\)/); if (!m) break;
    const pre = s.slice(0, m.index), post = s.slice(m.index + m[0].length);
    const [p, mid] = group(pre, m[1], post);
    s = p + mid + post;
  }
  return s.replace(/[()]/g, ' ');
}
const power = e => {
  e = e.trim();
  if (e === '2') return ' squared ';
  if (e === '3') return ' cubed ';
  if (e === '?') return ' to the power of what ';
  return ` to the power of ${e}, ${MARK} `;
};
const money = (d, c) => {
  const dollars = +d, cents = c === undefined ? 0 : +c.padEnd(2, '0');
  const dw = `${d} ${dollars === 1 ? 'dollar' : 'dollars'}`, cw = `${cents} ${cents === 1 ? 'cent' : 'cents'}`;
  return !cents ? dw : !dollars ? cw : `${dw} and ${cw}`;
};
export function normalize(input) {
  let s = String(input ?? '');
  // Structure first, while the tags still say what things are
  s = s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?(?:p|div|li|tr|h\d)\b[^>]*>/gi, '\n');
  s = s.replace(/<span class="mx"><span>([\s\S]*?)<\/span><span>([\s\S]*?)<\/span><span>([\s\S]*?)<\/span><span>([\s\S]*?)<\/span><\/span>/g,
    ' the matrix with top row $1, $2, and bottom row $3, $4, ' + MARK + ' ');
  s = s.replace(/&int;\s*<sub>([\s\S]*?)<\/sub>\s*<sup>([\s\S]*?)<\/sup>/g, ' the integral from $1 to $2 of ');
  s = s.replace(/lim\s*<sub>([\s\S]*?)(?:&rarr;|→)([\s\S]*?)<\/sub>/g, ' the limit as $1 approaches $2 of ');
  s = s.replace(/log\s*<sub>([\s\S]*?)<\/sub>/g, ' log base $1 of ');
  s = s.replace(/<sup>\s*3\s*<\/sup>\s*(?:&radic;|√)/g, ' the cube root of ');
  s = s.replace(/<sup>([\s\S]*?)<\/sup>/g, (_, e) => `^{${stripTags(e)}}`);
  s = s.replace(/[²³]/g, c => `^{${c === '²' ? 2 : 3}}`).replace(/⁻¹/g, '^{−1}');
  s = s.replace(/<sub>([\s\S]*?)<\/sub>/g, ' sub $1 ').replace(/[₀-₉]/g, c => ` sub ${c.charCodeAt(0) - 8320} `);
  s = s.replace(/(\d)\s*(?:&#8202;| )?\s*(<span class="fr">)/g, '$1 and $2'); // mixed numbers: 2 and 3 fourths
  s = s.replace(/<span class="fr"><span>([\s\S]*?)<\/span><span>([\s\S]*?)<\/span><\/span>/g, (_, n, d) => ' ' + fracWords(stripTags(n), stripTags(d)) + ' ');
  s = s.replace(/<\/span>\s*<span[^>]*>/g, ', ');
  s = stripTags(s); // inline tags (b, i, span) join their neighbours: "<b>18</b>?" is "18?"
  s = decodeEntities(s);
  s = s.replace(/[   ]/g, ' ');
  s = s.replace(/:[ \t]*\n\s*/g, ': ').replace(/\s*\n\s*/g, '. ');
  // Words written with digits
  s = s.replace(/(\d)(?:,(\d{3}))+(?!\d)/g, m => m.replace(/,/g, '')); // 10,000 to 10000
  s = s.replace(/\b(\d+)ths\b/g, (m, d) => (+d >= 2 && +d <= 999 ? denomWord(+d, true) : m)); // "the 12ths" to "the twelfths"
  s = s.replace(/\b(\d+)(?:st|nd|rd|th)\b/g, (m, n) => ordinalWord(n) || m);
  s = s.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h, mm) => (mm === '00' ? `${+h} o'clock` : mm[0] === '0' ? `${+h} oh ${+mm}` : `${+h} ${mm}`));
  s = s.replace(/\b(\d+)-(\d+)-(\d+)\b/g, '$1 $2 $3'); // a 45-45-90 triangle
  s = s.replace(/\bType\b[^.?!]*?\d\/\d/g, m => m.replace(/(\d)\/(\d)/g, '$1 slash $2')); // what to type, said as typed
  // Ellipses
  s = s.replace(/(\d)\.\s*(?:…|\.{3})/g, '$1 point, and so on');
  s = s.replace(/\+\s*(?:…|\.{3})\s*\+/g, ', and so on, up to ');
  s = s.replace(/[+,]\s*(?:…|\.{3})/g, ', and so on');
  s = s.replace(/=\s*(?:…|\.{3})/g, '= ');
  s = s.replace(/\band\s*(?:…|\.{3})/g, 'and what, and so on');
  s = s.replace(/\s*(?:…|\.{3})/g, ', and so on,');
  s = s.replace(/and so on,?\s+(?=[A-Z])/g, 'and so on. ');
  // Brackets: function arguments, asides, points, single terms and quantities; then powers and roots
  s = s.replace(/\|([^|]+)\|/g, (_, c) => ` the absolute value of ${SIMPLE.test(c) ? c : `${c}, ${MARK}`} `);
  s = groups(s);
  s = s.replace(/\bdot product\s*⟨([^⟩]*)⟩\s*·\s*⟨([^⟩]*)⟩/g, `dot product of the vector $1, ${MARK} and the vector $2, ${MARK} `);
  s = s.replace(/\bvector\s*⟨([^⟩]*)⟩/g, `vector $1, ${MARK} `).replace(/⟨([^⟩]*)⟩/g, ` the vector $1, ${MARK} `);
  s = s.replace(new RegExp(`(${MARK}\\s*)\\^\\{([^{}]*)\\}`, 'g'), (_, m, e) => `${m} all ${power(e)}, ${MARK} `); // x plus 3, all squared, ...
  s = s.replace(/\^\{([^{}]*)\}/g, (_, e) => power(e));
  s = s.replace(/√\s*/g, ' the square root of ');
  s = s.replace(/½/g, ' one half ').replace(/¼/g, ' one fourth ').replace(/¾/g, ' three fourths ').replace(/⅓/g, ' one third ').replace(/⅔/g, ' two thirds ');
  s = s.replace(/[□▢☐◻]/g, ' blank ');
  s = s.replace(/′/g, ' prime ');
  s = s.replace(/\b(sin|cos|tan)\b(?=\s*[=,.]|\s*$)/g, m => ({ sin: 'sine', cos: 'cosine', tan: 'tangent' })[m]);
  s = s.replace(/\bd([xt])\b/g, 'd $1'); // dx
  s = s.replace(/π\s*([b-df-hj-np-tv-z]{2,3})\b/g, (_, v) => `π ${v.split('').join(' ')}`); // 2πrh: pi r h
  // Negative numbers: a minus with nothing to subtract from
  const NEG = new RegExp(`(^\\s*|[=+×÷·,:;≤≥<>±\\[−]\\s*|[.!?]\\s+|\\b(?!(?:squared|cubed|pi|prime|inverse|infinity)\\b)[A-Za-z]{2,}\\s+)[−-]\\s*(?=[\\d(a-zA-Z√π\\u0002])`, 'g');
  s = s.replace(NEG, '$1negative ').replace(NEG, '$1negative ');
  s = s.replace(/\bnegative\s+negative\b/g, 'the opposite of negative');
  s = s.replace(/(\d)([a-z])(?![a-z])/gi, '$1 $2'); // 5x to 5 x
  // Operators and relations
  s = s.replace(/\s*≤\s*/g, ' is less than or equal to ').replace(/\s*≥\s*/g, ' is greater than or equal to ');
  s = s.replace(/\s*≠\s*/g, ' is not equal to ').replace(/\s*≈\s*/g, ' is about ');
  s = s.replace(/\s+<\s+/g, ' is less than ').replace(/\s+>\s+/g, ' is greater than ');
  s = s.replace(/\s*×\s*/g, ' times ').replace(/\s*·\s*/g, ' times ').replace(/\s*÷\s*/g, ' divided by ');
  s = s.replace(/\s*[−–]\s*/g, ' minus ').replace(/\s+-\s+/g, ' minus ').replace(/\s*\+\s*/g, ' plus ').replace(/\s*±\s*/g, ' plus or minus ');
  s = s.replace(/\s*→\s*(?=[A-Za-z]{3,})/g, ', so ').replace(/\s*→\s*/g, ' to ').replace(/\s*←\s*/g, ' from ');
  s = s.replace(/(\S)\s*\/\s*(?=[\dπa-z(])/gi, '$1 over ');
  s = s.replace(/π/g, ' pi ').replace(/∞/g, ' infinity ').replace(/∫/g, ' the integral of ').replace(/θ/g, ' theta ');
  // Money, percent, degrees (after the minus rules, so "$5 − $2" stays a subtraction)
  s = s.replace(/\$\s*(\d+)(?:\.(\d{1,2}))?(?!\d)/g, (_, d, c) => money(d, c));
  s = s.replace(/(\d)\s*%/g, '$1 percent');
  s = s.replace(/(\d)\s*°/g, '$1 degrees').replace(/°/g, ' degrees');
  s = s.replace(/(\d|\?|what)\s+:\s+(?=\d|\?)/g, '$1 to '); // ratios a : b, but not clock times like 3:25
  s = s.replace(/(^|[\s(=:,])\?(?=[\s),.]|$)/g, '$1what');
  s = s.replace(/\bwhat remainder what\b/g, 'what, remainder what');
  s = s.replace(/\s*=\s*/g, ' equals ');
  s = s.replace(/(\w) and ([fghFGH]) of\b/g, '$1, and $2 of'); // f of x equals 3 x minus 3, and g of x ...
  // Tidy
  s = s.replace(/[()]/g, ' ').replace(/[\u0001-\u0003]/g, ' ');
  s = s.replace(/\s+,/g, ',').replace(/,(\s*,)+/g, ',').replace(/,\s*(?=[.?!:;]|$)/g, '').replace(/([.?!:])\s*,/g, '$1');
  s = s.replace(/\s+/g, ' ').replace(/\s+([.?!:;])/g, '$1').replace(/([.?!])\.+/g, '$1').replace(/:\./g, ':').trim();
  s = s.replace(/^[.,:;]\s*/, '');
  s = s.replace(/\bthe point ([^,]+, [^,]+), and the point /g, 'the points $1, and '); // the points 1, 4, and 4, 1
  if (/\bwhat$/.test(s)) s += '?';
  return s;
}

/* Split into short sentences for natural pauses (and to dodge Chrome cutting long utterances off) */
export function sentences(text, max = 160) {
  const out = [];
  String(text).split(/(?<=[.!?])\s+/).forEach(part => {
    part = part.trim(); if (!part) return;
    while (part.length > max) {
      let cut = part.lastIndexOf(', ', max); if (cut < 40) cut = part.lastIndexOf(' ', max); if (cut < 20) cut = max;
      out.push(part.slice(0, cut + 1).trim()); part = part.slice(cut + 1).trim();
    }
    if (part) out.push(part);
  });
  return out;
}

/* ---------- Settings (localStorage, every access guarded) ---------- */
const get = (k, d = null) => { try { const v = localStorage.getItem('vm.' + k); return v === null ? d : v; } catch (e) { return d; } };
const put = (k, v) => { try { v === null ? localStorage.removeItem('vm.' + k) : localStorage.setItem('vm.' + k, v); } catch (e) {} };
export const voiceName = () => get('voiceName', '');
export const setVoiceName = n => put('voiceName', n || null);
export const naturalOn = () => get('naturalVoice', '0') === '1';
export const setNatural = v => put('naturalVoice', v ? '1' : '0');
export const NATURAL_VOICES = [
  { id: 'af_heart', name: 'Heart', note: 'warm, American' },
  { id: 'af_bella', name: 'Bella', note: 'bright, American' },
  { id: 'af_nicole', name: 'Nicole', note: 'soft, American' },
  { id: 'bf_emma', name: 'Emma', note: 'gentle, British' }
];
export const naturalVoice = () => { const v = get('naturalVoiceId', 'af_heart'); return NATURAL_VOICES.some(x => x.id === v) ? v : 'af_heart'; };
export const setNaturalVoice = v => put('naturalVoiceId', v);
const explorer = () => typeof document !== 'undefined' && document.body && document.body.classList.contains('mode-explorer');

/* ---------- Status (download progress, errors) for the Me page and the small progress pill ---------- */
const listeners = new Set();
let status = { state: 'off', pct: 0, msg: '' };
export const onStatus = fn => { listeners.add(fn); fn(status); return () => listeners.delete(fn); };
function setStatus(next) { status = { ...status, ...next }; listeners.forEach(fn => { try { fn(status); } catch (e) {} }); pill(); }

/* ---------- Tier 1: built-in Web Speech, ranked and tuned ---------- */
const hasSynth = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
/* Every English voice is rated good, ok or poor (openspec better-voice, design decision 2). Poor voices (novelty,
   eSpeak, Apple compact, Windows desktop) are never picked when a good or ok one exists. */
const NOVELTY = /espeak|\b(fred|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|kathy|hysterical|deranged|pipe organ|grandma|grandpa|rocko|shelley|eddy|flo|reed|sandy)\b/i;
const GOOD = [
  [/\b(natural|neural)\b/i, 100], [/\bonline\b/i, 95], [/\bsiri\b/i, 90], [/\bpremium\b/i, 88], [/\benhanced\b/i, 84], [/^google\b/i, 75]
];
/* Within the ok tier, system voices known to sound clear come first */
const OK_NAMES = /\b(samantha|ava|allison|susan|karen|moira|tessa|serena|zoe|nicky|evan|joelle|veena|isha|rishi|daniel|alex)\b/i;
const langPts = v => { const l = (v.lang || '').replace('_', '-').toLowerCase(); return l === 'en-us' ? 4 : l === 'en-gb' ? 3 : l === 'en-in' ? 2 : l === 'en-au' || l === 'en-ca' || l === 'en-ie' ? 1.5 : 1; };
export function rateVoice(v) {
  if (!v || !/^en([-_]|$)/i.test(v.lang || '')) return null;
  const name = v.name || '', uri = v.voiceURI || '', both = name + ' ' + uri;
  if (NOVELTY.test(name)) return { tier: 'poor', pts: langPts(v) };
  if (/\bcompact\b/i.test(uri)) return { tier: 'poor', pts: 5 + langPts(v) };
  if (/^microsoft\b/i.test(name) && !/\bonline\b/i.test(name)) return { tier: 'poor', pts: 8 + langPts(v) };
  for (const [re, pts] of GOOD) if (re.test(both)) return { tier: 'good', pts: 1000 + pts + langPts(v) + (v.default ? 0.5 : 0) };
  return { tier: 'ok', pts: 500 + (OK_NAMES.test(name) ? 20 : 0) + langPts(v) + (v.default ? 0.5 : 0) };
}
/* Kept for callers that only need a number: higher is better, -Infinity for non-English */
export const scoreVoice = v => { const r = rateVoice(v); return r ? r.pts : -Infinity; };
let voicesReady = null;
function loadVoices() {
  if (!hasSynth()) return Promise.resolve([]);
  const now = speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  if (!voicesReady) voicesReady = new Promise(res => {
    const done = () => res(speechSynthesis.getVoices());
    try { speechSynthesis.addEventListener('voiceschanged', done, { once: true }); } catch (e) {}
    setTimeout(done, 900); // some browsers never fire voiceschanged
  }).then(v => { voicesReady = null; return v; });
  return voicesReady;
}
/* English voices, best first: good, then ok, then poor */
export function englishVoices(all = hasSynth() ? speechSynthesis.getVoices() : []) {
  return all.map(v => ({ v, r: rateVoice(v) })).filter(x => x.r).sort((a, b) => b.r.pts - a.r.pts || a.v.name.localeCompare(b.v.name)).map(x => x.v);
}
/* True when the device has English voices and every one of them is poor */
export const onlyPoorVoices = (all = hasSynth() ? speechSynthesis.getVoices() : []) => {
  const rated = all.map(rateVoice).filter(Boolean);
  return rated.length > 0 && rated.every(r => r.tier === 'poor');
};
/* The voice to speak with: the one the Player picked by name, else the best rated */
export function bestVoice(all) {
  const list = englishVoices(all), want = voiceName();
  return (want && list.find(v => v.name === want)) || list[0] || null;
}
/* Pitch 1 always (a raised pitch made voices sound strained); a calm rate, slower for Explorer */
export const builtInTuning = kid => ({ pitch: 1, rate: kid ? 0.9 : 0.95 });

let token = 0; // bumps on every new speech so stale work stops
function speakBuiltIn(text, my) {
  if (!hasSynth()) return;
  const parts = sentences(text); if (!parts.length) return;
  const kid = explorer();
  loadVoices().then(() => {
    if (my !== token) return;
    const v = bestVoice(), { rate, pitch } = builtInTuning(kid);
    let i = 0;
    const next = () => {
      if (my !== token || i >= parts.length) return;
      const u = new SpeechSynthesisUtterance(parts[i++]);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
      u.rate = rate; u.pitch = pitch; u.volume = 1;
      u.onend = () => setTimeout(next, 140); // a short breath between sentences
      u.onerror = () => setTimeout(next, 0);
      try { if (speechSynthesis.paused) speechSynthesis.resume(); speechSynthesis.speak(u); } catch (e) {}
    };
    setTimeout(next, 40); // Chrome can drop an utterance queued in the same tick as cancel()
  });
}

/* ---------- Tier 2: Kokoro neural voice in a Web Worker ---------- */
const canNatural = () => typeof WebAssembly === 'object' && typeof Worker === 'function' && typeof (window.AudioContext || window.webkitAudioContext) === 'function';
let worker = null, ready = false, loading = null, failedThisVisit = false, reqId = 0, slowWarned = false, firstGenDone = false;
const pending = new Map();
const cache = new Map(); // short phrases: praise lines, numbers, repeated prompts
const CACHE_MAX = 80;
let actx = null, playing = null;

function loadNatural() {
  if (ready) return Promise.resolve();
  if (loading) return loading;
  if (!canNatural()) { failedThisVisit = true; return Promise.reject(new Error('unsupported')); }
  setStatus({ state: 'loading', pct: 0, msg: 'Getting the natural voice ready...' });
  loading = new Promise((resolve, reject) => {
    /* import.meta.resolve goes through the import map, so the worker gets the same ?v= stamp as the page's modules */
    try { worker = new Worker(import.meta.resolve ? import.meta.resolve('./voice-worker.js') : new URL('./voice-worker.js', import.meta.url), { type: 'module' }); }
    catch (e) { reject(e); return; }
    const files = {};
    const timer = setTimeout(() => reject(new Error('timeout')), 10 * 60 * 1000);
    worker.onerror = e => { e.preventDefault && e.preventDefault(); reject(new Error(e.message || 'worker error')); };
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        if (data.file && data.total) files[data.file] = [data.loaded || 0, data.total];
        const vals = Object.values(files), tot = vals.reduce((a, x) => a + x[1], 0), got = vals.reduce((a, x) => a + x[0], 0);
        const pct = tot ? Math.min(99, Math.round(got / tot * 100)) : 0;
        setStatus({ state: 'loading', pct, msg: tot > 20e6 ? `Downloading the natural voice: ${pct}% of ${Math.round(tot / 1e6)} MB` : 'Getting the natural voice ready...' });
      } else if (data.type === 'ready') { clearTimeout(timer); ready = true; resolve(); }
      else if (data.type === 'error') { clearTimeout(timer); reject(new Error(data.message || 'load failed')); }
      else if (data.type === 'audio' || data.type === 'genError') {
        const p = pending.get(data.id); if (!p) return; pending.delete(data.id);
        data.type === 'audio' ? p.resolve({ audio: data.audio, rate: data.rate }) : p.reject(new Error(data.message));
      }
    };
    worker.postMessage({ type: 'load' });
  }).then(() => {
    setStatus({ state: 'ready', pct: 100, msg: 'Natural voice is ready.' });
  }).catch(err => {
    failedThisVisit = true; ready = false; loading = null;
    try { worker && worker.terminate(); } catch (e) {} worker = null;
    pending.forEach(p => p.reject(err)); pending.clear();
    const msg = err.message === 'unsupported'
      ? 'This browser cannot run the natural voice. The built-in voice will keep reading.'
      : 'The natural voice could not download right now (you may be offline, or a blocker stopped it). The built-in voice will keep reading.';
    setStatus({ state: 'error', pct: 0, msg });
    throw err;
  });
  return loading;
}
function generate(text, voice, speed) {
  const key = `${voice}|${speed}|${text}`;
  if (cache.has(key)) { const v = cache.get(key); cache.delete(key); cache.set(key, v); return Promise.resolve(v); }
  const id = ++reqId;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); worker.postMessage({ type: 'gen', id, text, voice, speed }); })
    .then(out => {
      if (text.length <= 80) { cache.set(key, out); if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value); }
      return out;
    });
}
function play({ audio, rate }, my) {
  return new Promise(resolve => {
    if (my !== token) return resolve();
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    const buf = actx.createBuffer(1, audio.length, rate); buf.copyToChannel(audio, 0);
    const src = actx.createBufferSource(), g = actx.createGain(); g.gain.value = 0.95;
    src.buffer = buf; src.connect(g).connect(actx.destination);
    src.onended = () => { if (playing === src) playing = null; resolve(); };
    playing = src; src.start();
  });
}
async function speakNatural(text, my) {
  const parts = sentences(text, 220); if (!parts.length) return;
  const voice = naturalVoice(), speed = explorer() ? 0.9 : 0.96;
  const t0 = performance.now();
  let nextGen = generate(parts[0], voice, speed);
  for (let i = 0; i < parts.length; i++) {
    const out = await nextGen;
    if (!firstGenDone) { firstGenDone = true; if (performance.now() - t0 > 4000 && parts[0].length < 60) slowNote(); }
    if (my !== token) return;
    if (i + 1 < parts.length) nextGen = generate(parts[i + 1], voice, speed); // make the next sentence while this one plays
    await play(out, my);
    if (my !== token) return;
    if (i + 1 < parts.length) await new Promise(r => setTimeout(r, 120));
  }
}

/* ---------- Name clips (openspec sutra-pronunciation) ----------
   playClip(url) plays one short recorded file, such as a Sutra name clip, on the same AudioContext and under the
   same stop token as read aloud: it stops anything being read, and stop() or the next speak() stops it. Resolves
   'ended' when it played to the end, 'stopped' when something stopped it; rejects when the file cannot be fetched,
   decoded or played (the caller falls back). The context is made and resumed before the first await, inside the tap.
   onStart() runs once, when the clip has really started (not on a failure or when superseded first).
   Only this site's own files are fetched: a URL on another origin is refused. */
export async function playClip(url, { onStart } = {}) {
  stop(); const my = token;
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (typeof AC !== 'function' || typeof fetch !== 'function') throw new Error('no Web Audio');
  const own = new URL(url, location.href);
  if (own.origin !== location.origin) throw new Error('playClip plays this site\'s own files only');
  url = own.href;
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {} // iOS: play with the ringer off
  actx = actx || new AC();
  if (actx.state === 'suspended') actx.resume().catch(() => {});
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const data = await res.arrayBuffer();
  if (my !== token) return 'stopped';
  const buf = await new Promise((ok, no) => { const p = actx.decodeAudioData(data, ok, no); if (p && p.catch) p.catch(no); });
  if (my !== token) return 'stopped';
  return new Promise(resolve => {
    const src = actx.createBufferSource(), g = actx.createGain(); g.gain.value = 0.95;
    src.buffer = buf; src.connect(g).connect(actx.destination);
    src.onended = () => { if (playing === src) playing = null; resolve(my === token ? 'ended' : 'stopped'); };
    playing = src; src.start();
    if (onStart) try { onStart(); } catch (e) {}
  });
}

/* ---------- Public API ---------- */
export function stop() {
  token++;
  try { hasSynth() && speechSynthesis.cancel(); } catch (e) {}
  try { playing && playing.stop(); } catch (e) {} playing = null;
  try { worker && ready && worker.postMessage({ type: 'clear' }); } catch (e) {}
}
/* speak(text or HTML, { natural }) reads it aloud, cancelling anything already speaking. */
export function speak(text, opts = {}) {
  const words = normalize(text); if (!words) return;
  stop(); const my = token;
  const useNatural = (opts.natural ?? naturalOn()) && !failedThisVisit;
  if (!useNatural) return speakBuiltIn(words, my);
  if (ready) { speakNatural(words, my).catch(() => { if (my === token) speakBuiltIn(words, my); }); return; }
  // Not loaded yet: give a cached model a moment, otherwise read this one with the built-in voice
  let settled = false;
  const fallback = setTimeout(() => { if (!settled && my === token) { settled = true; speakBuiltIn(words, my); } }, 2500);
  loadNatural().then(() => { if (settled || my !== token) return; settled = true; clearTimeout(fallback); speakNatural(words, my).catch(() => { if (my === token) speakBuiltIn(words, my); }); })
    .catch(() => { clearTimeout(fallback); if (!settled && my === token) { settled = true; speakBuiltIn(words, my); } });
}
export const supported = () => hasSynth() || canNatural();

/* ---------- Small UI: download pill and the slow-device note (styles at the end of math.css) ---------- */
function pill() {
  if (typeof document === 'undefined' || !document.body) return;
  let el = document.querySelector('.vv-pill');
  if (status.state !== 'loading') { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.className = 'vv-pill'; el.setAttribute('role', 'status'); el.innerHTML = '<span class="vv-pill-txt"></span><span class="vv-bar"><i></i></span>'; document.body.append(el); }
  el.querySelector('.vv-pill-txt').textContent = status.pct ? `Natural voice ${status.pct}%` : 'Natural voice loading';
  el.querySelector('.vv-bar i').style.width = (status.pct || 3) + '%';
}
function slowNote() {
  if (slowWarned || typeof document === 'undefined') return; slowWarned = true;
  const el = document.createElement('div'); el.className = 'vv-note'; el.setAttribute('role', 'status');
  el.innerHTML = '<p>The natural voice is a little slow on this device. Want the quicker built-in voice instead?</p><div><button type="button" class="md-btn md-btn--sm" data-vv="builtin">Use built-in voice</button><button type="button" class="md-btn md-btn--sm" data-vv="keep">Keep natural voice</button></div>';
  el.onclick = e => {
    const b = e.target.closest('[data-vv]'); if (!b) return;
    if (b.dataset.vv === 'builtin') { setNatural(false); setStatus({ state: 'off', msg: 'Using the built-in voice.' }); const cb = document.getElementById('setNatural'); if (cb) cb.checked = false; }
    el.remove();
  };
  document.body.append(el);
}

/* ---------- Me page settings block ---------- */
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
export function settingsHTML() {
  return `<div class="vv-set" id="vvSet">
    <div class="vv-row"><label for="setVoiceName">Built-in voice</label><select id="setVoiceName" class="vv-select"><option value="">Best available</option></select><button type="button" class="md-btn md-btn--sm" id="vvTest">Test voice</button></div>
    <div class="vv-row"><label class="vv-check"><input type="checkbox" id="setNatural" ${naturalOn() ? 'checked' : ''}> Natural voice (downloads about 100 MB once)</label>
      <select id="setNaturalVoice" class="vv-select" aria-label="Natural voice" ${naturalOn() ? '' : 'hidden'}>${NATURAL_VOICES.map(v => `<option value="${v.id}" ${v.id === naturalVoice() ? 'selected' : ''}>${v.name} (${v.note})</option>`).join('')}</select></div>
    <div class="vv-poor" id="vvPoor" hidden>
      <p><b>The voices on this device sound robotic.</b> For a clearer reading voice, add an Enhanced English voice:</p>
      <ul>
        <li>iPhone or iPad: Settings, Accessibility, Spoken Content, Voices, English.</li>
        <li>Mac: System Settings, Accessibility, Spoken Content, System voice, Manage Voices.</li>
        <li>Windows: Settings, Time and language, Speech, Add voices.</li>
        <li>Android: Settings, Text-to-speech output, Speech Services by Google.</li>
      </ul>
      <p>Then reload this page and pick it under Built-in voice.</p>
      <button type="button" class="md-btn md-btn--sm" id="vvPoorOk">Got it</button>
    </div>
    <p class="mq-small vv-status" id="vvStatus" role="status" aria-live="polite"></p>
  </div>`;
}
/* The poor-voice note is shown once per Player (on this device) until Got it */
const noteKey = player => 'voiceNoteSeen' + (player ? '.' + player : '');
export function wireSettings(root = document, { player = '' } = {}) {
  const sel = root.querySelector('#setVoiceName'), test = root.querySelector('#vvTest'), nat = root.querySelector('#setNatural'), natSel = root.querySelector('#setNaturalVoice'), out = root.querySelector('#vvStatus');
  if (!sel) return;
  const fill = () => {
    const list = englishVoices(), want = voiceName();
    sel.innerHTML = '<option value="">Best available</option>' + list.map(v => `<option value="${escAttr(v.name)}" ${v.name === want ? 'selected' : ''}>${escAttr(v.name)} (${escAttr(v.lang)})${rateVoice(v).tier === 'poor' ? ' (robotic)' : ''}</option>`).join('');
    sel.disabled = !list.length;
    const poor = root.querySelector('#vvPoor');
    if (poor) poor.hidden = !(onlyPoorVoices() && get(noteKey(player), '0') !== '1');
  };
  const ok = root.querySelector('#vvPoorOk');
  if (ok) ok.onclick = () => { put(noteKey(player), '1'); const poor = root.querySelector('#vvPoor'); if (poor) poor.hidden = true; sel.focus(); };
  fill(); loadVoices().then(fill);
  if (hasSynth()) try { speechSynthesis.addEventListener('voiceschanged', fill); } catch (e) {}
  const sample = () => speak('Hi there! 7 &times; 8 = 56. Great job!', {});
  sel.onchange = () => { setVoiceName(sel.value); speak('Hi! This is how I sound.', { natural: false }); };
  test.onclick = sample;
  natSel.onchange = () => { setNaturalVoice(natSel.value); speak('Hi! This is how I sound.', { natural: true }); };
  nat.onchange = () => {
    if (!nat.checked) { setNatural(false); natSel.hidden = true; setStatus({ state: 'off', pct: 0, msg: 'Using the built-in voice.' }); return; }
    if (!canNatural()) { nat.checked = false; setStatus({ state: 'error', msg: 'This browser cannot run the natural voice. The built-in voice will keep reading.' }); return; }
    setNatural(true); natSel.hidden = false; failedThisVisit = false;
    loadNatural().then(() => { if (nat.isConnected && nat.checked) speak('Hi! I am your new reading voice.', { natural: true }); })
      .catch(() => { setNatural(false); if (nat.isConnected) { nat.checked = false; natSel.hidden = true; } });
  };
  const off = onStatus(st => {
    if (!out.isConnected) { off(); return; }
    out.textContent = st.msg || (naturalOn() ? (ready ? 'Natural voice is ready.' : 'Natural voice is on. It loads the first time something is read aloud.') : '');
  });
}
