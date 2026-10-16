/* Pattern Wall (#/games/wall): paint a number grid, discover a pattern, name it from word lists, write its rule
   from tiles and pin it to your own wall. Patterns that are not in the catalog can be saved as a
   conjecture after testing them on more numbers. Routes: #/games/wall, #/games/wall/wall, #/games/wall/famous,
   #/games/wall/card/<code> (a shared card). Logic in wall-core.js. */
import { level, store, rng, shuffle, tone, sfx, PENTA, say, confetti, toast, track, esc, token, b64url, shareUrl, share, downloadCanvas, dayKey, reducedMotion, backLink } from '../kit.js';
import { on } from '../life.js';
import * as W from './wall-core.js';

const KEY = 'wall';
const now = new Date();
const CAL = { y: now.getFullYear(), m: now.getMonth() + 1 };
const gridFor = (id, gp) => W.makeGrid(id, id === 'calendar' ? gp || CAL : {});
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function mount({ root, signal, params }) {
  const lv = level();
  const D = store.get(KEY, null) || {};
  D.cards = D.cards || []; D.nick = Number.isInteger(D.nick) ? D.nick : null;
  const save = () => store.set(KEY, D);
  const wrap = document.createElement('div'); wrap.className = 'md-wrap wl'; root.append(wrap);
  const GRID_IDS = lv === 'explorer' ? ['hundred', 'times', 'meru', 'calendar'] : Object.keys(W.GRIDS);
  const TOOL_IDS = lv === 'explorer' ? ['mult', 'square', 'tri', 'prime'] : Object.keys(W.TOOLS);

  if (params[0] === 'card' && params[1]) return sharedCard(params[1]);
  const tab = ['wall', 'famous'].includes(params[0]) ? params[0] : 'work';
  wrap.innerHTML = `
    <div class="px-head px-head--sun">
      ${backLink()}
      <p class="md-kicker">Name what you discover</p>
      <h1 class="md-heading px-title">Pattern Wall</h1>
      <p class="md-lede px-intro">${lv === 'explorer' ? 'Color the numbers. When a pattern appears, give it your name and put it on your wall.' : 'Paint a number grid. When your colors make a real pattern, name it, write its rule, and pin it to your own wall. Mathematicians do exactly this: notice, name, test.'}</p>
    </div>
    <div class="wl-tabs" role="tablist" aria-label="Pattern Wall">
      <a role="tab" href="#/games/wall" aria-selected="${tab === 'work'}" class="wl-tab">Workspace</a>
      <a role="tab" href="#/games/wall/wall" aria-selected="${tab === 'wall'}" class="wl-tab">My wall <span class="wl-count">${D.cards.length}</span></a>
      <a role="tab" href="#/games/wall/famous" aria-selected="${tab === 'famous'}" class="wl-tab">Famous patterns</a>
    </div>
    <div class="wl-body" role="tabpanel"></div>`;
  const body = wrap.querySelector('.wl-body');
  if (tab === 'wall') return wallView();
  if (tab === 'famous') return famousView();
  return workspace();

  /* ---------- Workspace ---------- */
  function workspace() {
    const S = { g: GRID_IDS.includes(params[0]) ? params[0] : 'hundred', tool: null, mode: 'new', k: 3, s: 9, rm: [1, 4], painted: new Set(), focus: 0, flow: null };
    let grid = gridFor(S.g);
    body.innerHTML = `
      <div class="wl-gridpick" role="group" aria-label="Choose a grid">${GRID_IDS.map(id => `<button type="button" class="md-chip wl-gp" data-grid="${id}" aria-pressed="${id === S.g}">${esc(W.GRIDS[id].title)}<small>${esc(id === 'calendar' ? monthName(CAL) : W.GRIDS[id].short)}</small></button>`).join('')}</div>
      <div class="wl-work">
        <section class="wl-canvas px-stage" aria-label="Number grid"><div class="wl-grid-wrap"></div><p class="wl-help px-note">Tap numbers to paint them, or use a paint tool. Arrow keys move, Space paints.</p></section>
        <section class="wl-tools px-stage" aria-label="Paint tools">
          <h2 class="wl-h">Paint tools</h2>
          <div class="wl-toolrow" role="group" aria-label="Tools">${TOOL_IDS.map(id => `<button type="button" class="wl-tool" data-tool="${id}" aria-pressed="false">${esc(W.TOOLS[id].label)}</button>`).join('')}</div>
          <div class="wl-param"></div>
          <div class="wl-mode" role="group" aria-label="How tools paint">${[['new', 'Fresh'], ['add', 'Add'], ['overlap', 'Overlap']].map(([m, l]) => `<button type="button" class="md-chip" data-mode="${m}" aria-pressed="${m === S.mode}">${l}</button>`).join('')}</div>
          <div class="px-row"><button type="button" class="md-btn md-btn--sm wl-clear">Clear</button><span class="wl-painted" aria-live="polite"></span></div>
          <div class="wl-status" aria-live="polite"></div>
        </section>
      </div>`;
    const $ = s => body.querySelector(s);
    const gwrap = $('.wl-grid-wrap'), status = $('.wl-status');

    const drawGrid = () => {
      gwrap.innerHTML = gridHtml(grid, S.painted, true);
      const cells = gwrap.querySelectorAll('.wl-c');
      cells.forEach(b => { b.tabIndex = +b.dataset.i === S.focus ? 0 : -1; });
    };
    const refreshCells = (pulse) => {
      gwrap.querySelectorAll('.wl-c').forEach(b => {
        const on_ = S.painted.has(+b.dataset.i);
        if (b.classList.contains('is-on') !== on_) { b.classList.toggle('is-on', on_); if (pulse && !reducedMotion()) { b.style.animationDelay = `${(+b.dataset.i % 23) * 12}ms`; b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop'); } }
        b.setAttribute('aria-pressed', String(on_));
      });
      $('.wl-painted').textContent = `${S.painted.size} painted`;
      check();
    };
    const drawParam = () => {
      const t = S.tool, el = $('.wl-param');
      if (t === 'mult') el.innerHTML = stepper('k', 'Multiples of', S.k, 2, 12);
      else if (t === 'dsum') el.innerHTML = stepper('s', 'Digits add to', S.s, 1, 18);
      else if (t === 'rem') el.innerHTML = stepper('r', 'Remainder', S.rm[0], 0, S.rm[1] - 1) + stepper('m', 'after dividing by', S.rm[1], 2, 12);
      else el.innerHTML = '';
    };
    const paramOf = t => (t === 'mult' ? S.k : t === 'dsum' ? S.s : t === 'rem' ? S.rm : null);
    const useTool = () => {
      if (!S.tool) return;
      S.painted = W.applyTool(grid, S.painted, S.tool, paramOf(S.tool), S.mode);
      tone(PENTA[4 + (S.k % 5)], { dur: 0.18, type: 'sine', gain: 0.08 });
      say(`Painted ${W.TOOLS[S.tool].say(paramOf(S.tool))}. ${S.painted.size} numbers painted.`);
      refreshCells(true);
    };
    const setGrid = id => { S.g = id; grid = gridFor(id); S.painted = new Set(); S.focus = 0; S.flow = null; body.querySelectorAll('[data-grid]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.grid === id))); drawGrid(); refreshCells(); history.replaceState(null, '', `#/games/wall/${id}`); };

    /* Matching and the discovery flow */
    let lastKey = '';
    function check() {
      const m = W.match(grid, S.painted);
      const key = [...S.painted].sort((a, b) => a - b).join('.');
      if (key === lastKey && S.flow) return; lastKey = key;
      S.flow = null;
      if (m.length) {
        const fresh = m.find(x => !hasCard(x.pattern.id, x.variant.key)) || m[0];
        const have = hasCard(fresh.pattern.id, fresh.variant.key);
        S.flow = { kind: 'found', p: fresh.pattern, v: fresh.variant, have };
        if (!have) { sfx('magic'); confetti(40); track('wall/discover', fresh.pattern.id); }
        return discovery();
      }
      if (S.painted.size >= 3) status.innerHTML = `<div class="wl-none"><p>${lv === 'explorer' ? 'No famous pattern yet. Keep painting!' : 'No pattern from the catalog matches this painting yet.'}</p><button type="button" class="md-btn md-btn--sm wl-conj">Is it a pattern? Test my idea</button></div>`;
      else status.innerHTML = `<p class="px-note">${S.painted.size ? 'Paint at least 3 numbers.' : lv === 'explorer' ? 'Try the Multiples tool, then look at the shape.' : 'Try a tool, then look for a shape: stripes, diagonals, columns.'}</p>`;
    }
    function hasCard(pid, k) { return D.cards.some(c => c.p === pid && c.k === k); }
    function discovery() {
      const { p, v, have } = S.flow;
      status.innerHTML = `<div class="wl-found${have ? ' is-have' : ''}">
        <p class="wl-found-k">${have ? 'Already on your wall' : 'Pattern discovered!'}</p>
        <h3 class="wl-found-t">${esc(p.title)}</h3>
        <p>${esc(p.blurb)}</p>
        ${have ? `<p class="px-note">You named it ${esc(W.nameOf(D.cards.find(c => c.p === p.id && c.k === v.key).name))}. Try another tool or grid.</p>` : '<button type="button" class="md-btn md-btn--primary wl-name-it">Name it and pin it</button>'}
      </div>`;
      say(`${have ? 'Already on your wall' : 'Pattern discovered'}: ${p.title}. ${p.blurb}`);
    }
    /* Naming and rule writing, shared by discoveries and conjectures */
    function builder(kind) {
      const p = kind === 'found' ? S.flow.p : null, v = kind === 'found' ? S.flow.v : null;
      const r0 = rng((Math.random() * 2 ** 32) >>> 0);
      const B = { name: W.suggestName(r0, D.nick ?? Math.floor(r0() * 30)), s: null, c: null, result: null };
      const canon = p ? W.ruleFor(p, v.key) : null;
      const subj = p ? shuffle(r0, [...new Set([canon.s, 'painted', ...shuffle(r0, ['odd', 'even', 'prime', 'square', 'mult:3', 'mult:9', 'all']).slice(0, 2)])]) : (lv === 'explorer' ? ['painted', 'odd', 'even', 'square', 'mult:2', 'mult:3', 'mult:5', 'mult:10'] : Object.keys(W.SUBJECTS));
      const claimsAll = lv === 'explorer' ? ['odd', 'even', 'prime', 'notprime', 'square', 'end05', 'endeven', 'mult:2', 'mult:3', 'mult:5', 'same', 'step:10'] : ['odd', 'even', 'prime', 'notprime', 'square', 'tri', 'end05', 'endodd', 'endeven', 'next6', 'twoprimes', 'repdigit', 'dsmult3', 'ds:9', 'dr:9', 'dr369', 'mult:2', 'mult:3', 'mult:4', 'mult:5', 'mult:6', 'mult:9', 'same', 'step:1', 'step:7', 'step:9', 'step:10', 'step:11', 'sumfib', 'sumpow2'];
      const claims = p ? shuffle(r0, [canon.c, ...p.decoys.filter(d => W.CLAIMS[d])]) : claimsAll;
      const draw = () => {
        const nick = D.nick;
        status.innerHTML = `<div class="wl-build">
          ${p ? `<p class="wl-found-k">Pattern discovered</p><h3 class="wl-found-t">${esc(p.title)}</h3>` : `<p class="wl-found-k">My conjecture</p><p class="px-note">A conjecture is a pattern you think is true. Build the rule, then test it on more numbers.</p>`}
          <h4 class="wl-h">1. Name it</h4>
          ${nick === null ? `<p class="px-note">First, who is the discoverer? Pick your explorer name.</p><div class="wl-nicks" role="group" aria-label="Discoverer name">${W.NICKS.map((n, i) => `<button type="button" class="md-chip" data-nick="${i}">${esc(n)}</button>`).join('')}</div>` : `
          <p class="wl-name" aria-live="polite">${esc(W.nameOf(B.name))}</p>
          <div class="wl-wheels">${wheel('adj', 'Describing word', W.ADJ[B.name[1]])}${wheel('noun', 'Thing word', W.NOUN[B.name[2]])}<button type="button" class="md-btn md-btn--sm wl-shuffle">Shuffle</button><button type="button" class="md-btn md-btn--sm wl-renick">Change name</button></div>`}
          <h4 class="wl-h">2. Write the rule</h4>
          <p class="wl-rule-now">${B.s && B.c ? esc(W.ruleText({ s: B.s, c: B.c })) : `<span class="px-note">Pick who the rule is about, then what is true.</span>`}</p>
          <div class="wl-tiles" role="group" aria-label="Who the rule is about">${subj.map(s => `<button type="button" class="wl-tile" data-s="${s}" aria-pressed="${B.s === s}">${esc(W.SUBJECTS[s].one)}</button>`).join('')}</div>
          <div class="wl-tiles wl-tiles--c" role="group" aria-label="What is true">${claims.map(c => `<button type="button" class="wl-tile wl-tile--c" data-c="${c}" aria-pressed="${B.c === c}">${esc(B.s === 'painted' || !W.CLAIMS[c].one ? W.CLAIMS[c].many : W.CLAIMS[c].one)}</button>`).join('')}</div>
          <div class="px-row"><button type="button" class="md-btn wl-test" ${B.s && B.c ? '' : 'disabled'}>${p ? 'Check my rule' : 'Test on more numbers'}</button>
            <button type="button" class="md-btn md-btn--primary wl-save" ${B.result && (p ? B.result.ok && B.result.fits : true) && D.nick !== null ? '' : 'disabled'}>${p ? 'Pin to my wall' : 'Save as my conjecture'}</button>
            <button type="button" class="md-btn md-btn--sm wl-cancel">Back</button></div>
          <div class="wl-result" aria-live="polite">${B.result ? resultHtml(B, p) : ''}</div>
        </div>`;
      };
      const wheel = (w, label, val) => `<span class="wl-wheel" role="group" aria-label="${label}"><button type="button" data-w="${w}" data-d="-1" aria-label="Previous ${label.toLowerCase()}">‹</button><b>${esc(val)}</b><button type="button" data-w="${w}" data-d="1" aria-label="Next ${label.toLowerCase()}">›</button></span>`;
      S.flow = { ...(S.flow || {}), kind, building: true, B, draw };
      draw();
      status.querySelector('.wl-nicks button, .wl-wheel button')?.focus({ preventScroll: true });
      status.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
    function resultHtml(B, p) {
      const R = B.result, txt = W.ruleText({ s: B.s, c: B.c });
      if (R.reason === 'list-needs-painted') return `<p class="wl-no">That kind of rule is about the painted numbers together. Choose "The painted numbers" first.</p>`;
      if (!R.ok) return `<p class="wl-no">${R.counter ? `Broken! ${esc(String(R.counter))} does not fit: "${esc(txt)}"` : 'That is not true for these numbers.'} ${p ? 'Try another tile.' : 'A single counterexample is enough to break a conjecture. You can still save it to remember what you learned.'}</p>`;
      if (p && !R.fits) return `<p class="wl-no">True, but it is about different numbers than the ones you painted. Pick who the rule is about again.</p>`;
      const goldbach = B.s === 'even2' && B.c === 'twoprimes' ? ' You have found a famous one: Goldbach\'s conjecture (1742). Computers have checked it for enormous numbers, yet nobody has ever proved it.' : '';
      if (R.scope === 'numbers') return `<p class="wl-ok">It held for all ${R.tested} numbers I tried, up to ${R.upTo}.${p ? '' : ' That is strong evidence, but not a proof: a proof shows why it must always be true.'}${goldbach}</p>`;
      return `<p class="wl-ok">True for all ${R.tested} painted numbers.${p ? '' : ' Only the painted numbers were checked.'}</p>`;
    }

    /* Events */
    on(body, 'click', e => {
      const t = e.target;
      const gp = t.closest('[data-grid]'); if (gp) { setGrid(gp.dataset.grid); track('wall/grid', gp.dataset.grid); return; }
      const tl = t.closest('[data-tool]'); if (tl) { S.tool = tl.dataset.tool; body.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b === tl))); drawParam(); useTool(); return; }
      const md = t.closest('[data-mode]'); if (md) { S.mode = md.dataset.mode; body.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === md))); return; }
      const st = t.closest('[data-step]');
      if (st) {
        const k = st.dataset.k, d = +st.dataset.step;
        if (k === 'k') S.k = clamp(S.k + d, 2, 12); else if (k === 's') S.s = clamp(S.s + d, 1, 18); else if (k === 'm') { S.rm = [Math.min(S.rm[0], clamp(S.rm[1] + d, 2, 12) - 1), clamp(S.rm[1] + d, 2, 12)]; } else if (k === 'r') S.rm = [clamp(S.rm[0] + d, 0, S.rm[1] - 1), S.rm[1]];
        drawParam(); useTool(); body.querySelector(`[data-k="${k}"][data-step="${d}"]`)?.focus(); return;
      }
      if (t.closest('.wl-clear')) { S.painted = new Set(); refreshCells(); say('Cleared.'); return; }
      const c = t.closest('.wl-c'); if (c) { paintOne(+c.dataset.i); return; }
      if (t.closest('.wl-name-it')) return builder('found');
      if (t.closest('.wl-conj')) return builder('conj');
      const fl = S.flow; if (!fl || !fl.building) return;
      const B = fl.B;
      const nk = t.closest('[data-nick]'); if (nk) { D.nick = +nk.dataset.nick; B.name[0] = D.nick; save(); fl.draw(); status.querySelector('.wl-shuffle')?.focus(); return; }
      const wh = t.closest('[data-w]'); if (wh) { const j = wh.dataset.w === 'adj' ? 1 : 2, L = j === 1 ? W.ADJ : W.NOUN; B.name[j] = (B.name[j] + +wh.dataset.d + L.length) % L.length; tone(PENTA[B.name[j] % PENTA.length], { dur: 0.08, type: 'triangle', gain: 0.06 }); fl.draw(); status.querySelector(`[data-w="${wh.dataset.w}"][data-d="${wh.dataset.d}"]`)?.focus(); say(W.nameOf(B.name)); return; }
      if (t.closest('.wl-shuffle')) { const r = rng((Math.random() * 2 ** 32) >>> 0); B.name = W.suggestName(r, D.nick); fl.draw(); status.querySelector('.wl-shuffle')?.focus(); say(W.nameOf(B.name)); return; }
      if (t.closest('.wl-renick')) { D.nick = null; save(); fl.draw(); status.querySelector('[data-nick]')?.focus(); return; }
      const ts = t.closest('[data-s]'); if (ts) { B.s = ts.dataset.s; B.result = null; fl.draw(); status.querySelector(`[data-s="${CSS.escape(B.s)}"]`)?.focus(); return; }
      const tc = t.closest('[data-c]'); if (tc) { B.c = tc.dataset.c; B.result = null; fl.draw(); status.querySelector(`[data-c="${CSS.escape(B.c)}"]`)?.focus(); return; }
      if (t.closest('.wl-test')) {
        B.result = W.evalRule({ s: B.s, c: B.c }, grid, S.painted, 1000);
        const good = B.result.ok && (fl.kind === 'conj' || B.result.fits);
        if (good) sfx('ok'); else sfx('no');
        fl.draw(); say(status.querySelector('.wl-result').textContent);
        (status.querySelector('.wl-save:not(:disabled)') || status.querySelector('.wl-test'))?.focus();
        if (fl.kind === 'conj') track('wall/test', B.result.ok ? 'held' : 'broken');
        return;
      }
      if (t.closest('.wl-save')) {
        const card = { p: fl.kind === 'found' ? fl.p.id : null, k: fl.kind === 'found' ? fl.v.key : '', g: S.g, gp: S.g === 'calendar' ? grid.params : null, cells: [...S.painted].sort((a, b) => a - b), name: B.name.slice(), rule: { s: B.s, c: B.c }, test: fl.kind === 'conj' ? { ok: B.result.ok, counter: B.result.counter ?? null, tested: B.result.tested } : null, t: dayKey() };
        D.cards.unshift(card); save();
        wrap.querySelector('.wl-count').textContent = D.cards.length;
        sfx('win'); confetti(70);
        track(fl.kind === 'found' ? 'wall/pin' : 'wall/conjecture', fl.kind === 'found' ? fl.p.id : `${B.s} ${B.c}`);
        status.innerHTML = `<div class="wl-found"><p class="wl-found-k">Pinned to your wall</p><h3 class="wl-found-t">${esc(W.nameOf(card.name))}</h3><p>${esc(W.ruleText(card.rule))}</p><div class="px-row"><a class="md-btn md-btn--primary" href="#/games/wall/wall">See my wall</a><button type="button" class="md-btn wl-again">Keep exploring</button></div></div>`;
        S.flow = { kind: 'saved' };
        say(`Pinned ${W.nameOf(card.name)} to your wall.`);
        status.querySelector('.md-btn')?.focus();
        return;
      }
      if (t.closest('.wl-cancel')) { lastKey = ''; S.flow = null; check(); }
    }, signal);
    on(status, 'click', e => { if (e.target.closest('.wl-again')) { S.painted = new Set(); lastKey = ''; refreshCells(); } }, signal);
    function paintOne(i) {
      if (S.painted.has(i)) S.painted.delete(i); else S.painted.add(i);
      const n = grid.cells[i].n;
      tone(PENTA[n % PENTA.length], { dur: 0.08, type: 'triangle', gain: 0.06 });
      S.focus = i; gwrap.querySelectorAll('.wl-c').forEach(b => { b.tabIndex = +b.dataset.i === i ? 0 : -1; });
      refreshCells();
    }
    /* Keyboard: arrows move between cells (roving focus), Space or Enter paints */
    on(gwrap, 'keydown', e => {
      const b = e.target.closest('.wl-c'); if (!b) return;
      const c = grid.cells[+b.dataset.i];
      const mv = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[e.key];
      if (mv) {
        e.preventDefault();
        const tr = c.r + mv[0], tc = c.c + mv[1];
        const nx = grid.cells.find(x => x.r === tr && x.c === tc) || (mv[0] && grid.cells.filter(x => x.r === tr).sort((a, z) => Math.abs(a.c - c.c) - Math.abs(z.c - c.c))[0]);
        if (nx) { S.focus = nx.i; gwrap.querySelectorAll('.wl-c').forEach(x => { x.tabIndex = +x.dataset.i === nx.i ? 0 : -1; }); gwrap.querySelector(`[data-i="${nx.i}"]`).focus(); }
      }
    }, signal);
    drawGrid(); refreshCells();
  }

  /* ---------- My wall ---------- */
  function wallView() {
    if (!D.cards.length) { body.innerHTML = `<div class="wl-empty px-stage"><p class="wl-found-t">Your wall is empty</p><p>${lv === 'explorer' ? 'Paint some numbers and find a pattern to pin here.' : 'Find a pattern in the workspace, name it, and it will hang here with your rule.'}</p><a class="md-btn md-btn--primary" href="#/games/wall">Go to the workspace</a></div>`; return; }
    const found = D.cards.filter(c => c.p).length, conj = D.cards.length - found;
    body.innerHTML = `<p class="wl-sum">${found} discover${found === 1 ? 'y' : 'ies'}${conj ? `, ${conj} conjecture${conj === 1 ? '' : 's'}` : ''}. ${lv === 'explorer' ? 'You are a pattern finder.' : 'Every card is a rule you found yourself.'}</p><ul class="wl-cards">${D.cards.map((c, i) => `<li>${cardHtml(c, i)}</li>`).join('')}</ul>`;
    on(body, 'click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const i = +b.dataset.i, c = D.cards[i];
      if (b.dataset.act === 'link') { track('wall/share', 'link'); share({ title: W.nameOf(c.name), text: `${W.nameOf(c.name)}: ${W.ruleText(c.rule)}`, url: shareUrl('#/games/wall/card/' + b64url.enc(W.encodeCard(c))) }); }
      if (b.dataset.act === 'image') { track('wall/share', 'image'); downloadCanvas(cardCanvas(c), `${W.nameOf(c.name).replace(/[^\w]+/g, '-').toLowerCase()}.png`); }
      if (b.dataset.act === 'remove') {
        if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Really remove?'; return; }
        D.cards.splice(i, 1); save(); toast('Removed from your wall'); wrap.querySelector('.wl-count').textContent = D.cards.length; wallView();
      }
    }, signal);
  }
  function cardHtml(c, i, shared = false) {
    const g = gridFor(c.g, c.gp), p = c.p && W.patternById(c.p);
    const badge = p ? `<span class="wl-badge">Discovery</span>` : c.test?.ok ? `<span class="wl-badge wl-badge--conj">Conjecture · held for ${c.test.tested} tests</span>` : `<span class="wl-badge wl-badge--broken">Conjecture · broken by ${esc(String(c.test?.counter ?? '?'))}</span>`;
    return `<article class="wl-card${p ? '' : ' is-conj'}" aria-label="${esc(W.nameOf(c.name))}">
      <div class="wl-card-art">${miniSvg(g, new Set(c.cells))}</div>
      ${badge}
      <h3 class="wl-card-t">${esc(W.nameOf(c.name))}</h3>
      <p class="wl-card-rule">${esc(W.ruleText(c.rule))}</p>
      <p class="wl-card-meta">${esc(W.GRIDS[c.g].title)}${c.g === 'calendar' && c.gp ? `, ${esc(monthName(c.gp))}` : ''}${p ? ` · ${esc(p.title)}` : ''}</p>
      ${shared ? '' : `<div class="wl-card-acts"><button type="button" class="md-btn md-btn--sm" data-act="link" data-i="${i}">Share link</button><button type="button" class="md-btn md-btn--sm" data-act="image" data-i="${i}">Save image</button><button type="button" class="md-btn md-btn--sm wl-rm" data-act="remove" data-i="${i}" aria-label="Remove ${esc(W.nameOf(c.name))}">Remove</button></div>`}
    </article>`;
  }

  /* ---------- Famous patterns ---------- */
  function famousView() {
    const fam = W.PATTERNS.filter(p => p.history);
    body.innerHTML = `<p class="wl-sum">Patterns other people found first. Can you find them yourself? Open the grid and paint until the pattern appears.</p>
      <ul class="wl-famous">${fam.map(p => { const got = D.cards.some(c => c.p === p.id); const g = gridFor(p.grid); const ok = GRID_IDS.includes(p.grid);
        return `<li class="wl-fam px-stage${got ? ' is-got' : ''}"><div class="wl-fam-art" aria-hidden="true">${got ? miniSvg(g, W.variantsOf(p, g)[0].set) : miniSvg(g, new Set())}</div>
          <div><p class="wl-found-k">${got ? 'Found by you' : esc(W.GRIDS[p.grid].title)}</p><h3 class="wl-found-t">${esc(p.famous || p.title)}</h3><p>${esc(p.history)}</p>
          ${ok ? `<a class="md-btn md-btn--sm" href="#/games/wall/${p.grid}">${got ? 'Paint it again' : 'Try to find it'}</a>` : '<p class="px-note">Switch to Challenger or Pro to open this grid.</p>'}</div></li>`; }).join('')}</ul>`;
  }

  /* ---------- A shared card ---------- */
  function sharedCard(code) {
    let c = null; try { c = W.decodeCard(b64url.dec(code)); } catch (e) { c = null; }
    if (!c) { wrap.innerHTML = `<div class="px-head px-head--sun"><a class="px-back" href="#/games/wall">&larr; Pattern Wall</a><h1 class="md-heading px-title">That card did not open</h1><p class="md-lede">The link may be cut short. Ask for it again.</p></div>`; return; }
    const have = D.cards.some(x => W.encodeCard(x) === W.encodeCard(c));
    wrap.innerHTML = `<div class="px-head px-head--sun"><a class="px-back" href="#/games/wall">&larr; Pattern Wall</a><p class="md-kicker">A pattern card someone shared</p><h1 class="md-heading px-title">${esc(W.nameOf(c.name))}</h1></div>
      <div class="wl-shared">${cardHtml(c, 0, true)}<div class="px-row"><button type="button" class="md-btn md-btn--primary wl-add" ${have ? 'disabled' : ''}>${have ? 'Already on your wall' : 'Pin it to my wall too'}</button><a class="md-btn" href="#/games/wall/${c.g}">Find it yourself</a></div></div>`;
    on(wrap.querySelector('.wl-add'), 'click', e => { D.cards.unshift({ ...c, t: dayKey() }); save(); e.target.disabled = true; e.target.textContent = 'Pinned to your wall'; sfx('ok'); say('Pinned to your wall.'); track('wall/import', c.p || 'conjecture'); }, signal);
  }

  /* ---------- Rendering helpers ---------- */
  function gridHtml(g, painted, live) {
    const cell = c => `<button type="button" class="wl-c${painted.has(c.i) ? ' is-on' : ''}${g.id === 'roots' ? ` wl-dr${W.digitalRoot(c.n)}` : ''}" data-i="${c.i}" aria-pressed="${painted.has(c.i)}" aria-label="${c.n}${g.id === 'roots' ? `, digital root ${W.digitalRoot(c.n)}` : g.id === 'times' ? `, ${c.r + 1} times ${c.c + 1}` : g.id === 'meru' ? `, row ${c.r}` : ''}"><span>${c.n}</span>${g.id === 'roots' ? `<small>${W.digitalRoot(c.n)}</small>` : ''}</button>`;
    if (g.layout === 'tri') return `<div class="wl-tri" role="group" aria-label="Meru-prastāra, 12 rows">${Array.from({ length: g.rows }, (_, r) => `<div class="wl-tri-row">${g.cells.filter(c => c.r === r).map(cell).join('')}</div>`).join('')}</div>`;
    const head = g.id === 'calendar' ? `<div class="wl-cal-head" aria-hidden="true">${WEEK.map(d => `<span>${d}</span>`).join('')}</div><p class="wl-cal-m">${esc(monthName(g.params))}</p>` : g.id === 'times' ? '' : '';
    return `${head}<div class="wl-grid wl-grid--${g.id}" role="group" aria-label="${esc(W.GRIDS[g.id].title)}" style="--cols:${g.cols}">${g.cells.map(c => `<div class="wl-slot" style="grid-row:${c.r + 1};grid-column:${c.c + 1}">${cell(c)}</div>`).join('')}</div>`;
  }
}

function stepper(k, label, v, lo, hi) {
  return `<span class="wl-step" role="group" aria-label="${label}"><span>${label}</span><button type="button" data-k="${k}" data-step="-1" aria-label="${label}: less" ${v <= lo ? 'disabled' : ''}>−</button><b aria-live="polite">${v}</b><button type="button" data-k="${k}" data-step="1" aria-label="${label}: more" ${v >= hi ? 'disabled' : ''}>+</button></span>`;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const monthName = gp => new Date(gp.y, gp.m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

/* A small picture of a grid with painted cells (SVG) */
function miniSvg(g, painted) {
  const u = 10;
  if (g.layout === 'tri') {
    const w = g.rows * u;
    return `<svg viewBox="0 0 ${w} ${g.rows * u}" class="wl-mini">${g.cells.map(c => `<rect class="${painted.has(c.i) ? 'is-on' : ''}" x="${w / 2 + (c.k - c.r / 2) * u - u / 2 + 0.6}" y="${c.r * u + 0.6}" width="${u - 1.2}" height="${u - 1.2}" rx="2"/>`).join('')}</svg>`;
  }
  return `<svg viewBox="0 0 ${g.cols * u} ${g.rows * u}" class="wl-mini">${g.cells.map(c => `<rect class="${painted.has(c.i) ? 'is-on' : ''}" x="${c.c * u + 0.6}" y="${c.r * u + 0.6}" width="${u - 1.2}" height="${u - 1.2}" rx="2"/>`).join('')}</svg>`;
}
/* A share image of a card, drawn with the current theme's tokens */
function cardCanvas(c) {
  const g = gridFor(c.g, c.gp), painted = new Set(c.cells), cv = document.createElement('canvas');
  const Wd = 720, H = 900; cv.width = Wd; cv.height = H;
  const x = cv.getContext('2d');
  const col = n => token(n) || 'gray';
  x.fillStyle = col('--bg'); x.fillRect(0, 0, Wd, H);
  x.fillStyle = col('--sun'); x.fillRect(0, 0, Wd, 14);
  x.fillStyle = col('--ink'); x.font = '700 40px Fredoka, sans-serif'; x.textBaseline = 'top';
  wrapText(x, W.nameOf(c.name), 48, 50, Wd - 96, 46);
  const top = 170, size = 480, n = g.layout === 'tri' ? g.rows : Math.max(g.cols, g.rows), u = size / n, left = (Wd - (g.layout === 'tri' ? g.rows : g.cols) * u) / 2;
  x.font = `600 ${Math.max(9, u * 0.36)}px "Nunito Sans", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const cl of g.cells) {
    const cx = g.layout === 'tri' ? Wd / 2 + (cl.k - cl.r / 2) * u - u / 2 : left + cl.c * u, cy = top + cl.r * u, on_ = painted.has(cl.i);
    x.fillStyle = on_ ? col('--sun') : col('--bg-alt'); roundRect(x, cx + 2, cy + 2, u - 4, u - 4, Math.min(8, u / 5)); x.fill();
    x.fillStyle = on_ ? col('--on-accent') : col('--ink-muted'); x.fillText(String(cl.n), cx + u / 2, cy + u / 2);
  }
  x.textAlign = 'left'; x.textBaseline = 'top'; x.fillStyle = col('--ink'); x.font = '700 28px "Nunito Sans", sans-serif';
  const yEnd = wrapText(x, W.ruleText(c.rule), 48, top + size + 40, Wd - 96, 36);
  const pat = c.p && W.patternById(c.p);
  x.fillStyle = pat ? col('--coral-strong') : col('--teal-strong'); x.font = '800 22px "Nunito Sans", sans-serif';
  x.fillText(pat ? `Discovery: ${pat.title}` : c.test?.ok ? `Conjecture: held for ${c.test.tested} tests, not yet proved` : `Conjecture: broken by ${c.test?.counter ?? '?'}`, 48, yEnd + 52);
  x.fillStyle = col('--ink-muted'); x.font = '600 22px "Nunito Sans", sans-serif';
  x.fillText('Pattern Wall · Vedic Math · sbmadhav.com/vedic-math', 48, H - 56);
  return cv;
}
function wrapText(x, text, l, t, w, lh) { let line = '', y = t; for (const word of text.split(' ')) { const tryL = line ? line + ' ' + word : word; if (x.measureText(tryL).width > w && line) { x.fillText(line, l, y); line = word; y += lh; } else line = tryL; } x.fillText(line, l, y); return y; }
function roundRect(x, l, t, w, h, r) { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }
