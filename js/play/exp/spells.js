/* Sutra Spellbook (#/dojo/spells): every speed trick is a spell you cast by tracing its method on the digits.
   Routes: #/dojo/spells (the arena), #/dojo/spells/book (your spellbook), #/dojo/spells/learn/<id> (a guided first cast).
   Logic lives in spells-core.js; this file is the board, the monsters and the pages. */
import { head, level, t, store, rng, int, pick, tone, sfx, PENTA, say, confetti, toast, track, reducedMotion, esc } from '../kit.js';
import { on, later, loop, child } from '../life.js';
import * as C from './spells-core.js';

const KEY = 'spells';
const blank = () => ({ learned: [], book: {}, tier: {}, streak: {}, misses: {}, sparkles: 0, best: 0, pace: 'calm', since: 0, focus: '' });
const STEP_COLORS = ['teal', 'coral', 'sun'];
const SVGNS = 'http://www.w3.org/2000/svg';
const NODE_NAMES = { a1: 'top tens', a0: 'top units', b1: 'bottom tens', b0: 'bottom units', n: 'the number', m: 'its one-less twin', z: 'the nines', B: 'the base line', da: 'gap of the top number', db: 'gap of the bottom number', d: 'the gap', e: 'the gap again' };
const nodeName = n => (NODE_NAMES[n.id] || `digit ${+n.id.slice(1) + 1}`);
const freshSeed = () => (Math.random() * 2 ** 32) >>> 0;

/* ---------- The casting board ---------- */
/* Renders a spell board for one problem into host. opts: guided (show the next stroke), slow (longer
   reveals), onStep(step, cast), onFizzle(text), onDone(value). Returns { cast, showHint() }. */
function castBoard(host, { spell, problem, guided = false, slow = false, signal, onStep = () => {}, onFizzle = () => {}, onDone = () => {} }) {
  const ctl = child(signal), sig = ctl.signal;
  const board = spell.board(problem), cast = C.newCast(board);
  const byId = Object.fromEntries(board.nodes.map(n => [n.id, n]));
  let selected = null, hint = guided, finished = false;
  const { w: VW, h: VH } = C.VIEW;
  host.innerHTML = `
    <div class="sp-eq" aria-live="off"><span class="sp-eq-q">${esc(C.show(problem))}</span><span class="sp-eq-is">=</span><span class="sp-ans" aria-label="Answer so far"></span></div>
    <div class="sp-board" role="group" aria-label="Spell board for ${esc(C.show(problem))}. Draw across digits, or press one digit and then another to join them.">
      <svg class="sp-ink" viewBox="0 0 ${VW} ${VH}" aria-hidden="true">
        <g class="sp-guide"></g><g class="sp-lines"></g><path class="sp-trail" d=""/><g class="sp-puffs"></g>
      </svg>
      <div class="sp-nodes"></div>
      <div class="sp-notes" aria-hidden="true"></div>
    </div>
    <ol class="sp-ledger" aria-label="Steps cast"></ol>
    <p class="sp-say"></p>`;
  const el = host.querySelector('.sp-board'), svg = host.querySelector('.sp-ink'), trail = svg.querySelector('.sp-trail');
  const gLines = svg.querySelector('.sp-lines'), gGuide = svg.querySelector('.sp-guide'), gPuffs = svg.querySelector('.sp-puffs');
  const ledger = host.querySelector('.sp-ledger'), nodesBox = host.querySelector('.sp-nodes'), notes = host.querySelector('.sp-notes'), sayEl = host.querySelector('.sp-say'), ansEl = host.querySelector('.sp-ans');
  const pct = (x, y) => `left:${(x / VW) * 100}%;top:${(y / VH) * 100}%`;

  const drawNodes = () => {
    const vis = C.visibleNodes(board, cast);
    nodesBox.innerHTML = vis.map(n => `<button type="button" class="sp-node${n.base ? ' sp-node--base' : ''}${n.hidden ? ' is-hidden' : ''}${n.ghost ? ' is-ghost' : ''}${n.morphed ? ' is-morphed' : ''}${String(n.label).length > 2 ? ' is-wide' : ''}${selected === n.id ? ' is-sel' : ''}" data-id="${n.id}" style="${pct(n.x, n.y)}" ${n.hidden ? 'tabindex="-1" aria-hidden="true"' : ''} aria-label="${esc(`${n.ghost ? 'Empty twin' : n.label}, ${nodeName(n)}`)}" aria-pressed="${selected === n.id}">${n.hidden ? '?' : esc(n.label)}${n.morphed && n.morph.tag ? `<small>${esc(n.morph.tag)}</small>` : ''}</button>`).join('');
  };
  /* Redrawing replaces the digit buttons, so keyboard focus would fall to the page: when focus was on a digit,
     put it back on the same digit (or on want, the digit just pressed) */
  let keep = null;
  const redraw = (want = keep) => {
    const was = nodesBox.contains(document.activeElement) ? document.activeElement.dataset.id : null;
    drawNodes();
    if (!was) return;
    const find = id => id && nodesBox.querySelector(`.sp-node[data-id="${id}"]:not(.is-hidden)`);
    const b = find(want) || find(was) || nodesBox.querySelector('.sp-node:not(.is-hidden)');
    if (b) b.focus({ preventScroll: true });
  };
  const drawAnswer = () => {
    const a = C.assemble(board.parts, C.partsDone(board, cast));
    ansEl.innerHTML = a.cells.slice().reverse().map(c => `<span class="sp-cell is-${c.state}">${c.carryIn ? `<i class="sp-carry">+${c.carryIn}</i>` : ''}${esc(c.text)}</span>`).join('');
    return a;
  };
  const line = (k, cls) => {
    const [x, y] = k.split('|').map(id => byId[id]);
    const l = document.createElementNS(SVGNS, 'line');
    l.setAttribute('x1', x.x); l.setAttribute('y1', x.y); l.setAttribute('x2', y.x); l.setAttribute('y2', y.y);
    l.setAttribute('class', cls); return l;
  };
  const note = (keys, text, color, along = 0.5, extra = '') => {
    const pts = keys.flatMap(k => k.split('|').map(id => byId[id]).sort((p, q) => p.y - q.y));
    const x = keys.length > 1 ? pts.reduce((s, p) => s + p.x, 0) / pts.length : pts[0].x + (pts[1].x - pts[0].x) * along;
    const y = keys.length > 1 ? pts.reduce((s, p) => s + p.y, 0) / pts.length : pts[0].y + (pts[1].y - pts[0].y) * along;
    const n = document.createElement('span'); n.className = `sp-note sp-note--${color}${slow ? ' is-slow' : ''} ${extra}`; n.style.cssText = pct(x, y); n.textContent = text;
    notes.append(n);
  };
  const drawGuide = () => {
    gGuide.innerHTML = '';
    if (!hint || finished) return;
    const i = board.steps.findIndex((s, k) => !cast.done[k] && s.after.every(j => cast.done[j]));
    if (i < 0) return;
    const opt = board.steps[i].opts.find(o => [...cast.got[i]].every(k => o.includes(k))) || board.steps[i].opts[0];
    const miss = opt.filter(k => !cast.got[i].has(k));
    miss.forEach(k => gGuide.append(line(k, 'sp-ghost')));
    if (miss.length && !reducedMotion()) {
      /* a ghost fingertip that keeps tracing the next stroke */
      const [x, y] = miss[0].split('|').map(id => byId[id]).sort((p, q) => p.y - q.y || p.x - q.x);
      const f = document.createElementNS(SVGNS, 'circle'); f.setAttribute('r', 11); f.setAttribute('class', 'sp-finger');
      const mo = document.createElementNS(SVGNS, 'animateMotion');
      mo.setAttribute('dur', '1.8s'); mo.setAttribute('repeatCount', 'indefinite'); mo.setAttribute('path', `M${x.x} ${x.y} L${y.x} ${y.y}`);
      mo.setAttribute('keyPoints', '0;0;1;1'); mo.setAttribute('keyTimes', '0;0.2;0.75;1'); mo.setAttribute('calcMode', 'linear');
      f.append(mo); gGuide.append(f);
    }
    sayEl.innerHTML = `<b>${esc(board.steps[i].name)}.</b> ${esc(board.steps[i].say)}.`;
  };
  const status = () => {
    if (finished) return;
    const i = board.steps.findIndex((s, k) => !cast.done[k] && s.after.every(j => cast.done[j]));
    if (!hint) sayEl.textContent = i === 0 && !cast.got[0].size ? t({ explorer: 'Trace the spell with your finger.', challenger: 'Trace the spell across the digits.', pro: 'Trace the method.' }) : 'Keep going.';
    drawGuide();
  };

  const fizzle = (res, at) => {
    const f = C.fizzleText(board, cast, res);
    trail.classList.remove('is-live'); trail.classList.add('is-fizzle');
    const [x, y] = at || [VW / 2, VH / 2];
    for (let i = 0; i < 5; i++) {
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', x + int(Math.random, -18, 18)); c.setAttribute('cy', y + int(Math.random, -14, 10)); c.setAttribute('r', 6 + i * 2);
      c.setAttribute('class', 'sp-puff'); c.style.animationDelay = i * 60 + 'ms'; gPuffs.append(c);
    }
    later(() => { gPuffs.innerHTML = ''; trail.setAttribute('d', ''); trail.classList.remove('is-fizzle'); }, 900, sig);
    const pf = pick(Math.random, ['Pfft!', 'Fzzt!', 'Phhbt!', 'Puff!', 'Fwump!']);
    sayEl.innerHTML = `<span class="sp-fizz">${pf}</span> That stroke made <b>${esc(f.calc)}</b>. ${esc(f.hint)}`;
    say(`${pf} That stroke made ${f.calc}. ${f.hint}`);
    tone(150, { dur: 0.25, type: 'sawtooth', gain: 0.05 }); tone(110, { dur: 0.3, type: 'triangle', gain: 0.08, when: 0.08 });
    el.classList.remove('is-shake'); void el.offsetWidth; el.classList.add('is-shake');
    onFizzle(f);
  };

  const apply = (keys, at) => {
    for (const k of keys) {
      const res = C.applyEdge(board, cast, k);
      if (res.kind === 'dup') continue;
      if (res.kind !== 'ok') { fizzle(res, at); redraw(); return; }
      const color = STEP_COLORS[res.step % 3];
      gLines.append(line(k, `sp-lit sp-lit--${color}`));
      const s = board.steps[res.step];
      tone(PENTA[Math.min(PENTA.length - 1, 2 + res.step * 2 + cast.got[res.step].size)], { dur: 0.16, type: 'triangle', gain: 0.1 });
      if (s.partial) {
        /* one diagonal of a pair: show its own product a third of the way along */
        const [x, y] = k.split('|').map(id => byId[id]);
        if (/^\d+$/.test(x.label) && /^\d+$/.test(y.label)) note([k], String(x.label * y.label), color, 0.3, 'is-part');
      }
      if (res.complete) {
        const keysOfStep = s.opts.find(o => o.every(x => cast.got[res.step].has(x)));
        const val = s.note.includes('= ') ? s.note.split('= ').pop() : '';
        if (val) { notes.querySelectorAll('.is-part').forEach(n => n.remove()); note(keysOfStep, val, color); }
        ledger.insertAdjacentHTML('beforeend', `<li class="sp-led--${color}">${esc(s.name)}<b>${esc(s.note)}</b></li>`);
        sayEl.innerHTML = `<b>${esc(s.name)}:</b> ${esc(s.note)}`;
        say(`${s.name}: ${s.note}`);
        onStep(res.step, cast);
      }
    }
    redraw(); const a = drawAnswer();
    if (C.castDone(cast) && !finished) {
      finished = true; gGuide.innerHTML = '';
      el.classList.add('is-cast');
      sayEl.innerHTML = `<span class="sp-fizz sp-fizz--win">${pick(Math.random, ['Zing!', 'Shazam!', 'Whoosh!', 'Ta-da!'])}</span> Spell cast.`;
      later(() => { sfx('magic'); onDone(a.value); }, slow ? 700 : 260, sig);
    } else status();
  };

  /* Pointer strokes: the path in board coordinates, hit-tested against the digit nodes on release */
  let pts = null, pid = null;
  const toView = e => { const r = el.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * VW, ((e.clientY - r.top) / r.height) * VH]; };
  const live = (path = pts) => {
    const ids = C.pathNodes(path, C.visibleNodes(board, cast));
    nodesBox.querySelectorAll('.sp-node').forEach(b => b.classList.toggle('is-touch', ids.includes(b.dataset.id)));
    return ids;
  };
  on(el, 'pointerdown', e => {
    if (finished || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); pid = e.pointerId; try { el.setPointerCapture(pid); } catch (er) {}
    pts = [toView(e)]; trail.setAttribute('d', `M${pts[0].join(' ')}`); trail.classList.add('is-live'); live();
  }, sig);
  on(el, 'pointermove', e => {
    if (!pts || e.pointerId !== pid) return;
    const p = toView(e), last = pts[pts.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 2) return;
    pts.push(p); trail.setAttribute('d', 'M' + pts.map(q => q.map(v => v.toFixed(1)).join(' ')).join(' L')); live();
  }, sig);
  const end = e => {
    if (!pts || e.pointerId !== pid) return;
    const path = pts; pts = null;
    const ids = live(path); nodesBox.querySelectorAll('.is-touch').forEach(b => b.classList.remove('is-touch'));
    if (ids.length === 1) { trail.setAttribute('d', ''); trail.classList.remove('is-live'); tap(ids[0]); return; }
    if (ids.length === 0) { trail.setAttribute('d', ''); trail.classList.remove('is-live'); return; }
    selected = null;
    apply(C.pathEdges(ids), path[path.length - 1]);
    if (!trail.classList.contains('is-fizzle')) { trail.classList.remove('is-live'); trail.setAttribute('d', ''); }
  };
  on(el, 'pointerup', end, sig); on(el, 'pointercancel', end, sig);

  /* Taps and keys: pick one digit, then another, to join them */
  const tap = id => {
    if (finished) return;
    if (!selected) { selected = id; tone(660, { dur: 0.05, type: 'triangle', gain: 0.06 }); redraw(id); return; }
    if (selected === id) { selected = null; redraw(id); return; }
    const a = selected; selected = null;
    const at = [(byId[a].x + byId[id].x) / 2, (byId[a].y + byId[id].y) / 2];
    keep = id; apply([C.ek(a, id)], at); keep = null;
  };
  on(nodesBox, 'click', e => { const b = e.target.closest('.sp-node'); if (b && e.detail === 0) tap(b.dataset.id); }, sig);
  on(nodesBox, 'keydown', e => { if (e.key === 'Escape' && selected) { const id = selected; selected = null; redraw(id); } }, sig);

  drawNodes(); drawAnswer(); status();
  return { cast, board, showHint() { hint = true; drawGuide(); }, stop: () => ctl.abort() };
}

/* ---------- Monsters (friendly; their HP is the answer they are hiding) ---------- */
const BODIES = [
  'M18 88 C10 60 16 26 50 20 C84 26 90 60 82 88 Z',
  'M22 88 C16 70 14 40 30 28 C40 12 60 12 70 28 C86 40 84 70 78 88 Z',
  'M14 88 C14 66 22 40 34 34 C30 22 40 16 50 24 C60 16 70 22 66 34 C78 40 86 66 86 88 Z'
];
const monsterSvg = v => `<svg class="sp-m-svg" viewBox="0 0 100 100" aria-hidden="true">
  <ellipse class="sp-m-shadow" cx="50" cy="93" rx="32" ry="5"/>
  <path class="sp-m-body" d="${BODIES[v % 3]}"/>
  <g class="sp-m-eyes"><circle class="sp-m-white" cx="38" cy="50" r="10"/><circle class="sp-m-white" cx="62" cy="50" r="10"/><circle class="sp-m-pupil" cx="40" cy="52" r="4.5"/><circle class="sp-m-pupil" cx="64" cy="52" r="4.5"/></g>
  <path class="sp-m-mouth" d="M40 70 Q50 78 60 70"/>
  <path class="sp-m-feet" d="M30 88 v6 M70 88 v6"/>
</svg>`;

/* ---------- Pages ---------- */
export function mount({ root, signal, params }) {
  const lv = level();
  const S = { ...blank(), ...store.get(KEY, {}) };
  const save = () => store.set(KEY, S);
  const order = C.ORDER[lv];
  const nextUnlearned = () => order.find(id => !S.learned.includes(id));
  root.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'md-wrap sp'; root.append(wrap);
  if (params[0] === 'book') return book();
  if (params[0] === 'learn' && C.spellById(params[1])) return learn(params[1]);
  if (!S.learned.length) return learn(order[0]);
  return arena();

  function crumbs(active) {
    return `<nav class="sp-tabs" aria-label="Spellbook sections">
      <a href="#/dojo/spells" ${active === 'arena' ? 'aria-current="page"' : ''}>Cast</a>
      <a href="#/dojo/spells/book" ${active === 'book' ? 'aria-current="page"' : ''}>Spellbook <b>${Object.keys(S.book).length}/${C.SPELLS.length}</b></a>
    </nav>`;
  }

  /* ----- Guided first cast ----- */
  function learn(id) {
    const spell = C.spellById(id);
    let practice = 0;
    wrap.innerHTML = `${head({ title: 'Sutra Spellbook', kicker: 'A new spell', color: 'coral' })}
      ${crumbs('learn')}
      <section class="sp-learn px-stage">
        <p class="sp-sutra-kicker">${S.learned.includes(id) ? 'Practice' : 'Learn'} in slow motion</p>
        <h2 class="sp-sutra">${esc(spell.sutra)}</h2>
        <p class="sp-meaning">“${esc(spell.meaning)}” <span class="px-note">from Bharati Krishna Tirtha's 1965 book</span></p>
        <div class="sp-castwrap sp-castwrap--learn"></div>
        <div class="sp-after" hidden></div>
      </section>`;
    const host = wrap.querySelector('.sp-castwrap'), after = wrap.querySelector('.sp-after');
    const run = () => {
      after.hidden = true;
      const r = rng(`learn:${id}:${practice}`);
      const problem = spell.gen(r, 0, lv);
      castBoard(host, {
        spell, problem, guided: true, slow: true, signal,
        onDone(value) {
          const first = !S.learned.includes(id);
          if (first) { S.learned.push(id); S.focus = id; save(); track('spells/learn', spell.title); }
          confetti(30);
          after.hidden = false;
          after.innerHTML = `<p class="sp-done-big">${esc(C.show(problem))} = <b>${value}</b></p>
            <p><b>Why it works.</b> ${esc(spell.why)}</p>
            <p class="px-note">It works for ${esc(spell.needs)}.</p>
            <div class="px-row"><a class="md-btn md-btn--primary" href="#/dojo/spells">${first ? 'Cast it on a monster' : 'Back to the monsters'}</a><button type="button" class="md-btn sp-again">Slow motion again</button></div>`;
          say(`Spell cast. ${C.show(problem)} is ${value}. ${first ? 'You learned ' + spell.sutra + '.' : ''}`);
          after.querySelector('.md-btn--primary').focus({ preventScroll: true });
          after.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
        }
      });
    };
    on(after, 'click', e => { if (e.target.closest('.sp-again')) { practice++; run(); } }, signal);
    run();
  }

  /* ----- The spellbook ----- */
  function book() {
    const learned = new Set(S.learned);
    wrap.innerHTML = `${head({ title: 'Sutra Spellbook', kicker: 'Your spellbook', intro: 'A page is inked the first time you cast its spell on a monster without help.', color: 'coral' })}
      ${crumbs('book')}
      <ul class="sp-pages">${order.map(id => {
        const s = C.spellById(id), inked = S.book[id] > 0, known = learned.has(id);
        return `<li class="sp-page${inked ? ' is-inked' : known ? ' is-known' : ''}">
          ${glyph(s)}
          <div><h2>${inked || known ? esc(s.sutra) : 'An empty page'}</h2>
          <p class="sp-page-m">${inked || known ? `“${esc(s.meaning)}”` : 'Keep casting. A new page flutters out every few clean spells.'}</p>
          ${inked ? `<p class="px-note">${esc(s.title)}. Cast ${S.book[id]} time${S.book[id] > 1 ? 's' : ''}. Power ${'★'.repeat((S.tier[id] || 0) + 1)}</p>` : known ? '<p class="px-note">Learned. Cast it once on your own to ink this page.</p>' : ''}
          ${known ? `<a class="md-btn md-btn--sm" href="#/dojo/spells/learn/${id}">Slow motion</a>` : ''}</div></li>`;
      }).join('')}</ul>
      <p class="px-note sp-honest">These speed tricks come from the sixteen sutras in Bharati Krishna Tirtha's book <i>Vedic Mathematics</i> (1965). The names are Sanskrit; the methods are modern and they work because of place value and algebra.</p>`;
  }
  function glyph(s) {
    const b = s.board(s.gen(rng('glyph:' + s.id), 0, 'challenger'));
    const byId = Object.fromEntries(b.nodes.map(n => [n.id, n]));
    const lines = b.steps.flatMap((st, i) => st.opts[0].map(k => { const [x, y] = k.split('|').map(id => byId[id]); return `<line x1="${x.x}" y1="${x.y}" x2="${y.x}" y2="${y.y}" class="sp-lit--${STEP_COLORS[i % 3]}"/>`; })).join('');
    return `<svg class="sp-glyph" viewBox="0 0 320 240" aria-hidden="true">${lines}${b.nodes.map(n => `<circle cx="${n.x}" cy="${n.y}" r="27"/>`).join('')}</svg>`;
  }

  /* ----- The arena ----- */
  function arena() {
    wrap.innerHTML = `${head({ title: 'Sutra Spellbook', color: 'coral' })}
      ${crumbs('arena')}
      <div class="sp-arena">
        <div class="sp-left">
          <div class="sp-hud">
            <span class="sp-chip" aria-label="Combo"><b class="sp-combo">×0</b> combo</span>
            <span class="sp-chip"><b class="sp-spark">${S.sparkles}</b> sparkles</span>
            <span class="px-sp"></span>
            <div class="sp-pace" role="group" aria-label="Pace">
              <button type="button" class="md-chip" data-pace="calm" aria-pressed="${S.pace === 'calm'}">Calm</button>
              <button type="button" class="md-chip" data-pace="brisk" aria-pressed="${S.pace === 'brisk'}">Brisk</button>
            </div>
          </div>
          <div class="sp-lane" aria-label="Number monsters">
            <div class="sp-ward" aria-hidden="true"></div>
            <div class="sp-ms"></div>
          </div>
          <div class="sp-spells" role="group" aria-label="Pick a spell"></div>
          <div class="sp-scroll" hidden></div>
        </div>
        <section class="sp-castwrap px-stage" aria-label="Casting"></section>
      </div>`;
    const lane = wrap.querySelector('.sp-ms'), spellsEl = wrap.querySelector('.sp-spells'), host = wrap.querySelector('.sp-castwrap');
    const comboEl = wrap.querySelector('.sp-combo'), sparkEl = wrap.querySelector('.sp-spark'), scrollEl = wrap.querySelector('.sp-scroll');
    const monsters = []; let serial = 0, target = null, chosen = null, combo = 0, current = null, clean = true, helped = false;

    const spellChips = () => {
      spellsEl.innerHTML = `<span class="sp-spells-l">${S.learned.length > 1 ? 'Which spell fits this monster?' : 'Your spell'}</span><div class="sp-spells-row">` + order.filter(id => S.learned.includes(id)).map(id => {
        const s = C.spellById(id);
        return `<button type="button" class="sp-spell" data-spell="${id}" aria-pressed="${chosen === id}"><b>${esc(s.short)}</b><small>${esc(s.sutra)}</small></button>`;
      }).join('') + '</div>';
    };
    const pickSpellFor = () => {
      if (S.focus && S.learned.includes(S.focus)) { const f = S.focus; S.focus = ''; save(); return f; }
      const ids = S.learned; return pick(Math.random, ids);
    };
    const spawn = () => {
      if (monsters.length >= 2 || !S.learned.length) return;
      const sid = pickSpellFor(), spell = C.spellById(sid);
      const problem = spell.gen(rng(freshSeed()), S.tier[sid] || 0, lv);
      const row = monsters.some(m => m.row === 0) ? 1 : 0;
      const m = { id: ++serial, sid, problem, row, p: 0, home: row === 0 ? 0.62 : 0.3, v: int(Math.random, 0, 2), color: pick(Math.random, ['coral', 'teal', 'sun']), state: 'walk', nap: false };
      const b = document.createElement('button');
      b.type = 'button'; b.className = `sp-m sp-m--${m.color} sp-m--row${row} is-enter`; b.dataset.m = m.id;
      b.setAttribute('aria-label', `Monster holding ${C.show(problem)}`);
      b.innerHTML = `${monsterSvg(m.v)}<span class="sp-m-sign">${esc(C.show(problem))}</span><span class="sp-m-hp" aria-hidden="true">HP ???</span>`;
      m.el = b; lane.append(b); monsters.push(m); place(m);
      later(() => b.classList.remove('is-enter'), 600, signal);
      if (!target) aim(m);
    };
    const place = m => m.el.style.setProperty('--p', Math.min(1, m.p).toFixed(4));
    const aim = m => {
      target = m;
      monsters.forEach(x => { x.el.classList.toggle('is-target', x === m); x.el.setAttribute('aria-pressed', String(x === m)); });
      if (S.learned.length === 1) chosen = S.learned[0];
      spellChips();
      if (chosen) begin(); else idle();
    };
    const idle = () => {
      host.innerHTML = `<p class="sp-idle">${target ? `Which spell breaks <b>${esc(C.show(target.problem))}</b>? Pick one above.` : 'Tap a monster.'}</p>`;
    };
    const begin = () => {
      if (current) current.stop();
      current = null;
      /* a defeated monster stays on screen for a moment but takes no more spells */
      if (target && target.state === 'gone') target = null;
      if (!target || !chosen) return idle();
      const spell = C.spellById(chosen);
      if (!spell.fits(target.problem)) {
        host.innerHTML = `<div class="sp-misfit"><p><span class="sp-fizz">Boing!</span> ${esc(spell.sutra)} bounces right off. It needs ${esc(spell.needs)}.</p><p class="px-note">Try another spell from your book.</p></div>`;
        say(`Boing. ${spell.sutra} needs ${spell.needs}.`);
        tone(330, { dur: 0.1, type: 'square', gain: 0.04 }); tone(220, { dur: 0.16, type: 'square', gain: 0.04, when: 0.09 });
        target.el.classList.remove('is-giggle'); void target.el.offsetWidth; target.el.classList.add('is-giggle');
        setCombo(0); return;
      }
      clean = true; helped = false; host.classList.remove('is-done');
      const m = target;
      current = castBoard(host, {
        spell, problem: m.problem, signal,
        onStep() { m.el.classList.remove('is-hit'); void m.el.offsetWidth; m.el.classList.add('is-hit'); },
        onFizzle() { clean = false; setCombo(0); m.el.classList.remove('is-giggle'); void m.el.offsetWidth; m.el.classList.add('is-giggle'); adapt(chosen, false); },
        onDone(value) { defeat(m, value, spell); }
      });
      const tools = document.createElement('div'); tools.className = 'px-row sp-tools';
      tools.innerHTML = `<button type="button" class="md-btn md-btn--sm sp-hint">Show me the next stroke</button><span class="px-note">${esc(spell.sutra)}: ${esc(spell.meaning.toLowerCase())}</span>`;
      host.append(tools);
    };
    const adapt = (sid, good) => {
      const st = { tier: S.tier[sid] || 0, streak: S.streak[sid] || 0, misses: S.misses[sid] || 0 };
      if (good) { st.streak++; st.misses = 0; } else { st.misses++; st.streak = 0; }
      const n = C.nextTier(st.tier, st.streak, st.misses);
      S.tier[sid] = n.tier; S.streak[sid] = n.streak; S.misses[sid] = n.misses; save();
    };
    const setCombo = n => { combo = n; comboEl.textContent = `×${n}`; comboEl.parentElement.classList.toggle('is-hot', n >= 3); };
    const defeat = (m, value, spell) => {
      const good = clean && !helped;
      if (good) setCombo(combo + 1);
      adapt(spell.id, good);
      const gain = good ? combo : 1;
      host.classList.add('is-done');
      S.sparkles += gain; S.best = Math.max(S.best, combo); sparkEl.textContent = S.sparkles;
      let inked = false;
      if (good && !S.book[spell.id]) { inked = true; }
      if (good) S.book[spell.id] = (S.book[spell.id] || 0) + 1;
      if (good) S.since++;
      save();
      /* Sparks are for a clean cast on your own, like the combo: not after a fizzle or with the next stroke shown */
      if (good) track('spells/cast', spell.title);
      /* HP drains from the answer to zero */
      const hp = m.el.querySelector('.sp-m-hp'), t0 = performance.now(), dur = reducedMotion() ? 1 : 700;
      m.state = 'gone'; m.el.classList.add('is-won'); m.el.disabled = true;
      if (target === m) target = null;
      loop(now => { const k = Math.min(1, (now - t0) / dur); hp.textContent = `HP ${Math.round(value * (1 - k))}`; return k < 1; }, signal);
      if (combo > 0 && combo % 5 === 0) confetti(40);
      say(`${C.show(m.problem)} is ${value}. The monster turns into ${gain} sparkle${gain > 1 ? 's' : ''}.${inked ? ' A new page is inked in your spellbook.' : ''}`);
      host.insertAdjacentHTML('beforeend', `<p class="sp-win">${esc(C.show(m.problem))} = <b>${value}</b>. ${good ? `+${gain} sparkle${gain > 1 ? 's' : ''}` : 'Cast with help: no combo this time'}${inked ? `. <b>New page inked:</b> ${esc(spell.sutra)}` : ''}</p>`);
      if (inked) { toast(`Spellbook: ${spell.sutra} inked`); [0, 2, 4, 7, 9].forEach((n, i) => tone(PENTA[n], { dur: 0.3, when: i * 0.08, gain: 0.1 })); }
      later(() => {
        m.el.remove();
        const i = monsters.indexOf(m); if (i >= 0) monsters.splice(i, 1);
        offerScroll(); spawn(); spawn();
        const left = monsters.filter(x => x.state !== 'gone');
        if (!target && left.length) aim(left.reduce((a, b) => (b.p > a.p ? b : a)));
      }, reducedMotion() ? 500 : 1500, signal);
    };
    const offerScroll = () => {
      const nx = nextUnlearned();
      if (!nx || S.since < 4) { scrollEl.hidden = true; return; }
      const s = C.spellById(nx);
      scrollEl.hidden = false;
      scrollEl.innerHTML = `<span class="sp-scroll-ic" aria-hidden="true">✦</span><p>A page fluttered out of a monster: <b>${esc(s.sutra)}</b>, “${esc(s.meaning)}”.</p><a class="md-btn md-btn--primary md-btn--sm" href="#/dojo/spells/learn/${nx}">Learn it</a>`;
      if (!scrollEl.dataset.said) { say(`A new spell page fluttered out: ${s.sutra}.`); sfx('win'); scrollEl.dataset.said = '1'; }
    };
    /* Learning a new page resets the counter toward the next one */
    if (S.focus) { S.since = 0; save(); }

    on(wrap, 'click', e => {
      const p = e.target.closest('[data-pace]');
      if (p) { S.pace = p.dataset.pace; save(); wrap.querySelectorAll('[data-pace]').forEach(b => b.setAttribute('aria-pressed', String(b === p))); say(S.pace === 'calm' ? 'Calm pace: monsters wait for you.' : 'Brisk pace: monsters walk toward the ward.'); return; }
      const mb = e.target.closest('.sp-m'); if (mb && !mb.disabled) { const m = monsters.find(x => x.id === +mb.dataset.m); if (m && m !== target) aim(m); return; }
      const sb = e.target.closest('[data-spell]');
      if (sb) {
        chosen = sb.dataset.spell; spellChips(); begin();
        const bd = host.querySelector('.sp-board') || host;
        const r = bd.getBoundingClientRect();
        if (r.bottom > innerHeight || r.top < 70) host.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
        wrap.querySelector(`[data-spell="${chosen}"]`)?.focus({ preventScroll: true });
        return;
      }
      if (e.target.closest('.sp-hint') && current) { helped = true; current.showHint(); }
    }, signal);

    /* Brisk pace: monsters walk up to the ward; one that arrives sits down for a nap and the combo resets */
    let last = performance.now();
    loop(now => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      for (const m of monsters) {
        if (m.state !== 'walk') continue;
        if (S.pace !== 'brisk') { if (m.p < m.home - 0.002) { m.p += Math.min(m.home - m.p, dt * 0.35); place(m); } continue; }
        m.p += dt / C.walkSeconds(lv, S.tier[m.sid] || 0); place(m);
        if (m.p >= 1) { m.state = 'nap'; m.el.classList.add('is-nap'); setCombo(0); say(`The ${C.show(m.problem)} monster reached the ward and dozed off. Combo reset. It is still waiting for a spell.`); sfx('no'); }
      }
    }, signal);

    spellChips(); spawn(); spawn(); offerScroll();
    if (!target) idle();
  }
}
