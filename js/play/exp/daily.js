/* Daily Number (#/arena/daily-number): six numbers, a target, combine two at a time. One puzzle set per local day.
   Routes: #/arena/daily-number (today), #/arena/daily-number/<YYYY-MM-DD> (a past day, played as practice), #/arena/daily-number/archive.
   Logic lives in daily-core.js; this file is the board, the results and the archive. */
import { head, level, t, store, dayKey, dayNumber, LAUNCH, tone, sfx, PENTA, say, confetti, sparkle, toast, track, share, shareUrl, reducedMotion, esc } from '../kit.js';
import { on, later, every } from '../life.js';
import * as D from './daily-core.js';

const KEY = 'daily';
const blank = () => ({ days: {}, played: [], paid: [] });
const fmtDate = key => new Date(key + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const stepText = s => `${s.a} ${D.OP_SIGN[s.op]} ${s.b} = ${s.r}`;
const starHtml = n => `<span class="dn-stars" role="img" aria-label="${n} of 3 stars">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}" aria-hidden="true">★</i>`).join('')}</span>`;
const TIER_COLOR = ['teal', 'sun', 'coral'];

export function mount({ root, signal, params }) {
  const lv = level();
  const S = { ...blank(), ...store.get(KEY, {}) };
  if (!S.days || typeof S.days !== 'object' || Array.isArray(S.days)) S.days = {};
  if (!Array.isArray(S.played)) S.played = [];
  if (!Array.isArray(S.paid)) S.paid = [];
  const save = () => store.set(KEY, S);
  const today = dayKey();
  root.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'md-wrap dn'; root.append(wrap);
  if (params[0] === 'archive') return archive();
  const key = params[0] && D.validKey(params[0]) ? params[0] : today;
  if (key > today) { wrap.innerHTML = `${head({ title: 'Daily Number', color: 'teal' })}<div class="px-stage dn-msg"><p class="md-lede">That puzzle has not been made yet. Come back on ${esc(fmtDate(key))}.</p><a class="md-btn md-btn--primary" href="#/arena/daily-number">Play today's puzzle</a></div>`; return; }
  return play(key);

  function playedOn(key) { return S.days[`${key}:${lv}`]; }
  function label(key) { const n = dayNumber(key); return n >= 1 ? `#${n}` : 'Warm-up'; }

  /* ----- The puzzle ----- */
  function play(key) {
    const official = key === today;
    const P = D.dailyPuzzles(key, lv);
    const id = `${key}:${lv}`;
    /* A saved tier whose moves no longer replay starts over instead of stopping the page from opening */
    const clean = D.cleanRecord(S.days[id] || { tiers: P.tiers.map(() => ({ moves: [], done: false })), practice: !official }, P);
    const rec = S.days[id] = clean.rec;
    if (clean.fixed) save();
    const fun = P.tiers.map(() => null); /* replays after a finished tier: never saved, never counted */
    let cur = Math.max(0, rec.tiers.findIndex(x => !x.done)), sel = null, op = null, lastNew = -1;
    const tierState = i => fun[i] || rec.tiers[i];

    wrap.innerHTML = `${head({ title: 'Daily Number', kicker: `${official ? 'Today' : 'Practice'} · ${label(key)} · ${esc(fmtDate(key))} · ${D.LEVEL_NAME[lv]}`, color: 'teal' })}
      <p class="dn-how">${t({ explorer: 'Join two numbers with + or − to make a new number. Keep going until you make the target.', challenger: 'Join two numbers at a time with + − × ÷. Every result must be a whole number above zero. Exact earns three stars; close earns one or two.', pro: 'Combine two numbers at a time with + − × ÷; every result stays a positive whole number. Exact is three stars, close is one or two.' })}</p>
      <div class="dn-bar">
        <span class="dn-chip" title="Days in a row"><b class="dn-streak">${D.streak(S.played, today)}</b> day streak</span>
        ${official ? '' : `<span class="dn-chip dn-chip--practice">Practice: does not change your streak</span>`}
        <span class="px-sp"></span>
        <a class="dn-link" href="#/arena/daily-number/archive">Archive</a>
        ${official ? '' : `<a class="dn-link" href="#/arena/daily-number">Today</a>`}
      </div>
      ${P.tiers.length > 1 ? `<div class="dn-tiers" role="group" aria-label="Targets"></div>` : ''}
      <section class="px-stage dn-stage" aria-label="Puzzle board">
        <div class="dn-target"><span class="dn-make">Make</span><b class="dn-goal"></b><span class="dn-near"></span></div>
        <div class="dn-board" role="group" aria-label="Numbers"></div>
        <div class="dn-ops" role="group" aria-label="Operations"></div>
        <p class="dn-say" aria-live="off"></p>
        <div class="dn-actions px-row">
          <button type="button" class="md-btn md-btn--sm dn-undo">Undo</button>
          <button type="button" class="md-btn md-btn--sm dn-reset">Start over</button>
          <span class="px-sp"></span>
          <button type="button" class="md-btn md-btn--sm dn-submit" hidden></button>
        </div>
        <ol class="dn-log" aria-label="Moves so far"></ol>
        <div class="dn-done" hidden></div>
      </section>
      <section class="dn-summary" hidden></section>
      <p class="px-note dn-keys">Keys: 1 to 6 pick a number, ${lv === 'explorer' ? '+ and −' : '+ − * /'} pick an operation, Backspace undoes, Escape clears.</p>`;
    const $ = s => wrap.querySelector(s);
    const tabs = $('.dn-tiers'), board = $('.dn-board'), opsEl = $('.dn-ops'), sayEl = $('.dn-say'), log = $('.dn-log'), done = $('.dn-done');
    const goal = $('.dn-goal'), near = $('.dn-near'), submitBtn = $('.dn-submit'), summary = $('.dn-summary');

    const slotsOf = i => D.replay(P.tiers[i].nums, tierState(i).moves);
    const drawTabs = () => {
      if (!tabs) return;
      tabs.innerHTML = P.tiers.map((tr, i) => { const st = tierState(i); return `<button type="button" class="dn-tab dn-tab--${TIER_COLOR[i]}" data-tier="${i}" aria-pressed="${i === cur}">
        <span>${tr.name}</span><span class="md-sr-only"> target</span> <b>${tr.target}</b>${rec.tiers[i].done ? starHtml(rec.tiers[i].stars) : `<small>${st.moves.length ? 'in progress' : 'new'}</small>`}</button>`; }).join('');
    };
    const draw = () => {
      const tr = P.tiers[cur], st = tierState(cur), slots = slotsOf(cur), locked = st.done;
      goal.textContent = tr.target;
      wrap.querySelector('.dn-stage').classList.toggle('is-locked', !!locked);
      const c = D.closest(slots, tr.target);
      near.textContent = locked ? '' : st.moves.length ? `closest so far: ${c}` : `in ${tr.need} moves or more`;
      board.innerHTML = slots.map((v, i) => v == null
        ? `<span class="dn-tile is-empty" aria-hidden="true"></span>`
        : `<button type="button" class="dn-tile${sel === i ? ' is-sel' : ''}${lastNew === i ? ' is-new' : ''}${v === tr.target ? ' is-hit' : ''}" data-slot="${i}" aria-pressed="${sel === i}" aria-label="${v}${sel === i ? ', picked' : ''}" ${locked ? 'disabled' : ''}>${v}</button>`).join('');
      opsEl.innerHTML = tr.ops.map(o => `<button type="button" class="dn-op" data-op="${o}" aria-pressed="${op === o}" aria-label="${D.OP_NAME[o]}" ${locked || sel == null ? 'disabled' : ''}>${D.OP_SIGN[o]}</button>`).join('');
      log.innerHTML = st.moves.length ? replaySteps(tr.nums, st.moves).map(s => `<li>${esc(stepText(s))}</li>`).join('') : '';
      $('.dn-undo').disabled = locked || !st.moves.length; $('.dn-reset').disabled = locked || !st.moves.length;
      const s = D.stars(tr.target, c, lv);
      submitBtn.hidden = locked || !st.moves.length || c === tr.target;
      submitBtn.innerHTML = `Finish with ${c} ${starHtml(s)}`;
      submitBtn.setAttribute('aria-label', `Finish with ${c}, ${s} stars`);
      if (!locked && !sayEl.dataset.keep) sayEl.textContent = sel == null ? t({ explorer: 'Tap a number.', challenger: 'Pick a number.', pro: 'Pick a number.' }) : op == null ? `Now pick + ${tr.ops.length > 2 ? '− × or ÷' : 'or −'}.` : `${slots[sel]} ${D.OP_SIGN[op]} ... pick the second number.`;
      delete sayEl.dataset.keep;
      lastNew = -1;
      drawTabs(); drawDone();
    };
    const replaySteps = (nums, moves) => { const slots = nums.slice(); return moves.map(([i, o, j]) => { const s = { a: slots[i], op: o, b: slots[j], r: D.apply(slots[i], o, slots[j]) }; slots[j] = s.r; slots[i] = null; return s; }); };
    const note = text => { sayEl.textContent = text; sayEl.dataset.keep = '1'; say(text); };

    const pickSlot = i => {
      const st = tierState(cur); if (st.done) return;
      const slots = slotsOf(cur); if (slots[i] == null) return;
      noteFocus();
      if (sel == null || op == null) { sel = sel === i ? null : i; op = null; tone(PENTA[3 + Math.min(i, 5)], { dur: 0.08, type: 'triangle', gain: 0.07 }); draw(); say(sel == null ? 'Unpicked.' : `Picked ${slots[i]}.`); focusSlot(i); return; }
      if (i === sel) { op = null; draw(); focusSlot(i); return; }
      const a = slots[sel], b = slots[i], r = D.apply(a, op, b);
      if (r == null) { note(D.whyNot(a, op, b)); sfx('no'); const el = board.querySelector(`[data-slot="${i}"]`); if (el) { el.classList.remove('is-shake'); void el.offsetWidth; el.classList.add('is-shake'); } return; }
      const o = op;
      st.moves.push([sel, op, i]); sel = null; op = null; lastNew = i;
      if (!fun[cur]) save();
      const tr = P.tiers[cur];
      tone(PENTA[Math.min(PENTA.length - 1, 2 + st.moves.length)], { dur: 0.14, type: 'triangle', gain: 0.1 });
      if (r === tr.target) { draw(); finish(r); return; }
      note(`${a} ${D.OP_SIGN[o]} ${b} = ${r}.`);
      draw(); focusSlot(i);
    };
    /* draw() rebuilds the board and the operations, so keyboard focus is noted first and put back after:
       on the same operation, else the given tile, else Undo or the first tile when the focused button went away */
    let kbd = null;
    const noteFocus = () => { const a = document.activeElement; kbd = a && wrap.contains(a) && a.closest('.dn-board, .dn-ops, .dn-actions') ? a : null; };
    const focusIn = q => { const b = q && wrap.querySelector(q); if (b && !b.disabled && !b.hidden) { b.focus({ preventScroll: true }); return true; } return false; };
    const focusSlot = i => {
      const was = kbd; kbd = null; if (!was) return;
      if (was.dataset.op && focusIn(`[data-op="${was.dataset.op}"]`)) return;
      if (was.isConnected && !was.disabled) { was.focus({ preventScroll: true }); return; }
      focusIn(i != null ? `[data-slot="${i}"]` : null) || focusIn('.dn-undo') || focusIn('.dn-board button');
    };
    const pickOp = o => {
      const st = tierState(cur); if (st.done || sel == null || !P.tiers[cur].ops.includes(o)) return;
      noteFocus(); op = op === o ? null : o; tone(880, { dur: 0.05, type: 'triangle', gain: 0.05 }); draw(); focusSlot(sel);
      if (op) say(`${slotsOf(cur)[sel]} ${D.OP_NAME[o]}. Pick the second number.`);
    };
    const undo = () => { const st = tierState(cur); if (st.done || !st.moves.length) return; noteFocus(); st.moves.pop(); sel = null; op = null; if (!fun[cur]) save(); draw(); focusSlot(null); say('Undone.'); };
    const reset = () => { const st = tierState(cur); if (st.done || !st.moves.length) return; noteFocus(); st.moves = []; sel = null; op = null; if (!fun[cur]) save(); draw(); focusSlot(null); say('Back to the six numbers.'); };

    const finish = value => {
      const tr = P.tiers[cur], st = tierState(cur), stars = D.stars(tr.target, value, lv);
      const ops = replaySteps(tr.nums, st.moves).map(s => s.op);
      Object.assign(st, { done: true, stars, v: value, ops });
      if (!fun[cur]) {
        if (official && !S.played.includes(key)) S.played.push(key);
        /* Sparks ('daily/solve') once per tier and day, and only with a star; any other finish is 'daily/finish' */
        const fa = D.finishAction({ official, stars, key, tier: cur, paid: S.paid }); S.paid = fa.paid;
        save();
        track(fa.action, `${D.LEVEL_NAME[lv]} ${tr.name}`);
      }
      sel = null; op = null;
      if (stars === 3) { sfx('win'); if (official && !fun[cur]) confetti(70); else sparkle(wrap.querySelector('.dn-board') || wrap, { signal }); } else sfx('ok'); /* openspec celebrations: the day's own puzzle is a win */
      say(stars === 3 ? `Exactly ${tr.target}! Three stars.` : `You finished with ${value}, ${Math.abs(value - tr.target)} away. ${stars} star${stars === 1 ? '' : 's'}.`);
      wrap.querySelector('.dn-streak').textContent = D.streak(S.played, today);
      draw();
      /* the next tier, else (all done) the share button, else the replay button */
      (done.querySelector('.dn-next') || (!summary.hidden && summary.querySelector('.dn-share')) || done.querySelector('.dn-fun'))?.focus({ preventScroll: true });
      done.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    };

    const ways = {}, counting = {};
    const waysText = (w, target) => `There ${w === 1 ? 'is 1 way' : `are ${w.toLocaleString()} ways`} to make ${target} with these six numbers.`;
    function drawDone() {
      const tr = P.tiers[cur], st = tierState(cur);
      done.hidden = !st.done;
      if (!st.done) { done.innerHTML = ''; summaryDraw(); return; }
      const sol = tr.solution, mine = st.moves.length;
      const next = P.tiers.findIndex((x, i) => i !== cur && !rec.tiers[i].done);
      const w = ways[cur];
      done.innerHTML = `<div class="dn-res">
          <p class="dn-res-big"><span>${st.v === tr.target ? `<b>${tr.target}</b> exactly` : `<b>${st.v}</b>, ${Math.abs(st.v - tr.target)} away from ${tr.target}`}</span> ${starHtml(st.stars)}</p>
          <p class="px-note">${fun[cur] ? 'Just for fun: your first try still counts.' : `${mine} move${mine === 1 ? '' : 's'}.${st.v === tr.target && mine === sol.length ? ' As short as it gets.' : ''}`}</p>
        </div>
        <div class="dn-path"><p class="dn-path-k">One elegant path</p><ol>${sol.map(s => `<li>${esc(stepText(s))}</li>`).join('')}</ol>
          <p class="px-note dn-ways">${w == null ? 'Counting every path...' : waysText(w, tr.target)}</p></div>
        <div class="px-row">${next >= 0 ? `<button type="button" class="md-btn md-btn--primary dn-next" data-tier="${next}">Next: ${P.tiers[next].name} target</button>` : ''}
          <button type="button" class="md-btn md-btn--sm dn-fun">Play it again for fun</button></div>`;
      /* Count once per tier, for the tier it was asked for (cur may change before it runs) */
      const c = cur;
      if (w == null && !counting[c]) { counting[c] = true; later(() => { ways[c] = D.countWays(tr.nums, tr.target, tr.ops); const el = cur === c && done.querySelector('.dn-ways'); if (el) el.textContent = waysText(ways[c], tr.target); }, 30, signal); }
      summaryDraw();
    }

    function summaryDraw() {
      const all = rec.tiers.every(x => x.done);
      summary.hidden = !all;
      if (!all) return;
      const sd = D.streak(S.played, today);
      const text = D.shareText({ num: P.num, level: lv, results: rec.tiers, streakDays: sd, practice: !official, warmup: P.num < 1 });
      const total = rec.tiers.reduce((s, x) => s + x.stars, 0);
      summary.innerHTML = `<div class="dn-sum px-stage">
        <div><p class="md-kicker">${official ? 'Today is done' : 'Practice done'}</p>
        <p class="dn-sum-big">${total} of ${rec.tiers.length * 3} stars</p>
        <pre class="dn-grid" role="img" aria-label="Your share grid: ${total} of ${rec.tiers.length * 3} stars">${esc(text)}</pre>
        <p class="px-note">The grid shows the operations you used and your stars, never the numbers, so nobody gets spoiled.</p></div>
        <div class="dn-sum-side">
          <button type="button" class="md-btn md-btn--primary dn-share">Share my grid</button>
          ${official ? `<p class="dn-next-in" aria-live="off"></p>` : `<a class="md-btn" href="#/arena/daily-number">Play today's puzzle</a>`}
          <a class="dn-link" href="#/arena/daily-number/archive">Play past days</a>
        </div></div>`;
      if (official) tick();
    }
    const tick = () => {
      const el = wrap.querySelector('.dn-next-in'); if (!el) return;
      /* Past midnight this page still shows yesterday's puzzle: say so instead of counting down a whole new day */
      if (dayKey() !== today) { if (!el.querySelector('.dn-reload')) el.innerHTML = 'A new puzzle is ready. <button type="button" class="dn-link dn-reload">Play it</button>'; return; }
      const now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0); const m = Math.max(1, Math.ceil((mid - now) / 60000));
      el.textContent = `Next puzzle in ${Math.floor(m / 60)} h ${m % 60} min`;
    };
    every(tick, 30000, signal);

    on(wrap, 'click', e => {
      const tab = e.target.closest('[data-tier]');
      if (tab) { cur = +tab.dataset.tier; sel = null; op = null; draw(); if (!tab.isConnected) (tab.classList.contains('dn-next') ? focusIn('.dn-board button') : focusIn(`.dn-tab[data-tier="${cur}"]`)) || focusIn('.dn-board button'); say(`${P.tiers[cur].name} target: ${P.tiers[cur].target}.`); if (tab.classList.contains('dn-next')) wrap.querySelector('.dn-stage').scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' }); return; }
      const sl = e.target.closest('[data-slot]'); if (sl) return pickSlot(+sl.dataset.slot);
      const ob = e.target.closest('[data-op]'); if (ob) return pickOp(ob.dataset.op);
      if (e.target.closest('.dn-reload')) { location.reload(); return; }
      if (e.target.closest('.dn-undo')) return undo();
      if (e.target.closest('.dn-reset')) return reset();
      if (e.target.closest('.dn-submit')) { const c = D.closest(slotsOf(cur), P.tiers[cur].target); return finish(c); }
      if (e.target.closest('.dn-fun')) { fun[cur] = { moves: [], done: false }; sel = null; op = null; draw(); say('Same numbers, just for fun.'); board.querySelector('button')?.focus({ preventScroll: true }); return; }
      if (e.target.closest('.dn-share')) {
        share({ title: 'Vedic Math Daily', text: D.shareText({ num: P.num, level: lv, results: rec.tiers, streakDays: D.streak(S.played, today), practice: !official, warmup: P.num < 1 }), url: shareUrl(`#/arena/daily-number/${key}`) });
        track('daily/share', D.LEVEL_NAME[lv]);
      }
    }, signal);
    on(wrap, 'keydown', e => {
      if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (/^[1-6]$/.test(k)) { const slots = slotsOf(cur), live = slots.map((v, i) => (v == null ? -1 : i)).filter(i => i >= 0); const i = live[+k - 1]; if (i != null) { e.preventDefault(); pickSlot(i); } return; }
      const o = { '+': '+', '-': '-', '*': 'x', x: 'x', X: 'x', '/': '/' }[k]; if (o) { e.preventDefault(); pickOp(o); return; }
      if (k === 'Backspace' || k === 'u') { e.preventDefault(); undo(); return; }
      if (k === 'Escape') { sel = null; op = null; draw(); }
    }, signal);
    /* Keys work anywhere on the page while this view is open. Shortcuts with Ctrl, Meta or Alt (Ctrl+1, Cmd+Backspace,
       zoom with Ctrl and +) belong to the browser, so they are not forwarded; the modifiers travel with the copy anyway. */
    on(document, 'keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (!wrap.contains(e.target) && (e.target === document.body || e.target.id === 'view')) wrap.dispatchEvent(new KeyboardEvent('keydown', { key: e.key, shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey, altKey: e.altKey, bubbles: true }));
    }, signal);

    draw();
    say(`Daily Number ${label(key)}. ${P.tiers.map(x => `${x.name} target ${x.target}`).join('. ')}. Numbers: ${P.tiers[cur].nums.join(', ')}.`);
  }

  /* ----- Archive ----- */
  function archive() {
    const start = [D.addDays(LAUNCH, -14), D.addDays(today, -60)].sort().pop();
    const keys = []; for (let k = D.addDays(today, -1); k >= start; k = D.addDays(k, -1)) keys.push(k);
    const pc = S.played.length, best = D.bestStreak(S.played);
    /* A stored day as its stars per tier (-1 for a tier not done), read as whole numbers 0 to 3 whatever storage holds */
    const archived = k => { const r = playedOn(k); if (!r || !Array.isArray(r.tiers)) return null; return r.tiers.map(x => (x && x.done ? (Number.isInteger(x.stars) ? Math.min(3, Math.max(0, x.stars)) : 0) : -1)); };
    wrap.innerHTML = `${head({ title: 'Daily Number', kicker: 'Archive', intro: 'Past days are practice: play any of them, as often as you like. Only today counts toward your streak.', color: 'teal' })}
      <div class="dn-bar"><span class="dn-chip"><b>${D.streak(S.played, today)}</b> day streak</span><span class="dn-chip"><b>${best}</b> best streak</span><span class="dn-chip"><b>${pc}</b> days played</span><span class="px-sp"></span><a class="md-btn md-btn--primary md-btn--sm" href="#/arena/daily-number">Today's puzzle</a></div>
      ${keys.length ? `<ul class="dn-arch">${keys.map(k => { const r = archived(k), st = r ? r.reduce((s, x) => s + Math.max(0, x), 0) : 0, max = D.TIER_COUNT(lv) * 3; return `<li><a href="#/arena/daily-number/${k}" class="dn-day${r && r.every(x => x >= 0) ? ' is-done' : r ? ' is-part' : ''}"><span class="dn-day-n">${label(k)}</span><span class="dn-day-d">${esc(fmtDate(k))}</span><span class="dn-day-s">${r ? `${st}/${max} ★` : 'Play'}</span></a></li>`; }).join('')}</ul>` : '<p class="px-note">No past days yet.</p>'}
      <p class="px-note">Warm-ups are the practice puzzles from the days before Daily Number began.</p>`;
  }
}
