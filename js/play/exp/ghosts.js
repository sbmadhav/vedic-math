/* Ghost Races (#/arena/ghosts): short mental math sprints where every run leaves a ghost. Race your best ghost,
   an invented pace character, or a friend's ghost from a link (#/arena/ghosts/r/<code>), on the same questions.
   Logic lives in ghosts-core.js; this file is the lobby, the track, the keypad and the replay chart. */
import { head, level, t, store, rng, tone, sfx, PENTA, say, confetti, toast, track, share, shareUrl, reducedMotion, esc } from '../kit.js';
import { on, later, loop, child } from '../life.js';
import * as G from './ghosts-core.js';

const KEY = 'ghosts';
const blank = () => ({ kind: '', n: 10, foe: 'best', best: {}, runs: [], nick: null });
const bestKey = (kind, lv, n) => `${kind}:${lv}:${n}`;
const runnerSvg = cls => `<svg class="gh-runner-svg ${cls}" viewBox="0 0 40 44" aria-hidden="true"><path class="gh-body" d="M6 40 V20 a14 14 0 0 1 28 0 V40 l-5 -4 -4.5 4 -4.5 -4 -4.5 4 -4.5 -4 Z"/><circle class="gh-eye" cx="15" cy="19" r="3"/><circle class="gh-eye" cx="25" cy="19" r="3"/></svg>`;

export function mount({ root, signal, params }) {
  const lv = level();
  const S = { ...blank(), ...store.get(KEY, {}) };
  const save = () => store.set(KEY, S);
  const kinds = G.sprintsFor(lv);
  if (!kinds.includes(S.kind)) S.kind = kinds[0];
  root.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'md-wrap gh'; root.append(wrap);
  let page = null; /* each screen (lobby, invite, race) runs under its own child signal */
  const fresh = () => { if (page) page.abort(); page = child(signal); return page.signal; };

  if (params[0] === 'r' && params[1]) {
    const g = G.decode(params[1]);
    if (!g) { wrap.innerHTML = `${head({ title: 'Ghost Races', color: 'coral' })}<div class="px-stage gh-msg"><p class="md-lede">That ghost link looks torn. Ask your friend to send it again.</p><a class="md-btn md-btn--primary" href="#/arena/ghosts">Race on your own</a></div>`; return; }
    return challenge(g);
  }
  return lobby();

  /* ----- Lobby ----- */
  function lobby() {
    const sig = fresh();
    const best = () => S.best[bestKey(S.kind, lv, S.n)];
    wrap.innerHTML = `${head({ title: 'Ghost Races', intro: 'Every run leaves a ghost. Race the one that beat you, or send yours to a friend.', color: 'coral' })}
      <section class="gh-lobby">
        <div class="gh-pick">
          <h2 class="gh-h">Sprint</h2>
          <div class="gh-kinds" role="radiogroup" aria-label="Sprint"></div>
          <h2 class="gh-h">Length</h2>
          <div class="gh-lens" role="radiogroup" aria-label="Number of questions">${G.LENGTHS.map(n => `<button type="button" role="radio" class="md-chip" data-n="${n}" aria-checked="${S.n === n}">${n} questions</button>`).join('')}</div>
          <h2 class="gh-h">Race against</h2>
          <div class="gh-foes" role="radiogroup" aria-label="Opponent"></div>
          <button type="button" class="md-btn md-btn--primary gh-go">Start race</button>
        </div>
        <aside class="gh-side px-stage" aria-label="Your ghosts"></aside>
      </section>`;
    const kindsEl = wrap.querySelector('.gh-kinds'), foesEl = wrap.querySelector('.gh-foes'), side = wrap.querySelector('.gh-side');
    const draw = () => {
      kindsEl.innerHTML = kinds.map(k => `<button type="button" role="radio" class="gh-kind" data-kind="${k}" aria-checked="${S.kind === k}"><b>${esc(G.SPRINTS[k].short)}</b><small>${esc(G.SPRINTS[k].name)}</small></button>`).join('');
      wrap.querySelectorAll('[data-n]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.n === S.n)));
      const b = best();
      if (S.foe === 'best' && !b) S.foe = 'tortoise';
      foesEl.innerHTML = [
        `<button type="button" role="radio" class="gh-foe gh-foe--best" data-foe="best" aria-checked="${S.foe === 'best'}" ${b ? '' : 'disabled'}>${runnerSvg('is-ghost')}<span><b>Your best ghost</b><small>${b ? `${G.fmt(G.total(b))}, ${b.miss.length} miss${b.miss.length === 1 ? '' : 'es'}` : 'Finish a race to make one'}</small></span></button>`,
        ...G.PACERS.map(p => `<button type="button" role="radio" class="gh-foe gh-foe--${p.id}" data-foe="${p.id}" aria-checked="${S.foe === p.id}">${runnerSvg('is-ghost')}<span><b>${esc(p.name)}</b><small>${esc(p.blurb)}</small></span></button>`)
      ].join('');
      const runs = S.runs.filter(r => r.lv === lv).slice(-6).reverse();
      const bests = Object.entries(S.best).filter(([k]) => k.split(':')[1] === lv);
      side.innerHTML = `<h2 class="gh-h">Your ghosts</h2>
        ${bests.length ? `<ul class="gh-bests">${bests.map(([k, g]) => `<li><span>${esc(G.SPRINTS[g.kind].short)} <small>${g.n} q</small></span><b>${G.fmt(G.total(g))}</b></li>`).join('')}</ul>` : '<p class="px-note">No ghosts yet. Your first finished race becomes your first ghost.</p>'}
        ${runs.length ? `<h3 class="gh-h gh-h--sm">Recent races</h3><ul class="gh-runs">${runs.map(r => `<li><span>${esc(G.SPRINTS[r.kind].short)}</span><span>${G.fmt(r.total)}</span><span class="${r.won ? 'is-won' : ''}">${r.won ? 'won' : 'lost'}</span></li>`).join('')}</ul>` : ''}`;
    };
    on(wrap, 'click', e => {
      const k = e.target.closest('[data-kind]'); if (k) { S.kind = k.dataset.kind; save(); draw(); wrap.querySelector(`[data-kind="${S.kind}"]`).focus(); return; }
      const n = e.target.closest('[data-n]'); if (n) { S.n = +n.dataset.n; save(); draw(); return; }
      const f = e.target.closest('[data-foe]'); if (f && !f.disabled) { S.foe = f.dataset.foe; save(); draw(); wrap.querySelector(`[data-foe="${S.foe}"]`).focus(); return; }
      if (e.target.closest('.gh-go')) {
        const seed = G.freshSeed();
        const foe = S.foe === 'best' && best() ? { ...best(), who: 'best' } : G.pacerGhost(S.foe, S.kind, lv, seed, S.n);
        run({ kind: S.kind, lv, seed, n: S.n, foe });
      }
    }, sig);
    draw();
  }

  function foeName(g) {
    if (g.who === 'friend') return G.nickName(g.nick);
    if (g.who === 'best') return 'Your best ghost';
    return (G.PACERS.find(p => p.id === g.who) || {}).name || 'Ghost';
  }

  /* ----- A friend's ghost ----- */
  function challenge(g) {
    const sig = fresh();
    const sp = G.SPRINTS[g.kind];
    wrap.innerHTML = `${head({ title: 'Ghost Races', kicker: 'A ghost has come for you', color: 'coral' })}
      <section class="px-stage gh-invite">
        <div class="gh-invite-art">${runnerSvg('is-ghost is-float')}</div>
        <div><p class="gh-invite-big"><b>${esc(G.nickName(g.nick))}</b> sent you their ghost.</p>
        <p>${esc(sp.name)}, ${g.n} questions. Their time: <b>${G.fmt(G.total(g))}</b> with ${g.miss.length} miss${g.miss.length === 1 ? '' : 'es'}.</p>
        <p class="px-note">You get exactly the same questions. ${g.lv !== lv ? `This ghost raced at ${esc(g.lv)} level.` : ''}</p>
        <div class="px-row"><button type="button" class="md-btn md-btn--primary gh-go">Race their ghost</button><a class="md-btn" href="#/arena/ghosts">Not now</a></div></div>
      </section>`;
    on(wrap, 'click', e => { if (e.target.closest('.gh-go')) run({ kind: g.kind, lv: g.lv, seed: g.seed, n: g.n, foe: g }); }, sig);
    track('ghosts/open-link', sp.name);
    wrap.querySelector('.gh-go').focus({ preventScroll: true });
  }

  /* ----- The race ----- */
  function run({ kind, lv: qlv, seed, n, foe }) {
    const sig = fresh();
    const qs = G.questions(kind, qlv, seed, n);
    const name = foeName(foe);
    wrap.innerHTML = `${head({ title: 'Ghost Races', kicker: `${esc(G.SPRINTS[kind].name)} · ${n} questions`, color: 'coral' })}
      <section class="gh-race">
        <div class="gh-track" role="img" aria-label="Race track: you and ${esc(name)}">
          <div class="gh-lane gh-lane--you"><span class="gh-lane-l">You</span><div class="gh-road">${'<i></i>'.repeat(n - 1)}</div><div class="gh-runner gh-runner--you">${runnerSvg('is-you')}</div></div>
          <div class="gh-lane gh-lane--foe"><span class="gh-lane-l">${esc(name)}</span><div class="gh-road">${'<i></i>'.repeat(n - 1)}</div><div class="gh-runner gh-runner--foe is-${esc(foe.who)}">${runnerSvg('is-ghost')}</div></div>
          <div class="gh-flag" aria-hidden="true"></div>
        </div>
        <div class="gh-hud"><span class="gh-clock" aria-label="Time">0.00s</span><span class="gh-count">1 / ${n}</span><span class="gh-gap" aria-live="off"></span></div>
        <div class="gh-play px-stage">
          <div class="gh-q" aria-live="off"><span class="gh-q-text"></span><span class="gh-q-eq">=</span><span class="gh-typed" aria-label="Your answer"></span></div>
          <div class="gh-pad" role="group" aria-label="Number pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button type="button" data-k="${d}">${d}</button>`).join('')}<button type="button" data-k="back" aria-label="Delete">⌫</button><button type="button" data-k="0">0</button><button type="button" data-k="enter" class="gh-enter" aria-label="Check">✓</button></div>
          <p class="px-note gh-keys">Type with the keys too: digits, Backspace, Enter.</p>
        </div>
        <div class="gh-result" hidden></div>
      </section>`;
    const $ = s => wrap.querySelector(s);
    const qText = $('.gh-q-text'), typedEl = $('.gh-typed'), clock = $('.gh-clock'), count = $('.gh-count'), gap = $('.gh-gap');
    const you = $('.gh-runner--you'), them = $('.gh-runner--foe'), play = $('.gh-play'), result = $('.gh-result');
    const pos = (el, p) => el.style.setProperty('--p', Math.min(1, p / n).toFixed(4));
    let i = 0, typed = '', t0 = 0, started = false, over = false;
    const times = [], miss = [];

    const show = () => { qText.textContent = qs[i].text; typedEl.textContent = typed || ' '; typedEl.classList.toggle('is-empty', !typed); count.textContent = `${Math.min(i + 1, n)} / ${n}`; };
    const press = k => {
      if (!started || over) return;
      if (k === 'back') { typed = typed.slice(0, -1); show(); return; }
      if (k === 'enter') { if (typed) check(true); return; }
      if (typed.length >= 7) return;
      typed += k; tone(PENTA[+k % PENTA.length], { dur: 0.05, type: 'triangle', gain: 0.05 }); show(); check(false);
    };
    const check = forced => {
      const v = G.judge(typed, qs[i].answer);
      if (v === 'typing' && !forced) return;
      const now = performance.now() - t0;
      if (v === 'right') {
        times.push(Math.max(10, Math.round(now / 10) * 10)); i++; typed = '';
        tone(PENTA[Math.min(PENTA.length - 1, 3 + (i % 6))], { dur: 0.12, gain: 0.1 });
        pos(you, i); you.classList.remove('is-hop'); void you.offsetWidth; you.classList.add('is-hop');
        if (i >= n) return finish();
        say(qs[i].say); show();
      } else {
        miss.push([i, Math.round(now / 10) * 10]); typed = ''; sfx('no');
        play.classList.remove('is-miss'); void play.offsetWidth; play.classList.add('is-miss');
        you.classList.remove('is-trip'); void you.offsetWidth; you.classList.add('is-trip');
        say(`Not quite. ${qs[i].say}`); show();
      }
    };
    on(play, 'click', e => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); }, sig);
    on(document, 'keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target.closest && e.target.closest('input, select, textarea'))) return;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); flash(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); press('back'); flash('back'); }
      else if (e.key === 'Enter' && started && !over) { e.preventDefault(); press('enter'); flash('enter'); }
    }, sig);
    const flash = k => { const b = play.querySelector(`[data-k="${k}"]`); if (b) { b.classList.remove('is-press'); void b.offsetWidth; b.classList.add('is-press'); } };

    /* 3, 2, 1, go */
    const countdown = (k) => {
      qText.textContent = k ? String(k) : 'Go!'; qText.classList.add('is-count'); typedEl.textContent = ' ';
      say(k ? String(k) : 'Go!'); tone(k ? 440 : 880, { dur: k ? 0.12 : 0.25, gain: 0.1 });
      if (k) later(() => countdown(k - 1), reducedMotion() ? 600 : 800, sig);
      else later(() => { qText.classList.remove('is-count'); started = true; t0 = performance.now(); show(); say(qs[0].say); tick(); }, 350, sig);
    };
    const tick = () => loop(now => {
      const ms = now - t0;
      if (!over) clock.textContent = G.fmt(ms);
      const fp = G.progressAt(foe, ms);
      pos(them, fp);
      if (!over) {
        const d = Math.round((fp - i) * 10) / 10;
        gap.textContent = d > 0.05 ? `${name} is ahead` : d < -0.05 ? 'You are ahead' : 'Neck and neck';
        gap.className = `gh-gap ${d > 0.05 ? 'is-behind' : d < -0.05 ? 'is-ahead' : ''}`;
      }
      return !(over && fp >= n);
    }, sig);

    const finish = () => {
      over = true;
      const mine = G.makeGhost({ kind, lv: qlv, seed, n, t: times, miss, nick: S.nick });
      const myT = G.total(mine), foeT = G.total(foe), won = myT < foeT, margin = Math.abs(foeT - myT);
      clock.textContent = G.fmt(myT);
      gap.textContent = won ? 'You finished first' : `${name} finished first`; gap.className = `gh-gap ${won ? 'is-ahead' : 'is-behind'}`;
      const bk = bestKey(kind, qlv, n), prev = S.best[bk], newBest = !prev || myT < G.total(prev);
      if (newBest) S.best[bk] = mine;
      S.runs.push({ kind, lv: qlv, n, total: myT, misses: miss.length, won, at: Date.now() }); S.runs = S.runs.slice(-30);
      save();
      track('ghosts/finish', `${G.SPRINTS[kind].name} ${n}`);
      if (won) { sfx('win'); confetti(50); } else sfx('ok');
      const headline = won ? `You beat ${foe.who === 'best' ? 'your best ghost' : name} by ${G.fmt(margin)}!` : `${foe.who === 'best' ? 'Your best ghost' : name} won by ${G.fmt(margin)}.`;
      say(`${headline} Your time ${G.fmt(myT)} with ${miss.length} misses.${newBest ? ' New best ghost saved.' : ''}`);
      play.hidden = true; result.hidden = false;
      result.innerHTML = `<div class="gh-res px-stage">
          <p class="gh-res-big ${won ? 'is-won' : ''}">${esc(headline)}</p>
          <div class="gh-stats"><div><span>You</span><b>${G.fmt(myT)}</b><small>${miss.length} miss${miss.length === 1 ? '' : 'es'}</small></div><div><span>${esc(name)}</span><b>${G.fmt(foeT)}</b><small>${foe.miss.length} miss${foe.miss.length === 1 ? '' : 'es'}</small></div></div>
          ${newBest ? `<p class="gh-newbest">New best ghost for ${esc(G.SPRINTS[kind].short)}, ${n} questions. It will race you next time.</p>` : ''}
          ${chart(mine, foe, name, qs)}
          <div class="gh-send">
            <h2 class="gh-h">Send this ghost to a friend</h2>
            <p class="px-note">They race your exact times on the same questions. No names are sent unless you pick a nickname below.</p>
            <div class="gh-nick">
              <label>Nickname <select class="gh-adj" aria-label="Nickname, first word"><option value="">None</option>${G.ADJ.map((a, k) => `<option value="${k}" ${S.nick && S.nick[0] === k ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
              <select class="gh-ani" aria-label="Nickname, second word">${G.ANIMAL.map((a, k) => `<option value="${k}" ${S.nick && S.nick[1] === k ? 'selected' : ''}>${a}</option>`).join('')}</select>
              <button type="button" class="md-btn md-btn--sm gh-dice" aria-label="Pick a random nickname">Surprise me</button>
            </div>
            <div class="px-row"><button type="button" class="md-btn md-btn--primary gh-share">Send my ghost</button><button type="button" class="md-btn gh-again">Race again</button><button type="button" class="md-btn md-btn--sm gh-lobby-btn">Change sprint</button></div>
          </div>
        </div>`;
      const adj = result.querySelector('.gh-adj'), ani = result.querySelector('.gh-ani');
      const syncNick = () => { S.nick = adj.value === '' ? null : [+adj.value, +ani.value]; ani.disabled = adj.value === ''; mine.nick = S.nick; save(); };
      syncNick();
      on(result, 'change', e => { if (e.target === adj || e.target === ani) syncNick(); }, sig);
      on(result, 'click', e => {
        if (e.target.closest('.gh-dice')) { const nk = G.pickNick(Math.random); adj.value = nk[0]; ani.value = nk[1]; syncNick(); say(`Nickname: ${G.nickName(S.nick)}`); }
        if (e.target.closest('.gh-share')) {
          const url = shareUrl(`#/arena/ghosts/r/${G.encode(mine)}`);
          share({ title: 'Ghost Races', text: `${S.nick ? G.nickName(S.nick) : 'I'} ran ${G.SPRINTS[kind].name} (${n} questions) in ${G.fmt(myT)}. Can you beat my ghost?`, url });
          track('ghosts/send', G.SPRINTS[kind].name);
        }
        if (e.target.closest('.gh-lobby-btn')) { if (location.hash !== '#/arena/ghosts') history.replaceState(null, '', '#/arena/ghosts'); lobby(); scrollTo({ top: 0 }); return; }
        if (e.target.closest('.gh-again')) {
          const best = S.best[bk];
          const nextFoe = foe.who === 'friend' ? foe : foe.who === 'best' ? { ...best, who: 'best' } : null;
          const ns = foe.who === 'friend' ? seed : G.freshSeed();
          run({ kind, lv: qlv, seed: ns, n, foe: nextFoe || G.pacerGhost(foe.who, kind, qlv, ns, n) });
        }
      }, sig);
      result.querySelector('.gh-res-big').setAttribute('tabindex', '-1');
      result.querySelector('.gh-res-big').focus({ preventScroll: true });
      result.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
    };

    pos(you, 0); pos(them, 0); show();
    countdown(3);
  }

  /* ----- Replay chart: time gained or lost on each question, and the running lead ----- */
  function chart(me, foe, name, qs) {
    const rows = G.compare(me, foe), n = rows.length;
    const W = Math.max(320, Math.min(640, (wrap.clientWidth || 640) - 64)), H = W < 480 ? 220 : 240, L = 46, R = 14, T = 18, B = 34, iw = W - L - R, ih = H - T - B;
    const vals = rows.flatMap(r => [r.gain, r.lead]), hiRaw = Math.max(0, ...vals), loRaw = Math.min(0, ...vals);
    const step = niceStep(Math.max(500, (hiRaw - loRaw) / 1.5));
    const top = Math.max(step, Math.ceil(hiRaw / step) * step), bot = Math.min(-step, Math.floor(loRaw / step) * step);
    const y = v => T + ((top - v) / (top - bot)) * ih, bw = Math.max(4, Math.min(26, iw / n - 6)), x = i => L + (i + 0.5) * (iw / n);
    const ticks = []; for (let v = bot; v <= top + 1; v += step) ticks.push(v);
    const lead = rows.map((r, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)} ${y(r.lead).toFixed(1)}`).join(' ');
    const bars = rows.map((r, k) => {
      const h = Math.abs(y(r.gain) - y(0)), up = r.gain >= 0, rr = Math.min(4, h / 2, bw / 2);
      const x0 = x(k) - bw / 2, y0 = up ? y(r.gain) : y(0);
      /* rounded at the data end, square at the zero line */
      const d = up
        ? `M${x0} ${y0 + h} V${y0 + rr} q0 ${-rr} ${rr} ${-rr} H${x0 + bw - rr} q${rr} 0 ${rr} ${rr} V${y0 + h} Z`
        : `M${x0} ${y0} V${y0 + h - rr} q0 ${rr} ${rr} ${rr} H${x0 + bw - rr} q${rr} 0 ${rr} ${-rr} V${y0} Z`;
      const tip = `Question ${k + 1} (${qs[k] ? qs[k].text : ''}): you ${G.fmt(r.you)}, ${name} ${G.fmt(r.ghost)}. ${up ? 'Gained' : 'Lost'} ${G.fmt(Math.abs(r.gain))}.`;
      return `<g class="gh-bar ${up ? 'is-gain' : 'is-loss'}"><rect class="gh-hit" x="${L + k * (iw / n)}" y="${T}" width="${iw / n}" height="${ih}"/>${h > 0.5 ? `<path d="${d}"/>` : ''}<title>${esc(tip)}</title></g>`;
    }).join('');
    const every = Math.max(1, Math.ceil(n / (W < 480 ? 6 : 12)));
    const best = rows.reduce((a, b) => (b.gain > a.gain ? b : a), rows[0]), worst = rows.reduce((a, b) => (b.gain < a.gain ? b : a), rows[0]);
    const end = rows[n - 1];
    const summary = `${best.gain > 0 ? `Biggest gain on question ${best.i + 1} (${G.fmt(best.gain)}). ` : ''}${worst.gain < 0 ? `Biggest loss on question ${worst.i + 1} (${G.fmt(-worst.gain)}). ` : ''}You finished ${end.lead >= 0 ? `${G.fmt(end.lead)} ahead` : `${G.fmt(-end.lead)} behind`}.`;
    return `<figure class="gh-chart">
      <figcaption><b>Where you gained and lost time</b><span class="gh-legend"><span class="gh-key is-gain">Faster than ${esc(name)}</span><span class="gh-key is-loss">Slower</span><span class="gh-key is-line">Your running lead</span></span></figcaption>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(summary)}">
        ${ticks.map(v => `<line class="gh-grid${v === 0 ? ' is-zero' : ''}" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="gh-tick" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v) / 1000}s</text>`).join('')}
        ${bars}
        <path class="gh-lead" d="${lead}"/>
        ${rows.map((r, k) => `<circle class="gh-dot" cx="${x(k)}" cy="${y(r.lead)}" r="${k === n - 1 ? 4.5 : 0}"/>`).join('')}
        ${rows.map((r, k) => (k % every === 0 || k === n - 1 ? `<text class="gh-tick" x="${x(k)}" y="${H - 12}" text-anchor="middle">Q${k + 1}</text>` : '')).join('')}
      </svg>
      <p class="px-note">${esc(summary)}</p>
    </figure>`;
  }
  function niceStep(maxAbs) { for (const s of [250, 500, 1000, 2000, 5000, 10000, 20000, 60000]) if (maxAbs / s <= 3) return s; return 120000; }
}
