/* Estimation Bets (#/games/bets): guess a range, bet 1 to 3 confidence chips, see the answer with a Fermi
   breakdown, and watch your calibration grow over time. Routes: #/games/bets (play), #/games/bets/stats (calibration).
   Logic and the question bank live in bets-core.js. */
import { head, level, t, store, tone, sfx, say, confetti, track, reducedMotion, esc } from '../kit.js';
import { on, child } from '../life.js';
import * as B from './bets-core.js';

const KEY = 'bets';
const ROUND = 5;
const blank = () => ({ seen: [], history: [], best: null, rounds: 0 });
const CHIP_WORDS = { 1: 'Maybe', 2: 'Fairly sure', 3: 'Very sure' };
const signed = v => (v < 0 ? `−${-v}` : String(v));
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);

export function mount({ root, signal, params }) {
  const lv = level();
  const S = { ...blank(), ...store.get(KEY, {}) };
  const save = () => store.set(KEY, S);
  root.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'md-wrap bt'; root.append(wrap);
  let page = null;
  const fresh = () => { if (page) page.abort(); page = child(signal); return page.signal; };
  if (params[0] === 'stats') return stats();
  return round();

  function tabs(active) {
    return `<nav class="bt-tabs" aria-label="Estimation Bets sections"><a href="#/games/bets" ${active === 'play' ? 'aria-current="page"' : ''}>Play</a><a href="#/games/bets/stats" ${active === 'stats' ? 'aria-current="page"' : ''}>How calibrated am I? <b>${S.history.length}</b></a></nav>`;
  }

  /* ----- A round of five ----- */
  function round() {
    const sig = fresh();
    const qs = B.deal(lv, S.seen, ROUND, S.rounds * 7919 + S.seen.length + 1);
    let k = 0, total = 0, hits = 0, qctl = null;
    wrap.innerHTML = `${head({ title: 'Estimation Bets', intro: t({ explorer: 'Guess between two numbers. If the answer is inside, you win. Bet more chips when you feel sure.', challenger: 'Give a range you think holds the answer, then bet how sure you are. Tight and right scores best.', pro: 'Give an interval, then bet your confidence. Tight and right scores best; overconfidence costs.' }), color: 'teal' })}
      ${tabs('play')}
      <div class="bt-hud"><span class="bt-pip-row" aria-hidden="true">${qs.map(() => '<i></i>').join('')}</span><span class="bt-total" aria-live="off"><b>0</b> points</span></div>
      <section class="px-stage bt-stage"></section>
      <p class="px-note bt-rule">${esc(B.RULE)}</p>`;
    const stage = wrap.querySelector('.bt-stage'), totalEl = wrap.querySelector('.bt-total b'), pips = [...wrap.querySelectorAll('.bt-pip-row i')];
    const ask = () => {
      const q = qs[k], bd = B.bounds(q, lv);
      if (qctl) qctl.abort();
      qctl = child(sig); const qsig = qctl.signal;
      pips.forEach((p, i) => p.className = i < k ? p.className : i === k ? 'is-now' : '');
      let lo = B.fromSlider(330, bd), hi = B.fromSlider(640, bd), chips = 0;
      stage.innerHTML = `
        <p class="bt-theme"><span class="md-tag md-tag--teal">${esc(B.THEMES[q.theme])}</span><span class="bt-count">Question ${k + 1} of ${qs.length}</span></p>
        <h2 class="bt-q">${esc(q.q)}</h2>
        <div class="bt-range">
          <div class="bt-typed">
            <label>From <input class="bt-lo" inputmode="decimal" autocomplete="off" spellcheck="false" aria-describedby="btUnit"></label>
            <span class="bt-to" aria-hidden="true">to</span>
            <label>To <input class="bt-hi" inputmode="decimal" autocomplete="off" spellcheck="false" aria-describedby="btUnit"></label>
            <span class="bt-unit" id="btUnit">${esc(q.unit)}</span>
          </div>
          <div class="bt-dual" style="--dec: ${Math.round(Math.log10(bd[1] / bd[0]))}">
            <div class="bt-fill" aria-hidden="true"></div>
            <input type="range" class="bt-s-lo" min="0" max="1000" step="1" aria-label="Low end of your range">
            <input type="range" class="bt-s-hi" min="0" max="1000" step="1" aria-label="High end of your range">
          </div>
          <div class="bt-scale" aria-hidden="true"><span>${esc(B.show(bd[0]))}</span><span>each tick ×10</span><span>${esc(B.show(bd[1]))}</span></div>
          <p class="px-note bt-help">Drag the two ends or type numbers. Words work too: 3k, 2 million, 5 lakh, 1.2 crore.</p>
        </div>
        <fieldset class="bt-chips"><legend>How sure are you?</legend>
          ${[1, 2, 3].map(c => `<button type="button" class="bt-chip bt-chip--${c}" data-chips="${c}" aria-pressed="false"><span class="bt-stack" aria-hidden="true">${'<i></i>'.repeat(c)}</span><b>${c} chip${c > 1 ? 's' : ''}</b><small>${CHIP_WORDS[c]}</small></button>`).join('')}
        </fieldset>
        <p class="bt-preview" aria-live="off"></p>
        <div class="px-row"><button type="button" class="md-btn md-btn--primary bt-lock" disabled>Lock in my bet</button></div>`;
      const $ = s => stage.querySelector(s);
      const iLo = $('.bt-lo'), iHi = $('.bt-hi'), sLo = $('.bt-s-lo'), sHi = $('.bt-s-hi'), fill = $('.bt-fill'), preview = $('.bt-preview'), lock = $('.bt-lock');
      const sync = (from) => {
        if (lo > hi) [lo, hi] = [hi, lo];
        const a = Math.max(0, Math.min(1000, B.toSlider(lo, bd))), b = Math.max(0, Math.min(1000, B.toSlider(hi, bd)));
        if (from !== 'slider') { sLo.value = a; sHi.value = b; }
        if (from !== 'typed') { iLo.value = B.show(lo); iHi.value = B.show(hi); }
        fill.style.left = `${a / 10}%`; fill.style.right = `${100 - b / 10}%`;
        sLo.setAttribute('aria-valuetext', `${B.show(lo)} ${q.unit}`); sHi.setAttribute('aria-valuetext', `${B.show(hi)} ${q.unit}`);
        sLo.style.zIndex = a > 900 ? 3 : 2;
        const tight = B.tightness(lo, hi);
        preview.innerHTML = chips ? `Right: <b class="is-win">+${Math.round(tight * B.WIN[chips])}</b> · Wrong: <b class="is-lose">−${Math.round(tight * B.LOSE[chips])}</b> <span class="px-note">(tightness ${tight.toFixed(1)} of 10)</span>` : `Tightness <b>${tight.toFixed(1)}</b> of 10. Now pick your chips.`;
        lock.disabled = !chips;
      };
      on(sLo, 'input', () => { const v = +sLo.value; if (v > +sHi.value) sLo.value = sHi.value; lo = B.fromSlider(+sLo.value, bd); if (lo > hi) lo = hi; sync('slider'); }, qsig);
      on(sHi, 'input', () => { const v = +sHi.value; if (v < +sLo.value) sHi.value = sLo.value; hi = B.fromSlider(+sHi.value, bd); if (hi < lo) hi = lo; sync('slider'); }, qsig);
      const typed = (inp, which) => { const v = B.parseNum(inp.value); inp.classList.toggle('is-bad', inp.value.trim() !== '' && !(v > 0)); if (v > 0) { if (which === 'lo') lo = v; else hi = v; if (lo <= hi) sync('typed'); } };
      on(iLo, 'input', () => typed(iLo, 'lo'), qsig); on(iHi, 'input', () => typed(iHi, 'hi'), qsig);
      on(iLo, 'change', () => sync(), qsig); on(iHi, 'change', () => sync(), qsig);
      on(stage, 'click', e => {
        const c = e.target.closest('[data-chips]');
        if (c) { chips = +c.dataset.chips; stage.querySelectorAll('[data-chips]').forEach(b => b.setAttribute('aria-pressed', String(b === c))); tone(330 + chips * 110, { dur: 0.09, type: 'triangle', gain: 0.08 }); sync(); say(`${chips} chip${chips > 1 ? 's' : ''}: ${CHIP_WORDS[chips]}.`); return; }
        if (e.target.closest('.bt-lock') && chips) reveal(q, bd, lo, hi, chips);
      }, qsig);
      on(stage, 'keydown', e => { if (e.key === 'Enter' && e.target.matches('input') && chips) { e.preventDefault(); reveal(q, bd, lo, hi, chips); } }, qsig);
      sync();
      say(`Question ${k + 1}. ${q.q}`);
      stage.querySelector('.bt-q').setAttribute('tabindex', '-1');
      if (k) stage.querySelector('.bt-q').focus({ preventScroll: false });
    };

    const reveal = (q, bd, lo, hi, chips) => {
      if (qctl) qctl.abort();
      const res = B.score(lo, hi, chips, q.a);
      total += res.points; if (res.hit) hits++;
      totalEl.textContent = signed(total);
      S.history.push({ id: q.id, chips, hit: res.hit, points: res.points, w: +B.width(lo, hi).toFixed(3) }); S.history = S.history.slice(-400);
      if (!S.seen.includes(q.id)) S.seen.push(q.id);
      if (S.seen.length >= B.forLevel(lv).length) S.seen = [];
      save();
      const tb = wrap.querySelector('.bt-tabs b'); if (tb) tb.textContent = S.history.length;
      track('bets/bet', `${chips} chips ${res.hit ? 'hit' : 'miss'}`);
      pips[k].className = res.hit ? 'is-hit' : 'is-miss';
      if (res.hit) sfx(chips === 3 ? 'win' : 'ok'); else sfx('no');
      const verdict = res.hit ? (res.tight > 6 ? 'Bullseye range!' : res.tight > 3 ? 'Caught it!' : 'Caught it, with a wide net.') : (q.a < lo ? 'The answer is below your range.' : 'The answer is above your range.');
      stage.innerHTML = `
        <p class="bt-theme"><span class="md-tag md-tag--teal">${esc(B.THEMES[q.theme])}</span><span class="bt-count">Question ${k + 1} of ${qs.length}</span></p>
        <h2 class="bt-q bt-q--small">${esc(q.q)}</h2>
        <div class="bt-reveal ${res.hit ? 'is-hit' : 'is-miss'}">
          <p class="bt-answer"><span>Answer</span><b>${esc(B.show(q.a))}</b> ${esc(q.unit)}</p>
          ${numberLine(bd, lo, hi, q.a, res.hit)}
          <p class="bt-verdict"><b>${esc(verdict)}</b> You said ${esc(B.show(lo))} to ${esc(B.show(hi))} with ${chips} chip${chips > 1 ? 's' : ''}: <b class="${res.points >= 0 ? 'is-win' : 'is-lose'}">${res.points >= 0 ? '+' : '−'}${Math.abs(res.points)}</b></p>
          <p class="bt-fermi"><span>How to see it</span>${esc(q.fermi)}</p>
          <p class="px-note bt-source">Source: ${esc(q.source)}</p>
        </div>
        <div class="px-row"><button type="button" class="md-btn md-btn--primary bt-next">${k + 1 < qs.length ? 'Next question' : 'See my round'}</button></div>`;
      say(`${verdict} The answer is ${B.show(q.a)} ${q.unit}. ${res.points >= 0 ? 'Plus' : 'Minus'} ${Math.abs(res.points)} points. ${q.fermi}.`);
      const nx = stage.querySelector('.bt-next'); nx.focus({ preventScroll: true });
      stage.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
      on(nx, 'click', () => { k++; if (k < qs.length) ask(); else summary(); }, sig);
    };

    const summary = () => {
      S.rounds++; const prevBest = S.best; if (S.best == null || total > S.best) S.best = total; save();
      track('bets/round', `${hits} of ${qs.length}`);
      if (total > 0 && (prevBest == null || total > prevBest)) confetti(50);
      const cal = B.calibration(S.history);
      stage.innerHTML = `<div class="bt-sum">
          <p class="md-kicker">Round done</p>
          <p class="bt-sum-big"><b class="${total >= 0 ? 'is-win' : 'is-lose'}">${signed(total)}</b> points · ${hits} of ${qs.length} caught</p>
          ${prevBest != null && total > prevBest ? '<p class="bt-best">A new best round.</p>' : S.best != null ? `<p class="px-note">Best round so far: ${signed(S.best)} points.</p>` : ''}
          ${calChart(cal)}
          <p class="px-note">${esc(advice(cal))}</p>
          <div class="px-row"><button type="button" class="md-btn md-btn--primary bt-again">Another round</button><a class="md-btn" href="#/games/bets/stats">All my bets</a></div>
        </div>`;
      say(`Round done. ${total} points, ${hits} of ${qs.length} caught. ${advice(cal)}`);
      on(stage.querySelector('.bt-again'), 'click', () => round(), sig);
      stage.querySelector('.bt-again').focus({ preventScroll: true });
    };
    ask();
  }

  /* ----- Number line: the slider's scale, your range and the answer ----- */
  function numberLine(bd, lo, hi, a, hit) {
    const W = Math.max(320, Math.min(600, (wrap.clientWidth || 600) - 72)), H = 70, L = 18, R = 18, x = v => L + (W - L - R) * Math.max(0, Math.min(1, B.toSlider(v, bd) / 1000));
    const d0 = Math.log10(bd[0]), d1 = Math.log10(bd[1]), ticks = [];
    for (let d = Math.ceil(d0); d <= d1; d++) ticks.push(10 ** d);
    const every = ticks.length > 7 ? 2 : 1;
    const out = a < bd[0] || a > bd[1];
    return `<svg class="bt-line" viewBox="0 0 ${W} ${H}" role="img" aria-label="Your range ${esc(B.show(lo))} to ${esc(B.show(hi))}; the answer ${esc(B.show(a))} is ${hit ? 'inside' : 'outside'}.">
      <line class="bt-axis" x1="${L}" x2="${W - R}" y1="40" y2="40"/>
      ${ticks.map((v, i) => `<line class="bt-tk" x1="${x(v)}" x2="${x(v)}" y1="34" y2="46"/>${i % every === 0 ? `<text class="bt-tt" x="${x(v)}" y="64" text-anchor="middle">${esc(B.show(v))}</text>` : ''}`).join('')}
      <rect class="bt-band" x="${x(lo) - 2}" y="31" width="${Math.max(4, x(hi) - x(lo) + 4)}" height="18" rx="9"/>
      <g class="bt-mark ${hit ? 'is-hit' : 'is-miss'}" transform="translate(${x(a)} 40)"><line y1="-30" y2="-10"/><path d="M0 -6 L7 0 L0 6 L-7 0 Z"/><text y="-32" text-anchor="${x(a) < 80 ? 'start' : x(a) > W - 80 ? 'end' : 'middle'}">${out ? (a < bd[0] ? '◀ ' : '') : ''}answer${out && a > bd[1] ? ' ▶' : ''}</text></g>
    </svg>`;
  }

  /* ----- Calibration chart: for each chip count, how often you were right, against the honest band ----- */
  function calChart(cal) {
    const W = Math.max(320, Math.min(520, (wrap.clientWidth || 520) - 64)), H = 228, L = 44, R = 12, T = 22, Bm = 44, ih = H - T - Bm, cw = (W - L - R) / 3;
    const y = p => T + ih * (1 - p / 100);
    const BAND = { 1: [33, 60], 2: [60, 80], 3: [80, 100] };
    const cols = [1, 2, 3].map((c, i) => {
      const { n, hit } = cal[c], p = pct(hit, n), cx = L + cw * i + cw / 2, bw = Math.min(56, cw * 0.42);
      const [b0, b1] = BAND[c], rr = Math.min(4, (y(0) - y(p)) / 2);
      const h = y(0) - y(p), x0 = cx - bw / 2, y0 = y(p);
      const bar = n && h > 0.5 ? `<path class="bt-cbar" d="M${x0} ${y(0)} V${y0 + rr} q0 ${-rr} ${rr} ${-rr} H${x0 + bw - rr} q${rr} 0 ${rr} ${rr} V${y(0)} Z"/>` : '';
      return `<g><title>${n ? `You said ${c} chip${c > 1 ? 's' : ''} ${n} time${n > 1 ? 's' : ''} and were right ${hit}: ${p} percent. Honest for ${c} chip${c > 1 ? 's' : ''} is ${B.TARGET[c]}.` : `No ${c} chip bets yet.`}</title>
        <rect class="bt-cband" x="${cx - cw * 0.4}" y="${y(b1)}" width="${cw * 0.8}" height="${y(b0) - y(b1)}" rx="6"/>
        ${bar}
        ${n ? `<text class="bt-cval" x="${cx}" y="${Math.min(y(p) - 6, y(0) - 6)}" text-anchor="middle">${p}%</text>` : `<text class="bt-ctick" x="${cx}" y="${y(0) - 8}" text-anchor="middle">no bets</text>`}
        <text class="bt-clab" x="${cx}" y="${H - 24}" text-anchor="middle">${c} chip${c > 1 ? 's' : ''}</text>
        <text class="bt-ctick" x="${cx}" y="${H - 8}" text-anchor="middle">${hit} of ${n}</text></g>`;
    }).join('');
    const lines = [1, 2, 3].filter(c => cal[c].n).map(c => `You said ${c} chip${c > 1 ? 's' : ''} ${cal[c].n} time${cal[c].n > 1 ? 's' : ''} and were right ${cal[c].hit}.`);
    return `<figure class="bt-cal">
      <figcaption><b>How often you were right, by chips</b><span class="bt-legend"><span class="bt-key is-bar">You</span><span class="bt-key is-band">Honest zone</span></span></figcaption>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(lines.join(' ') || 'No bets yet.')}">
        ${[0, 50, 100].map(v => `<line class="bt-cgrid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="bt-ctick" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`).join('')}
        ${cols}
      </svg>
      ${lines.length ? `<ul class="bt-cal-lines">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
    </figure>`;
  }
  function advice(cal) {
    const c3 = cal[3], c1 = cal[1], n = cal[1].n + cal[2].n + cal[3].n;
    if (n < 5) return 'Play a few more rounds and your calibration picture will sharpen.';
    if (c3.n >= 3 && c3.hit / c3.n < 0.7) return 'Your 3 chip bets miss more than they should. Widen those ranges, or bet fewer chips when unsure.';
    if (c1.n >= 3 && c1.hit / c1.n > 0.8) return 'Your 1 chip bets are nearly always right. You know more than you think: bet more chips, or tighten up.';
    return 'Your chips and your hit rates line up well. That is what good number sense feels like.';
  }

  /* ----- Stats page ----- */
  function stats() {
    fresh();
    const cal = B.calibration(S.history), n = S.history.length, hit = S.history.filter(h => h.hit).length;
    const avgW = n ? S.history.reduce((s, h) => s + h.w, 0) / n : 0;
    wrap.innerHTML = `${head({ title: 'Estimation Bets', kicker: 'Calibration', intro: 'Good estimators are not always right. They know how sure they are, and their chips show it.', color: 'teal' })}
      ${tabs('stats')}
      <section class="px-stage bt-stats">
        <div class="bt-tiles">
          <div><span>Bets</span><b>${n}</b></div><div><span>Caught</span><b>${pct(hit, n)}%</b></div><div><span>Typical range</span><b>×${n ? B.show(+(10 ** avgW).toPrecision(2)) : '?'}</b></div><div><span>Best round</span><b>${S.best == null ? '?' : signed(S.best)}</b></div>
        </div>
        ${calChart(cal)}
        <p class="px-note">${esc(advice(cal))}</p>
        <h2 class="bt-h">The rule</h2>
        <p>${esc(B.RULE)}</p>
        <table class="bt-table"><caption class="px-note">Points for a range with tightness 5 (high end twice the low end)</caption>
          <thead><tr><th scope="col">Chips</th><th scope="col">Right</th><th scope="col">Wrong</th><th scope="col">Worth it when you are</th></tr></thead>
          <tbody>${[1, 2, 3].map(c => `<tr><th scope="row">${c}</th><td>+${5 * B.WIN[c]}</td><td>−${5 * B.LOSE[c]}</td><td>${c === 1 ? 'less than 60% sure' : c === 2 ? '60 to 80% sure' : 'over 80% sure'}</td></tr>`).join('')}</tbody></table>
        <p class="px-note">Your bets stay in this browser. Nothing about you is asked or sent.</p>
        <a class="md-btn md-btn--primary" href="#/games/bets">Play a round</a>
      </section>`;
  }
}
