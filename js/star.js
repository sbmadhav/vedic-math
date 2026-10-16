/* A Star round (openspec star-round): 4 shuffled questions on one Trick, a replay of the Trick on the Player's own
   numbers after a miss, a rematch of the same kind (a Comeback when it is right), and one optional Dare.
   The round itself is a pure state machine (starRound, starAnswer, starNext, starDare) with no DOM, so every rule is
   a node test; runStar() below draws it and is the only part that touches the page. */
import { starPool, starThird, sigOf, sigOfKey, dareFor } from './levels.js';

export const ROUND = 4;
export const SPARK = { right: 10, comeback: 15, dare: 20 };
export const TARGET = 40;
const shuffle = (arr, rand = Math.random) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- The engine ---------- */
/* A new round. last: the keys the previous round on this Star dealt (they go to the back of the deck).
   pool: the problems to deal from (default: the Star's band at this Rating, js/levels.js starPool). */
export function starRound({ trick, star, rating = 1, last = [], pool = null, third = null, rand = Math.random } = {}) {
  const band = pool || starPool(trick, star, rating);
  const lastSigs = new Set(last.map(k => band.find(p => p.key === k)).filter(Boolean).map(sigOf));
  if (!pool) for (const k of last) { const s = sigOfKey(trick, k); if (s) lastSigs.add(s); }
  const mixed = shuffle(band, rand), fresh = mixed.filter(p => !lastSigs.has(sigOf(p))), old = mixed.filter(p => lastSigs.has(sigOf(p)));
  const deck = fresh.concat(old), qs = deck.slice(0, ROUND);
  return {
    trick, star, rand, band: deck, third, qs, k: 0, mode: 'main', current: qs[0], replayOf: null, sparks: 0, misses: 0,
    usedKinds: new Set(), used: new Set(qs.map(sigOf)), dareOffered: false, dareDone: false, offerShown: false,
    results: qs.map(() => null), lit: false
  };
}
/* The keys this round deals (saved as the Star's last round when it starts) */
export const roundKeys = st => st.qs.map(p => p.key);

/* A rematch for a missed question: the first unused problem of the same kind in the band, else of the same kind
   anywhere in the Star's third, else any unused problem in the band (design decision 3) */
export function pickRematch(st, missed) {
  const unused = p => !st.used.has(sigOf(p)), same = p => p.qkind === missed.qkind && unused(p);
  let p = st.band.find(same);
  if (!p) { st.third = st.third || starThird(st.trick, st.star); p = shuffle(st.third.filter(same), st.rand)[0]; }
  if (!p) p = st.band.find(unused) || st.band.find(x => sigOf(x) !== sigOf(missed)) || missed;
  st.used.add(sigOf(p));
  return p;
}

const copy = st => ({ ...st, usedKinds: new Set(st.usedKinds), used: new Set(st.used), results: st.results.slice() });
/* Move on to the next main question, or end the round after the last */
function advance(st, events) {
  st.k++;
  if (st.k >= st.qs.length) {
    st.mode = 'end'; st.current = null; st.lit = st.sparks >= TARGET;
    if (st.lit) events.push({ type: 'lit' });
    events.push({ type: 'end', total: st.sparks, lit: st.lit });
    return;
  }
  st.mode = 'main'; st.current = st.qs[st.k]; st.dareOffered = true;
}

/* One answer to the current question. Returns { state, events }: each event has a type, the Sparks it earns
   (sparks) and dial, the Dial hit it makes (true, false, or undefined for none). */
export function starAnswer(prev, ok) {
  const st = copy(prev), events = [], p = st.current;
  if (st.mode === 'main') {
    if (ok) { st.sparks += SPARK.right; st.results[st.k] = 'ok'; events.push({ type: 'right', sparks: SPARK.right, dial: true }); advance(st, events); }
    else { st.misses++; st.results[st.k] = 'miss'; st.mode = 'replay'; st.replayOf = 'main'; events.push({ type: 'miss', dial: false, problem: p }, { type: 'replay', problem: p }); }
  } else if (st.mode === 'rematch') {
    if (ok) {
      if (!st.usedKinds.has(p.qkind)) { st.usedKinds.add(p.qkind); st.sparks += SPARK.comeback; st.results[st.k] = 'cb'; events.push({ type: 'comeback', sparks: SPARK.comeback, dial: true }); }
      else { st.sparks += SPARK.right; st.results[st.k] = 'ok'; events.push({ type: 'right', sparks: SPARK.right, dial: true }); }
    } else { st.misses++; events.push({ type: 'miss', dial: false, problem: p }, { type: 'reveal', problem: p }); }
    advance(st, events);
  } else if (st.mode === 'dare') {
    if (ok) { st.sparks += SPARK.dare; events.push({ type: 'dare-won', sparks: SPARK.dare, dial: true }); st.mode = 'main'; st.current = st.qs[st.k]; }
    else { st.mode = 'replay'; st.replayOf = 'dare'; events.push({ type: 'dare-lost', problem: p }, { type: 'replay', problem: p }); }
  } else return { state: prev, events: [] };
  return { state: st, events };
}

/* After a replay (watched or skipped) or the video offer: the offer once after the second miss when a video is
   available, then the rematch; after a Dare's replay, back to the same main question */
export function starNext(prev, { videoAvailable = false } = {}) {
  const st = copy(prev), events = [];
  if (st.mode === 'replay' && st.replayOf === 'dare') { st.mode = 'main'; st.current = st.qs[st.k]; st.replayOf = null; return { state: st, events }; }
  if (st.mode === 'replay' && st.misses >= 2 && !st.offerShown && videoAvailable) { st.mode = 'offer'; st.offerShown = true; events.push({ type: 'offer' }); return { state: st, events }; }
  if (st.mode === 'replay' || st.mode === 'offer') {
    const missed = st.qs[st.k]; st.current = pickRematch(st, missed); st.mode = 'rematch'; st.replayOf = null;
    events.push({ type: 'rematch', problem: st.current });
    return { state: st, events };
  }
  return { state: prev, events };
}

/* Take the Dare: from question 2 on, once a round, between main questions */
export const canDare = st => st.mode === 'main' && st.dareOffered && !st.dareDone;
export function starDare(prev, problem = null) {
  if (!canDare(prev)) return { state: prev, events: [] };
  const st = copy(prev), p = problem || dareFor(st.trick, st.star, st.used, st.rand);
  st.used.add(sigOf(p)); st.dareDone = true; st.mode = 'dare'; st.current = p;
  return { state: st, events: [{ type: 'dare', problem: p }] };
}
