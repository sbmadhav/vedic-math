/* Sanskrit helpers for the sutra-pronunciation prototype (repo-only, no dependencies).
   Input per name: `say`, its IAST spelling with "|" between the members of a compound (for example
   "Guṇita|samuccayaḥ"). From it this file derives
   - the Devanagari (toDeva), checked by hand against the sources in docs/sutra-pronunciation.md,
   - the phonemes Kokoro reads (toIPA), in the IPA symbols Kokoro's tokenizer knows,
   - the kid-readable respelling (respell), with one beat syllable per word or compound member in capitals.
   Sanskrit is spelled the way it is said, so a letter-by-letter mapping is enough. Unlike Hindi, every
   short a is said, including the last one ("Pūrveṇa" is poor-VAY-nuh, not poor-vain), which is why the
   Hindi letter-to-sound rules in eSpeak (Kokoro's own Hindi front end) are not used. */

const VOWELS = ['ai', 'au', 'a', 'ā', 'i', 'ī', 'u', 'ū', 'ṛ', 'ṝ', 'ḷ', 'e', 'o'];
const CONS = ['kh', 'gh', 'ch', 'jh', 'ṭh', 'ḍh', 'th', 'dh', 'ph', 'bh',
  'k', 'g', 'ṅ', 'c', 'j', 'ñ', 'ṭ', 'ḍ', 'ṇ', 't', 'd', 'n', 'p', 'b', 'm', 'y', 'r', 'l', 'v', 'ś', 'ṣ', 's', 'h'];
const MARKS = ['ṃ', 'ḥ', "'"];
const LONG = new Set(['ā', 'ī', 'ū', 'ṝ', 'e', 'o', 'ai', 'au']);

/* One word (no spaces, "|" allowed) into letters: { t: 'v' | 'c' | 'm' | '|', s } */
export function letters(word) {
  const w = word.normalize('NFC').toLowerCase().replace(/’/g, "'").replace(/-/g, '|');
  const out = [];
  for (let i = 0; i < w.length;) {
    if (w[i] === '|') { out.push({ t: '|', s: '|' }); i++; continue; }
    const v = VOWELS.find(x => w.startsWith(x, i)), c = CONS.find(x => w.startsWith(x, i)), m = MARKS.find(x => w.startsWith(x, i));
    const pick = [v && { t: 'v', s: v }, c && { t: 'c', s: c }, m && { t: 'm', s: m }].filter(Boolean).sort((a, b) => b.s.length - a.s.length)[0];
    if (!pick) throw new Error(`Unknown letter in "${word}" at ${i}: "${w.slice(i, i + 2)}"`);
    out.push(pick); i += pick.s.length;
  }
  return out;
}

/* Syllables of one compound member (no "|"). Weight follows the grammar books: a syllable is heavy when its
   vowel is long or a consonant cluster follows it. `split` decides where a cluster breaks for display:
   'last' puts only the last consonant in the next syllable (phonetics), 'first' keeps only the first
   consonant behind (easier to read: tir-YUHG-bhyahm, not tir-YUHGBH-yahm). */
export function syllables(member, split = 'last') {
  const L = letters(member).filter(x => x.s !== "'" && x.t !== '|');
  const syl = []; let onset = [];
  for (const x of L) {
    if (x.t === 'c') onset.push(x.s);
    else if (x.t === 'v') { syl.push({ onset, v: x.s, coda: [] }); onset = []; }
    else syl[syl.length - 1].coda.push(x.s);
  }
  if (onset.length) syl[syl.length - 1].coda.push(...onset);
  for (let i = 1; i < syl.length; i++) {
    const on = syl[i].onset;
    if (on.length > 1) {
      // jñ stays together as one sound (gy)
      const jn = on.at(-2) === 'j' && on.at(-1) === 'ñ';
      const asp = on.length === 2 && /^.h$/.test(on[0]); // an aspirate opens its cluster for reading: NAH-bhyahm, not NAHBH-yahm
      const keep = split === 'last' ? on.length - (jn ? 2 : 1) : (on[0] === 'j' && on[1] === 'ñ') || asp ? 0 : 1;
      syl[i - 1].coda.push(...on.slice(0, keep)); syl[i].onset = on.slice(keep);
    }
  }
  const heavy = s => LONG.has(s.v) || s.coda.some(c => c !== 'ḥ') || s.coda.includes('ḥ');
  syl.forEach((s, i) => { s.heavy = heavy(s) || (syl[i + 1] && syl[i + 1].onset.length > 1); });
  return syl;
}

/* The beat syllable in today's recitation habit (Whitney, Sanskrit Grammar, section 174, after the
   Latin rule): the second last syllable if it is heavy, else the third last if it is heavy, else the
   fourth last. Words of one or two syllables take the first. It is a light beat, not English stress. */
export function beat(syl) {
  const n = syl.length;
  if (n <= 2) return 0;
  if (syl[n - 2].heavy) return n - 2;
  if (syl[n - 3].heavy) return n - 3;
  return Math.max(0, n - 4);
}

const words = say => say.trim().split(/\s+/);
const members = word => word.split(/[|-]/).filter(Boolean);

/* ---------- Devanagari ---------- */
const DV = { a: 'अ', ā: 'आ', i: 'इ', ī: 'ई', u: 'उ', ū: 'ऊ', ṛ: 'ऋ', ṝ: 'ॠ', ḷ: 'ऌ', e: 'ए', ai: 'ऐ', o: 'ओ', au: 'औ' };
const DM = { a: '', ā: 'ा', i: 'ि', ī: 'ी', u: 'ु', ū: 'ू', ṛ: 'ृ', ṝ: 'ॄ', ḷ: 'ॢ', e: 'े', ai: 'ै', o: 'ो', au: 'ौ' };
const DC = { k: 'क', kh: 'ख', g: 'ग', gh: 'घ', ṅ: 'ङ', c: 'च', ch: 'छ', j: 'ज', jh: 'झ', ñ: 'ञ', ṭ: 'ट', ṭh: 'ठ', ḍ: 'ड', ḍh: 'ढ', ṇ: 'ण',
  t: 'त', th: 'थ', d: 'द', dh: 'ध', n: 'न', p: 'प', ph: 'फ', b: 'ब', bh: 'भ', m: 'म', y: 'य', r: 'र', l: 'ल', v: 'व', ś: 'श', ṣ: 'ष', s: 'स', h: 'ह' };
const VIRAMA = '्';
export function toDeva(say) {
  return words(say).map(word => {
    const L = letters(word).filter(x => x.t !== '|'); let out = '';
    for (let i = 0; i < L.length; i++) {
      const x = L[i];
      if (x.t === 'c') { out += DC[x.s]; const nx = L[i + 1]; if (!nx || nx.t !== 'v') out += VIRAMA; }
      else if (x.t === 'v') { const prev = L[i - 1]; out += prev && prev.t === 'c' ? DM[x.s] : DV[x.s]; }
      else out += x.s === 'ṃ' ? 'ं' : x.s === 'ḥ' ? 'ः' : 'ऽ';
    }
    return out;
  }).join(' ');
}

/* ---------- Phonemes for Kokoro ----------
   Its Hindi voices were trained on eSpeak's Hindi IPA. ɦ and the dental mark are not in its vocabulary,
   so h and plain t, d. jñ is said "gy" as in most of India today (other regions say "dny" or "jny"). */
const PV = { a: 'ə', ā: 'aː', i: 'ɪ', ī: 'iː', u: 'ʊ', ū: 'uː', ṛ: 'ɾɪ', ṝ: 'ɾiː', ḷ: 'lɪ', e: 'eː', ai: 'əɪ', o: 'oː', au: 'əʊ' };
const ECHO = { a: 'ə', ā: 'ə', i: 'ɪ', ī: 'ɪ', u: 'ʊ', ū: 'ʊ', ṛ: 'ɪ', e: 'eː', o: 'oː', ai: 'ɪ', au: 'ʊ' };
const PC = { k: 'k', kh: 'kʰ', g: 'ɡ', gh: 'ɡʰ', ṅ: 'ŋ', c: 'ʧ', ch: 'ʧʰ', j: 'ʤ', jh: 'ʤʰ', ñ: 'ɲ', ṭ: 'ʈ', ṭh: 'ʈʰ', ḍ: 'ɖ', ḍh: 'ɖʰ', ṇ: 'ɳ',
  t: 't', th: 'tʰ', d: 'd', dh: 'dʰ', n: 'n', p: 'p', ph: 'pʰ', b: 'b', bh: 'bʰ', m: 'm', y: 'j', r: 'r', l: 'l', v: 'ʋ', ś: 'ʃ', ṣ: 'ʂ', s: 's', h: 'h' };
/* ṃ (anusvara) takes the place of the consonant after it; at the end of a word it is m */
const nasal = next => !next ? 'm' : /^(k|g)/.test(next) ? 'ŋ' : /^(c|j)/.test(next) ? 'ɲ' : /^(ṭ|ḍ)/.test(next) ? 'ɳ' : /^(p|b|m|v)/.test(next) ? 'm' : 'n';
const onsetIPA = on => (on[0] === 'j' && on[1] === 'ñ') ? 'ɡj' + on.slice(2).map(c => PC[c]).join('') : on.map(c => PC[c]).join('');

/* ḥ (visarga) at the end of a word is h with a soft echo of the vowel before it (Daśataḥ: duh-shuh-tuh-huh),
   as when the name is read slowly word by word; inside a word, a plain h */
export function toIPA(say) {
  const ws = words(say);
  return ws.map((word, wi) => {
    const ms = members(word);
    return ms.map((m, mi) => {
      const syl = syllables(m), b = beat(syl);
      return syl.map((s, i) => {
        const next = syl[i + 1] ? syl[i + 1].onset[0] : (ms[mi + 1] ? letters(ms[mi + 1])[0].s : null);
        /* the beat mark goes right before the vowel, as in Kokoro's own phonemes (kˈoʊkəɹoʊ): a mark at the start
           of a word made the model say a short extra vowel first ("uh-shoonyum") */
        const mark = syl.length > 1 && i === b ? (mi === ms.length - 1 ? 'ˈ' : 'ˌ') : '';
        let p = onsetIPA(s.onset) + mark + PV[s.v];
        s.coda.forEach((c, k) => {
          if (c === 'ṃ') p += next === 'j' && syl[i + 1] && syl[i + 1].onset[1] === 'ñ' ? 'ŋ' : nasal(s.coda[k + 1] || next);
          else if (c === 'ḥ') p += 'h' + (mi === ms.length - 1 && i === syl.length - 1 ? ECHO[s.v] : '');
          else p += PC[c];
        });
        return p;
      }).join('');
    }).join('');
  }).join(' ');
}

/* ---------- Respelling for kids ----------
   Syllables joined by hyphens, one beat syllable per word (or compound member) in CAPITALS, compound members
   separated by a space so long names come in chunks. Long vowels get spellings English readers hold
   (ah, ee, oo, ay, oh); short vowels get quick ones (uh, i, u). */
const RV = { a: 'uh', ā: 'ah', i: 'i', ī: 'ee', u: 'u', ū: 'oo', ṛ: 'ri', ṝ: 'ree', ḷ: 'li', e: 'ay', ai: 'eye', o: 'oh', au: 'ow' };
const RECHO = { a: 'uh', ā: 'uh', i: 'i', ī: 'i', u: 'u', ū: 'u', ṛ: 'i', e: 'ay', o: 'oh', ai: 'i', au: 'u' };
const RC = { k: 'k', kh: 'kh', g: 'g', gh: 'gh', ṅ: 'ng', c: 'ch', ch: 'chh', j: 'j', jh: 'jh', ñ: 'ny', ṭ: 't', ṭh: 'th', ḍ: 'd', ḍh: 'dh', ṇ: 'n',
  t: 't', th: 'th', d: 'd', dh: 'dh', n: 'n', p: 'p', ph: 'ph', b: 'b', bh: 'bh', m: 'm', y: 'y', r: 'r', l: 'l', v: 'v', ś: 'sh', ṣ: 'sh', s: 's', h: 'h' };
const onsetR = on => (on[0] === 'j' && on[1] === 'ñ') ? 'gy' + on.slice(2).map(c => RC[c]).join('') : on.map(c => RC[c]).join('');
export function respell(say) {
  const ws = words(say);
  return ws.map((word, wi) => {
    const ms = members(word);
    return ms.map((m, mi) => {
      const syl = syllables(m, 'first'), b = beat(syllables(m));
      const parts = syl.map((s, i) => {
        const next = syl[i + 1] ? syl[i + 1].onset[0] : (ms[mi + 1] ? letters(ms[mi + 1])[0].s : null);
        let v = RV[s.v];
        if (s.v === 'ai' && s.onset.length) v = 'ai'; // lai, not leye
        let p = onsetR(s.onset) + v;
        s.coda.forEach((c, k) => {
          if (c === 'ṃ') p += { m: 'm', n: 'n', ŋ: 'ng', ɲ: 'n', ɳ: 'n' }[next === 'j' && syl[i + 1] && syl[i + 1].onset[1] === 'ñ' ? 'n' : nasal(s.coda[k + 1] || next)];
          else if (c === 'ḥ') p += mi === ms.length - 1 && i === syl.length - 1 ? '-h' + RECHO[s.v] : 'h';
          else p += RC[c];
        });
        return syl.length > 1 && i === b ? p.toUpperCase() : p;
      });
      return parts.join('-');
    }).join(' ');
  }).join(' ');
}
