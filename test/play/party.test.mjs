/* Party Mode: question generators are correct and fit each level, scoring and the handicap are fair,
   and the round state machine (buzz, lockout, steal, timeouts, secret turns, relay, wagers) is a pure
   reducer that always reaches the podium. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from '../../js/play/kit.js';
import {
  mixQ, bondQ, TRICKS, TRICK_IDS, estimateQ, choicesFor, judgeEstimate, points, MULT, BASE, ANSWER_MS, OPEN_MS, STEAL_MS,
  newGame, reduce, round, standings, wagerOptions, plan, playerName, ADJ, NOUNS,
  SECRET_MS, FINAL_MS, RELAY_LOCK_MS, RELAY_CAP, cleanSeats, answerMs, COLORS
} from '../../js/play/exp/party-core.js';

const LEVELS = ['explorer', 'challenger', 'pro'];
const ev = text => {
  const s = text.replace(/×/g, '*').replace(/−/g, '-').replace(/÷/g, '/').replace(/(\d+)²/g, '($1*$1)').replace(/Double (\d+)/, '2*$1').replace(/(\d+)% of (\d+)/, '($1*$2/100)');
  assert.match(s, /^[\d\s+\-*/().]+$/, text);
  return Function(`return (${s})`)(); /* test-only check of generated arithmetic */
};

test('mixed questions are correct, whole numbers, and sized to each level', () => {
  const r = rng('party-mix');
  for (const lv of LEVELS) for (let i = 0; i < 3000; i++) {
    const q = mixQ(lv, r);
    assert.equal(ev(q.text), q.answer, q.text);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0, q.text);
    if (lv === 'explorer') assert.ok(q.answer <= 20, q.text);
    if (lv === 'challenger') assert.ok(q.answer <= 150, q.text);
    assert.equal(q.choices.length, 4); assert.equal(new Set(q.choices).size, 4); assert.ok(q.choices.includes(q.answer));
    assert.ok(q.choices.every(c => Number.isInteger(c) && c >= 0));
  }
});

test('number bonds go to 10, 100 and 1000 by level', () => {
  const r = rng('bonds');
  for (const [lv, T] of [['explorer', 10], ['challenger', 100], ['pro', 1000]]) for (let i = 0; i < 1000; i++) {
    const q = bondQ(lv, r), a = +q.text.split(' ')[0];
    assert.ok(q.text.endsWith(`= ${T}`)); assert.equal(a + q.answer, T); assert.ok(q.answer > 0);
  }
});

test('every trick has a demo and a correct question at every level', () => {
  const r = rng('tricks');
  for (const id of TRICK_IDS) {
    const tr = TRICKS[id]; assert.ok(tr.name && tr.line && tr.demo.length >= 3);
    for (const lv of LEVELS) for (let i = 0; i < 800; i++) { const q = tr.gen(lv, r); assert.equal(ev(q.text), q.answer, `${id} ${lv} ${q.text}`); assert.ok(q.choices.includes(q.answer)); }
  }
  /* times 11: challenger never carries, pro always carries */
  for (let i = 0; i < 300; i++) {
    const c = +TRICKS.x11.gen('challenger', r).text.split(' ')[0]; assert.ok((c % 10) + Math.floor(c / 10) <= 9);
    const p = +TRICKS.x11.gen('pro', r).text.split(' ')[0]; assert.ok((p % 10) + Math.floor(p / 10) >= 10);
  }
});

test('estimation questions have exact answers', () => {
  const r = rng('est');
  for (let i = 0; i < 500; i++) { const q = estimateQ(r); assert.ok(Number.isInteger(q.answer) && q.answer > 0, q.text); assert.ok(q.text.length > 10); }
  assert.deepEqual(choicesFor(0, rng(1)).length, 4);
});

test('scoring and handicap: gentler levels earn more per answer; the handicap can be turned off', () => {
  assert.equal(points(10, 'pro'), 10); assert.equal(points(10, 'challenger'), 13); assert.equal(points(10, 'explorer'), 15);
  assert.equal(points(10, 'explorer', false), 10);
  assert.ok(MULT.explorer > MULT.challenger && MULT.challenger > MULT.pro);
  assert.ok(ANSWER_MS.explorer > ANSWER_MS.challenger && ANSWER_MS.challenger > ANSWER_MS.pro);
  const players = [{ id: 0, level: 'explorer' }, { id: 1, level: 'pro' }];
  /* explorer is 15% off, pro is 10% off: the softened score lets the explorer win */
  let res = judgeEstimate(1000, { 0: 1150, 1: 900 }, players);
  assert.deepEqual(res.filter(x => x.win).map(x => x.id), [0]);
  res = judgeEstimate(1000, { 0: 1150, 1: 900 }, players, false);
  assert.deepEqual(res.filter(x => x.win).map(x => x.id), [1]);
  res = judgeEstimate(1000, { 0: null, 1: 2000 }, players);
  assert.deepEqual(res.filter(x => x.win).map(x => x.id), [1]); assert.equal(res[0].close, false);
  assert.deepEqual(wagerOptions(0), [0]); assert.deepEqual(wagerOptions(31), [0, 15, 31]);
});

const three = () => newGame({ players: [{ level: 'explorer', adj: 1, noun: 2 }, { level: 'challenger', adj: 3, noun: 4 }, { level: 'pro', adj: 5, noun: 6 }], seed: 42 });

test('reducer is pure: same actions, same states; old state untouched', () => {
  const a = three(), b = reduce(a, { type: 'start', now: 0 });
  assert.equal(a.phase, 'lobby'); assert.equal(b.phase, 'intro');
  const c = reduce(reduce(three(), { type: 'start', now: 0 }), { type: 'next', now: 5 });
  const d = reduce(reduce(three(), { type: 'start', now: 0 }), { type: 'next', now: 5 });
  assert.deepEqual(c, d);
  assert.equal(reduce(a, { type: 'buzz', pid: 0, now: 1 }), a, 'ignored actions return the same state');
  assert.equal(playerName(c.players[0]), `${ADJ[1]} ${NOUNS[2]}`);
});

test('buzz race: personal questions, buzz lockout, wrong answers lock you out, timeouts', () => {
  let s = reduce(three(), { type: 'start', now: 0 }); s = reduce(s, { type: 'next', now: 0 });
  assert.equal(s.phase, 'open'); assert.equal(Object.keys(s.qs).length, 3);
  assert.ok(s.qs[0].answer <= 20, 'explorer gets an explorer question');
  s = reduce(s, { type: 'buzz', pid: 2, now: 1000 });
  assert.equal(s.phase, 'answer'); assert.equal(s.buzzer, 2); assert.equal(s.deadline, 1000 + ANSWER_MS.pro);
  assert.equal(reduce(s, { type: 'buzz', pid: 0, now: 1100 }), s, 'no buzzing while someone answers');
  s = reduce(s, { type: 'answer', value: s.qs[2].answer + 1, now: 2000 });
  assert.equal(s.phase, 'open'); assert.deepEqual(s.locked, [2]); assert.equal(s.event.kind, 'wrong');
  assert.equal(reduce(s, { type: 'buzz', pid: 2, now: 2100 }), s, 'locked out');
  s = reduce(s, { type: 'buzz', pid: 0, now: 2200 });
  const before = s.players[0].score;
  s = reduce(s, { type: 'tick', now: 2200 + ANSWER_MS.explorer - 1 }); assert.equal(s.phase, 'answer');
  s = reduce(s, { type: 'answer', value: s.qs[0].answer, now: 3000 });
  assert.equal(s.phase, 'reveal'); assert.equal(s.players[0].score - before, points(BASE.buzz, 'explorer')); assert.equal(s.event.kind, 'correct');
  /* nobody buzzes: the open window times out */
  s = reduce(s, { type: 'next', now: 4000 }); assert.equal(s.qi, 1); assert.equal(s.phase, 'open');
  s = reduce(s, { type: 'tick', now: 4000 + OPEN_MS }); assert.equal(s.phase, 'reveal'); assert.equal(s.event.kind, 'timeout-all');
  /* everyone wrong: nobody scores */
  s = reduce(s, { type: 'next', now: 5000 });
  for (const id of [0, 1, 2]) { s = reduce(s, { type: 'buzz', pid: id, now: 5000 }); s = reduce(s, { type: 'tick', now: 5000 + ANSWER_MS[s.players[id].level] }); }
  assert.equal(s.phase, 'reveal'); assert.equal(s.event.kind, 'nobody');
});

test('steal: a miss opens a steal window; the stealer answers a question at their own level for a bonus', () => {
  let s = reduce(three(), { type: 'start', now: 0 });
  while (round(s).type !== 'steal') { s = reduce(s, { type: 'next', now: 0 }); if (s.phase === 'open') s = reduce(s, { type: 'tick', now: 1e9 }); }
  s = reduce(s, { type: 'next', now: 0 });
  assert.equal(s.phase, 'answer'); assert.equal(s.buzzer, 0, 'first turn is player one');
  s = reduce(s, { type: 'tick', now: ANSWER_MS.explorer });
  assert.equal(s.phase, 'stealopen'); assert.deepEqual(s.locked, [0]); assert.equal(s.event.kind, 'timeout');
  assert.equal(reduce(s, { type: 'buzz', pid: 0, now: 10 }), s, 'the player who missed cannot steal');
  s = reduce(s, { type: 'buzz', pid: 1, now: ANSWER_MS.explorer + 100 });
  assert.equal(s.phase, 'answer'); assert.ok(s.stealing); assert.ok(s.qs[1].answer <= 150);
  s = reduce(s, { type: 'answer', value: s.qs[1].answer, now: ANSWER_MS.explorer + 200 });
  assert.equal(s.players[1].score, points(BASE.steal + BASE.stealBonus, 'challenger')); assert.ok(s.event.steal);
  /* next turn: player two misses, nobody steals in time */
  s = reduce(s, { type: 'next', now: 0 }); assert.equal(s.buzzer, 1);
  s = reduce(s, { type: 'answer', value: -1, now: 1 }); assert.equal(s.phase, 'stealopen');
  s = reduce(s, { type: 'tick', now: 1 + STEAL_MS }); assert.equal(s.phase, 'reveal'); assert.equal(s.event.kind, 'nobody');
});

test('estimation: secret turns in order, closest (with handicap) wins, timeouts count as no guess', () => {
  let s = reduce(three(), { type: 'start', now: 0 });
  while (round(s).type !== 'estimate') { s = reduce(s, { type: 'next', now: 0 }); if (['open', 'answer', 'stealopen'].includes(s.phase)) s = { ...s, phase: 'reveal' }; }
  s = reduce(s, { type: 'next', now: 0 });
  assert.equal(s.phase, 'secret'); assert.equal(s.turn, 0);
  const A = s.shared.answer;
  s = reduce(s, { type: 'ready', now: 1 });
  s = reduce(s, { type: 'answer', value: A, now: 1 }); assert.equal(s.turn, 1); assert.equal(s.event.kind, 'locked');
  s = reduce(s, { type: 'ready', now: 2 });
  s = reduce(s, { type: 'tick', now: 1e9 }); assert.equal(s.turn, 2); assert.equal(s.guesses[1], null);
  s = reduce(s, { type: 'ready', now: 3 });
  s = reduce(s, { type: 'answer', value: A * 2, now: 3 });
  assert.equal(s.phase, 'reveal'); assert.deepEqual(s.event.winners, [0]);
  assert.equal(s.players[0].score, points(BASE.estimate + BASE.close, 'explorer'));
});

test('relay: baton passes, correct answers count for the team, the goal pays everyone', () => {
  let s = reduce(three(), { type: 'start', now: 0 });
  while (round(s).type !== 'relay') { s = reduce(s, { type: 'next', now: 0 }); if (['open', 'answer', 'stealopen', 'secret'].includes(s.phase)) s = { ...s, phase: 'reveal' }; }
  s = reduce(s, { type: 'next', now: 0 });
  assert.equal(s.phase, 'relay'); const goal = round(s).goal;
  const seen = [];
  for (let i = 0; i < goal; i++) { const p = s.players[s.turn]; seen.push(p.id); s = reduce(s, { type: 'answer', value: s.qs[p.id].answer, now: i }); }
  assert.deepEqual(seen.slice(0, 4), [0, 1, 2, 0]); assert.equal(s.count, goal);
  const p = s.players[s.turn]; s = reduce(s, { type: 'answer', value: s.qs[p.id].answer + 1, now: 50 }); assert.equal(s.count, goal); assert.equal(s.event.kind, 'relayno');
  const before = s.players.map(x => x.score);
  s = reduce(s, { type: 'tick', now: round(s).ms });
  assert.equal(s.phase, 'reveal'); assert.ok(s.results.done);
  s.players.forEach((x, i) => assert.equal(x.score - before[i], points(BASE.relayGoal, x.level)));
});

test('a full game always reaches the podium; double or nothing doubles or loses the bet', () => {
  for (const length of ['quick', 'full']) for (let seed = 1; seed <= 25; seed++) {
    let s = newGame({ players: [{ level: 'explorer' }, { level: 'pro' }, { level: 'challenger' }, { level: 'pro' }].slice(0, 2 + (seed % 3)), seed, length });
    const r = rng('play' + seed); let now = 0, guard = 0;
    s = reduce(s, { type: 'start', now });
    while (s.phase !== 'podium') {
      assert.ok(guard++ < 2000, 'game ends'); now += 700;
      const coin = r() < 0.7;
      if (s.phase === 'intro' || s.phase === 'reveal') s = reduce(s, { type: 'next', now });
      else if (s.phase === 'open' || s.phase === 'stealopen') { const free = s.players.filter(p => !s.locked.includes(p.id)); s = r() < 0.15 ? reduce(s, { type: 'tick', now: s.deadline }) : reduce(s, { type: 'buzz', pid: free[Math.floor(r() * free.length)].id, now }); }
      else if (s.phase === 'answer') { const q = s.qs[s.buzzer]; s = reduce(s, { type: 'answer', value: coin ? q.answer : q.choices.find(c => c !== q.answer), now }); }
      else if (s.phase === 'secret') {
        if (!s.ready) s = reduce(s, { type: 'ready', now });
        if (round(s).type === 'estimate') s = reduce(s, { type: 'answer', value: Math.round(s.shared.answer * (0.5 + r())), now });
        else { const p = s.players[s.turn]; s = reduce(s, { type: 'answer', value: coin ? s.qs[p.id].answer : -1, now }); }
      } else if (s.phase === 'relay') s = r() < 0.1 ? reduce(s, { type: 'tick', now: s.deadline }) : reduce(s, { type: 'answer', value: coin ? s.qs[s.players[s.turn].id].answer : -1, now });
      else if (s.phase === 'wager') { const o = wagerOptions(s.players[s.turn].score); s = reduce(s, { type: 'wager', value: o[Math.floor(r() * o.length)], now }); }
      else assert.fail('unknown phase ' + s.phase);
      for (const p of s.players) assert.ok(p.score >= 0 && Number.isInteger(p.score));
      if (s.phase === 'reveal' && s.event.kind === 'final') {
        for (const x of s.results) assert.equal(x.pts, x.ok ? x.wager + points(BASE.final, s.players.find(p => p.id === x.id).level) : -x.wager);
      }
    }
    const st = standings(s); assert.equal(st[0].place, 1);
    for (let i = 1; i < st.length; i++) assert.ok(st[i].score <= st[i - 1].score);
  }
  assert.equal(plan(3, 'full').length, 6);
});

/* Skip ahead to the first question of a round type, treating every earlier question as revealed */
const to = (type, s = reduce(three(), { type: 'start', now: 0 })) => {
  while (round(s).type !== type) { s = reduce(s, { type: 'next', now: 0 }); if (!['intro', 'reveal'].includes(s.phase)) s = { ...s, phase: 'reveal' }; }
  return reduce(s, { type: 'next', now: 0 });
};

test('relay: a miss locks answers for a moment, so mashing costs time; each runner scores for a capped number of bonds', () => {
  let s = to('relay');
  const p0 = s.players[s.turn];
  s = reduce(s, { type: 'answer', value: s.qs[p0.id].answer + 1, now: 1000 });
  assert.equal(s.event.kind, 'relayno'); assert.equal(s.relayLock, 1000 + RELAY_LOCK_MS);
  const locked = s, p1 = s.players[s.turn];
  assert.equal(reduce(s, { type: 'answer', value: s.qs[p1.id].answer, now: 1000 + RELAY_LOCK_MS - 1 }), locked, 'answers are ignored while locked');
  s = reduce(s, { type: 'tick', now: 1000 + RELAY_LOCK_MS }); assert.equal(s.relayLock, 0, 'the tick clears the lock'); assert.equal(s.phase, 'relay');
  s = reduce(s, { type: 'answer', value: s.qs[p1.id].answer, now: 1000 + RELAY_LOCK_MS + 1 }); assert.equal(s.event.kind, 'relayok'); assert.equal(s.count, 1);
  /* one runner keeps getting it right: points stop at the cap, the team count keeps going */
  let t = to('relay'); const solo = t.players[0]; let now = 0;
  for (let i = 0; i < (RELAY_CAP + 3) * t.players.length; i++) { const p = t.players[t.turn]; t = reduce(t, { type: 'answer', value: t.qs[p.id].answer, now: now += 10 }); }
  assert.equal(t.count, (RELAY_CAP + 3) * t.players.length);
  assert.equal(t.players[0].score, RELAY_CAP * points(BASE.relay, solo.level));
});

test('secret turns: no clock until the Player is ready; a timeout keeps a typed guess', () => {
  let s = to('estimate');
  assert.equal(s.deadline, 0, 'no clock while the device is passed');
  assert.equal(reduce(s, { type: 'tick', now: 1e9 }), s, 'waiting at the gate never times out');
  assert.equal(reduce(s, { type: 'answer', value: 5, now: 1 }), s, 'no answers before ready');
  s = reduce(s, { type: 'ready', now: 5000 }); assert.equal(s.deadline, 5000 + SECRET_MS); assert.ok(s.ready);
  s = reduce(s, { type: 'tick', now: 5000 + SECRET_MS, typed: '1234' });
  assert.equal(s.guesses[0], 1234, 'the typed but unlocked guess counts'); assert.equal(s.turn, 1); assert.equal(s.deadline, 0); assert.equal(s.ready, false);
  s = reduce(s, { type: 'ready', now: 6000 }); s = reduce(s, { type: 'tick', now: 6000 + SECRET_MS });
  assert.equal(s.guesses[1], null, 'nothing typed is no guess');
});

test('double or nothing: the clock starts at ready; running out of time leaves the bet unchanged', () => {
  let s = to('final');
  s = { ...s, players: s.players.map(p => ({ ...p, score: 40 })) };
  for (let i = 0; i < 3; i++) s = reduce(s, { type: 'wager', value: 40, now: 0 });
  assert.equal(s.phase, 'secret'); assert.equal(s.deadline, 0);
  s = reduce(s, { type: 'ready', now: 100 }); assert.equal(s.deadline, 100 + FINAL_MS);
  s = reduce(s, { type: 'tick', now: 100 + FINAL_MS }); assert.equal(s.event.kind, 'outoftime'); assert.equal(s.turn, 1); assert.equal(s.deadline, 0);
  s = reduce(s, { type: 'ready', now: 200 }); s = reduce(s, { type: 'answer', value: s.qs[1].answer, now: 300 });
  s = reduce(s, { type: 'ready', now: 400 }); s = reduce(s, { type: 'answer', value: s.qs[2].answer + 1, now: 500 });
  assert.equal(s.phase, 'reveal');
  const res = Object.fromEntries(s.results.map(x => [x.id, x]));
  assert.equal(res[0].pts, 0); assert.ok(res[0].out); assert.equal(s.players[0].score, 40);
  assert.equal(res[1].pts, 40 + points(BASE.final, 'challenger'));
  assert.equal(res[2].pts, -40); assert.equal(s.players[2].score, 0);
});

test('Fair play off: everyone gets the same answer time', () => {
  assert.equal(answerMs('explorer', true), ANSWER_MS.explorer);
  assert.equal(answerMs('explorer', false), answerMs('pro', false));
  let s = newGame({ players: [{ level: 'explorer' }, { level: 'pro' }], seed: 3, handicap: false });
  s = reduce(reduce(s, { type: 'start', now: 0 }), { type: 'next', now: 0 });
  s = reduce(s, { type: 'buzz', pid: 0, now: 1000 }); assert.equal(s.deadline, 1000 + answerMs('pro', false));
});

test('saved seats are cleaned: two to four, known names, unique colors, valid levels', () => {
  for (const bad of [null, 'x', {}, [], [{ level: 'pro' }], [null, 3]]) assert.equal(cleanSeats(bad), null, JSON.stringify(bad));
  const six = Array.from({ length: 6 }, (_, i) => ({ adj: i, noun: i, color: 'coral', level: 'pro' }));
  const c = cleanSeats(six);
  assert.equal(c.length, 4); assert.equal(new Set(c.map(x => x.color)).size, 4); assert.ok(c.every(x => COLORS.includes(x.color)));
  const odd = cleanSeats([{ adj: 99, noun: -1, color: 'pink', level: 'wizard' }, { adj: 2, noun: 3, color: 'teal', level: 'explorer' }]);
  assert.deepEqual(odd[1], { adj: 2, noun: 3, color: 'teal', level: 'explorer' });
  assert.ok(odd[0].adj < ADJ.length && odd[0].noun >= 0 && odd[0].color !== 'teal' && odd[0].level === 'challenger');
  assert.equal(newGame({ players: six, seed: 1 }).players.length, 4);
});
