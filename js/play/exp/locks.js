/* Discovery Locks (#/dojo/locks): puzzle machines that hide a speed trick. Feed a lock, predict it, beat it,
   then build its rule from tiles; only then does it tell you the sutra you discovered.
   Routes: #/dojo/locks (the map), #/dojo/locks/<chapter>[/<level>]. Logic lives in locks-core.js. */
import { head, level, store, rng, pick, shuffle, tone, sfx, PENTA, say, confetti, track, reducedMotion, esc } from '../kit.js';
import { on, later, loop, child } from '../life.js';
import * as L from './locks-core.js';

const KEY = 'locks';
const fresh = () => (Math.random() * 2 ** 32) >>> 0;
const fmtOut = (ch, y) => (ch.lamp ? (y ? 'lights up' : 'stays dark') : String(y));
const GEAR = (cx, cy, r, n, cls) => {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = (Math.PI * i) / n, rr = i % 2 ? r * 0.78 : r; pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`); }
  return `<g class="${cls}" style="transform-origin:${cx}px ${cy}px"><polygon points="${pts.join(' ')}"/><circle cx="${cx}" cy="${cy}" r="${(r * 0.32).toFixed(1)}" class="lk-gear-hole"/></g>`;
};

export function mount({ root, signal, params }) {
  const lv = level();
  const P = store.get(KEY, {}) || {};
  const save = () => store.set(KEY, P);
  const wrap = document.createElement('div'); wrap.className = 'md-wrap lk'; root.append(wrap);
  const ch = L.chapterById(params[0]);
  if (!ch) return map();
  const done = P[ch.id]?.done || 0;
  const want = params[1] !== undefined ? Math.max(0, Math.min(+params[1] || 0, done, L.levelsFor(lv).length - 1)) : Math.min(done, L.levelsFor(lv).length - 1);
  return play(ch, want);

  /* ---------- The map of locks ---------- */
  function map() {
    const total = L.CHAPTERS.length * L.levelsFor(lv).length;
    const got = L.CHAPTERS.reduce((s, c) => s + Math.min(L.levelsFor(lv).length, P[c.id]?.done || 0), 0);
    wrap.innerHTML = `${head({ title: 'Discovery Locks', kicker: 'Find the trick before it finds you', intro: 'Each lock hides a shortcut. Feed it numbers, guess what comes out, and when you can beat it, name its secret. Only then does it tell you which sutra you found.', color: 'teal' })}
      <p class="lk-total" aria-label="Progress">${got} of ${total} levels open</p>
      <ul class="lk-map">${L.CHAPTERS.map((c, i) => {
        const d = P[c.id]?.done || 0, n = L.levelsFor(lv).length, solved = d > 3;
        return `<li><a class="lk-card lk-card--${c.color}${d >= n ? ' is-open' : ''}" href="#/dojo/locks/${c.id}">
          <span class="lk-card-n">Lock ${i + 1}</span>
          ${padlock(d >= n)}
          <b>${esc(c.title)}</b>
          <span class="lk-card-blurb">${esc(c.blurb)}</span>
          <span class="lk-card-sutra">${solved ? `${esc(c.sutra)}` : 'Sutra hidden until you crack it'}</span>
          <span class="lk-pips" aria-label="${Math.min(d, n)} of ${n} levels">${Array.from({ length: n }, (_, k) => `<i class="${k < d ? 'is-on' : ''}"></i>`).join('')}</span>
        </a></li>`;
      }).join('')}</ul>
      <p class="px-note lk-honest">The shortcuts are speed tricks from Bharati Krishna Tirtha's 1965 book <i>Vedic Mathematics</i>. They work because of place value and a little algebra, and every lock shows you why once you crack it.</p>`;
  }
  function padlock(open) {
    return `<svg class="lk-padlock${open ? ' is-open' : ''}" viewBox="0 0 64 64" aria-hidden="true"><path class="lk-shackle" d="M20 30V20a12 12 0 0 1 24 0v10"/><rect x="12" y="28" width="40" height="30" rx="8" class="lk-body"/><circle cx="32" cy="41" r="4" class="lk-key"/><path d="M32 44v6" class="lk-keyline"/></svg>`;
  }

  /* ---------- Playing a chapter ---------- */
  function play(ch, startLevel) {
    const levels = L.levelsFor(lv);
    const C = P[ch.id] || (P[ch.id] = { done: 0, hints: 0 });
    let li = startLevel, lvl, ctl = null, tape = [], hintShown = 0, wrongs = 0;
    wrap.innerHTML = `
      <div class="px-head px-head--teal lk-head">
        <a class="px-back" href="#/dojo/locks">&larr; All locks</a>
        <p class="md-kicker">Lock ${L.CHAPTERS.indexOf(ch) + 1}</p>
        <h1 class="md-heading px-title">${esc(ch.title)}</h1>
      </div>
      <nav class="lk-levels" aria-label="Levels"></nav>
      <div class="lk-grid">
        <section class="lk-machine lk-machine--${ch.color}" aria-label="The lock">
          <svg class="lk-m-svg" viewBox="0 0 220 150" aria-hidden="true">
            <path class="lk-m-shackle" d="M80 40V26a30 30 0 0 1 60 0v14"/>
            <rect class="lk-m-body" x="10" y="36" width="200" height="108" rx="22"/>
            ${GEAR(48, 112, 18, 9, 'lk-gear lk-gear--a')}${GEAR(76, 124, 12, 7, 'lk-gear lk-gear--b')}${GEAR(178, 116, 14, 8, 'lk-gear lk-gear--c')}
            <circle class="lk-m-bolt" cx="26" cy="52" r="4"/><circle class="lk-m-bolt" cx="194" cy="52" r="4"/>
          </svg>
          <div class="lk-m-in" aria-live="off"><span class="lk-m-tag">in</span><b class="lk-in-val">?</b></div>
          <div class="lk-m-out"><span class="lk-m-tag">out</span>${ch.lamp ? '<span class="lk-bulb" aria-hidden="true"></span>' : ''}<b class="lk-out-val">?</b></div>
        </section>
        <section class="lk-panel px-stage" aria-live="off"></section>
        <section class="lk-tape" aria-label="What the lock has done so far"><h2>Evidence</h2><ol class="lk-tape-list"></ol><p class="lk-tape-empty px-note">Nothing yet. Feed the lock.</p></section>
      </div>
      <div class="lk-hintbar"><button type="button" class="md-btn md-btn--sm lk-nudge">Nudge me</button><p class="lk-hint" aria-live="polite"></p></div>`;
    const $ = s => wrap.querySelector(s);
    const panel = $('.lk-panel'), inVal = $('.lk-in-val'), outVal = $('.lk-out-val'), machine = $('.lk-machine'), tapeList = $('.lk-tape-list'), hintEl = $('.lk-hint');

    /* The panel is redrawn after each step, and a pressed button is disabled at once, so keyboard focus would
       fall to the page. Note whether focus was in the panel when a step starts, and put it back on the
       first enabled button of the new panel. */
    let focusIn = false;
    const markFocus = () => { focusIn = panel.contains(document.activeElement); };
    const refocus = sel => { if (!focusIn) return; focusIn = false; const b = [...panel.querySelectorAll(sel)].find(x => !x.disabled); if (b) b.focus({ preventScroll: true }); };
    const drawLevels = () => {
      $('.lk-levels').innerHTML = levels.map((l, i) => {
        const can = i <= C.done;
        return can ? `<a href="#/dojo/locks/${ch.id}/${i}" class="lk-lv${i === li ? ' is-now' : ''}${i < C.done ? ' is-done' : ''}" ${i === li ? 'aria-current="step"' : ''}><i>${i + 1}</i>${esc(l.name)}</a>` : `<span class="lk-lv is-locked"><i>${i + 1}</i>${esc(l.name)}</span>`;
      }).join('');
    };
    const addTape = (x, y, mine) => {
      tape.unshift({ x, y });
      $('.lk-tape-empty').hidden = true;
      const li = document.createElement('li');
      li.innerHTML = `<span>${esc(ch.ask(x))}</span><i aria-hidden="true">→</i><b class="${ch.lamp ? (y ? 'is-lit' : 'is-dark') : ''}">${esc(fmtOut(ch, y))}</b>${mine === false ? '<em>surprise</em>' : ''}`;
      tapeList.prepend(li);
      while (tapeList.children.length > 9) tapeList.lastElementChild.remove();
    };
    /* Run the machine on x: gears spin, a little melody, then the output */
    const run = (x, sig, then) => {
      inVal.textContent = ch.ask(x); outVal.textContent = '…';
      machine.classList.remove('is-lit', 'is-dark'); machine.classList.add('is-running');
      [0, 2, 4].forEach((n, i) => tone(PENTA[n + (i % 2)], { dur: 0.08, type: 'square', gain: 0.03, when: i * 0.11 }));
      later(() => {
        const y = ch.out(x);
        machine.classList.remove('is-running');
        outVal.textContent = fmtOut(ch, y);
        if (ch.lamp) machine.classList.add(y ? 'is-lit' : 'is-dark');
        outVal.classList.remove('is-pop'); void outVal.offsetWidth; outVal.classList.add('is-pop');
        tone(ch.lamp && !y ? 220 : PENTA[7], { dur: 0.16, type: 'triangle', gain: 0.08 });
        then(y);
      }, reducedMotion() ? 120 : 650, sig);
    };

    const start = i => {
      if (ctl) ctl.abort();
      ctl = child(signal); li = i; lvl = levels[i]; wrongs = 0;
      drawLevels();
      inVal.textContent = '?'; outVal.textContent = '?'; machine.classList.remove('is-open', 'is-lit', 'is-dark');
      /* Arriving straight at a later level: the lock shows a few of its answers first, so there is evidence */
      if (!tape.length && lvl.kind !== 'feed') { const r0 = rng(fresh()); for (let k = 0; k < 3; k++) { const x = ch.gen(r0, 'main', lv); addTape(x, ch.out(x)); } }
      ({ feed, predict: predictLevel, quick: predictLevel, rule, stretch: predictLevel })[lvl.kind](ctl.signal);
      refocus('.lk-offer, .lk-slot');
    };
    const cleared = () => {
      /* Sparks (js/app.js) are paid for the first clear of a level, not for replays */
      if (L.clearLevel(C, li)) { save(); track('locks/level', `${ch.title} ${li + 1}`); }
      sfx('win');
      const last = li === levels.length - 1;
      if (last) { confetti(70); machine.classList.add('is-open'); }
      panel.innerHTML = `<div class="lk-clear"><p class="lk-clear-big">${last ? 'Lock fully cracked!' : 'Level cleared'}</p>
        <p>${last ? `You found it, used it and stretched it. ${esc(ch.found ? ch.found[0].toUpperCase() + ch.found.slice(1) : ch.sutra)} is yours.` : esc(levels[li + 1].name) + ' is next.'}</p>
        <div class="px-row">${last ? '<a class="md-btn md-btn--primary" href="#/dojo/locks">Back to all locks</a>' : '<button type="button" class="md-btn md-btn--primary lk-next">Next level</button>'}</div></div>`;
      say(last ? `Lock fully cracked. You discovered ${ch.found || ch.sutra}.` : `Level cleared. Next: ${levels[li + 1].name}.`);
      drawLevels();
      panel.querySelector('.md-btn')?.focus({ preventScroll: true });
    };

    /* ----- Feed: pick inputs, watch outputs, then two predictions ----- */
    function feed(sig) {
      const r = rng(fresh());
      const offers = []; const seen = new Set();
      while (offers.length < 5) { const x = ch.gen(r, 'main', lv), k = JSON.stringify(x); if (!seen.has(k)) { seen.add(k); offers.push(x); } }
      let fed = 0; const used = new Set();
      const draw = () => {
        panel.innerHTML = `<p class="lk-say"><b>Feed the lock.</b> Pick a number and watch what comes out. ${lvl.feeds - fed > 0 ? `${lvl.feeds - fed} more to go.` : ''}</p>
          <div class="lk-offers">${offers.map((x, i) => `<button type="button" class="lk-offer" data-i="${i}" ${used.has(i) ? 'disabled' : ''}>${esc(ch.ask(x))}</button>`).join('')}</div>`;
      };
      draw();
      on(panel, 'click', e => {
        const b = e.target.closest('.lk-offer'); if (!b || b.disabled || machine.classList.contains('is-running')) return;
        markFocus();
        const x = offers[+b.dataset.i]; used.add(+b.dataset.i); b.disabled = true;
        run(x, sig, y => {
          addTape(x, y); fed++;
          say(`${ch.ask(x)} gives ${fmtOut(ch, y)}.`);
          if (fed >= lvl.feeds) later(() => predictPhase(sig, lvl.need, false, 'main', 'Now you guess before the lock does.'), 600, sig);
          else { draw(); refocus('.lk-offer'); }
        });
      }, sig);
    }

    /* ----- Predict (also quick and stretch): type what the lock will say ----- */
    function predictLevel(sig) {
      const intro = { predict: 'Guess each answer before the lock shows it.', quick: `Beat the lock: answer within ${lvl.secs} seconds.`, stretch: 'New, bigger numbers. Does your rule still hold?' }[lvl.kind];
      predictPhase(sig, lvl.need, lvl.kind === 'quick', lvl.kind === 'stretch' ? 'stretch' : 'main', intro, true);
    }
    function predictPhase(sig, need, timed, stage, intro, streakMode = false) {
      const r = rng(fresh());
      let count = 0, x, typed = '', t0 = 0, busy = false;
      const qctl = { c: null };
      const next = () => {
        if (qctl.c) qctl.c.abort();
        qctl.c = child(sig);
        let k = 0; do { x = ch.gen(r, stage, lv); k++; } while (k < 20 && tape.some(e => JSON.stringify(e.x) === JSON.stringify(x)));
        typed = ''; busy = false;
        inVal.textContent = ch.ask(x); outVal.textContent = '?'; machine.classList.remove('is-lit', 'is-dark');
        panel.innerHTML = `<p class="lk-say">${esc(intro)}</p>
          <div class="lk-goal" aria-label="${count} of ${need}">${Array.from({ length: need }, (_, i) => `<i class="${i < count ? 'is-on' : ''}"></i>`).join('')}<span>${streakMode ? 'in a row' : 'right'}</span></div>
          <div class="lk-q"><span class="lk-q-ask">${esc(ch.ask(x))}</span><span class="lk-q-arrow" aria-hidden="true">→</span>
            ${ch.lamp ? '' : `<output class="lk-q-typed" aria-label="Your guess">?</output>`}${timed ? '<span class="lk-timer" aria-hidden="true"></span>' : ''}</div>
          ${ch.lamp ? `<div class="lk-lampkeys"><button type="button" class="md-btn lk-say-lit" data-v="1"><span class="lk-mini-bulb is-lit"></span>Lights up</button><button type="button" class="md-btn lk-say-dark" data-v="0"><span class="lk-mini-bulb"></span>Stays dark</button></div>`
            : `<div class="lk-pad" role="group" aria-label="Number pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-k="${n}">${n}</button>`).join('')}<button type="button" data-k="back" aria-label="Delete">⌫</button><button type="button" data-k="0">0</button><button type="button" data-k="go" class="lk-go" aria-label="Check my guess">Go</button></div>`}
          <p class="lk-result" aria-live="polite"></p>`;
        refocus('.lk-pad button, .lk-lampkeys button');
        say(`What does the lock say for ${ch.ask(x)}?`);
        t0 = performance.now();
        if (timed) {
          const ring = panel.querySelector('.lk-timer');
          loop(now => { const k2 = Math.min(1, (now - t0) / (lvl.secs * 1000)); ring.style.setProperty('--t', k2.toFixed(3)); ring.classList.toggle('is-late', k2 >= 1); return k2 < 1 && !busy; }, qctl.c.signal);
        }
      };
      const show = () => { const o = panel.querySelector('.lk-q-typed'); if (o) o.textContent = typed || '?'; };
      const submit = guess => {
        if (busy) return; busy = true; markFocus();
        const secs = (performance.now() - t0) / 1000;
        run(x, qctl.c.signal, y => {
          const ok = guess === y, slow = timed && secs > lvl.secs;
          addTape(x, y, ok ? undefined : false);
          const res = panel.querySelector('.lk-result');
          if (ok && !slow) { count++; wrongs = 0; sfx('ok'); res.innerHTML = `<b class="lk-ok">${pick(Math.random, ['Yes!', 'Exactly.', 'You beat it.', 'Spot on.'])}</b> ${timed ? `${secs.toFixed(1)} seconds.` : ''}`; say(`Right. ${ch.ask(x)} gives ${fmtOut(ch, y)}.`); }
          else if (ok) { sfx('ok'); res.innerHTML = `<b class="lk-ok">Right,</b> in ${secs.toFixed(1)} seconds. The lock was quicker; find the shortcut and try again.`; say('Right, but a bit slow.'); }
          else {
            wrongs++; if (streakMode) count = 0;
            tone(196, { dur: 0.2, type: 'triangle', gain: 0.1 });
            if (ch.lamp) res.innerHTML = `<b class="lk-no">The lock ${y ? 'lit up' : 'stayed dark'}.</b> Add this one to your evidence.`;
            else {
              const c = L.compare(guess, y), a = String(y), g = String(guess).padStart(a.length, ' ');
              res.innerHTML = `<span class="lk-cmp"><span>You</span><span class="lk-digits">${[...String(guess)].map(d => `<i>${d}</i>`).join('')}</span><span>Lock</span><span class="lk-digits">${[...a].map((d, i) => `<i class="${d === g[i] ? 'is-same' : 'is-diff'}">${d}</i>`).join('')}</span></span><span class="lk-why">${esc(c.note)}</span>`;
            }
            say(`Not quite. The lock says ${fmtOut(ch, y)}. ${ch.lamp ? '' : L.compare(guess, y).note}`);
            if (wrongs >= 2 && hintShown < 1) nudge();
          }
          panel.querySelectorAll('.lk-goal i').forEach((el, i) => el.classList.toggle('is-on', i < count));
          if (count >= need) later(cleared, 900, qctl.c.signal);
          else { panel.querySelectorAll('.lk-pad button, .lk-lampkeys button').forEach(b => { b.disabled = true; }); later(next, ok ? 900 : 2300, qctl.c.signal); }
        });
      };
      on(panel, 'click', e => {
        const k = e.target.closest('[data-k]'); const v = e.target.closest('[data-v]');
        if (v) return submit(+v.dataset.v);
        if (!k || busy) return;
        const key = k.dataset.k;
        if (key === 'back') typed = typed.slice(0, -1);
        else if (key === 'go') { if (typed) submit(+typed); return; }
        else if (typed.length < 7) { typed += key; tone(PENTA[+key % PENTA.length], { dur: 0.05, type: 'triangle', gain: 0.05 }); }
        show();
      }, sig);
      on(document, 'keydown', e => {
        if (busy || e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
        if (ch.lamp) { if (/^[ly]$/i.test(e.key)) submit(1); else if (/^[dn]$/i.test(e.key)) submit(0); return; }
        if (/^\d$/.test(e.key) && typed.length < 7) { typed += e.key; show(); e.preventDefault(); }
        else if (e.key === 'Backspace') { typed = typed.slice(0, -1); show(); e.preventDefault(); }
        else if (e.key === 'Enter' && typed && !e.target.closest('button, a')) { submit(+typed); e.preventDefault(); }
      }, sig);
      next();
    }

    /* ----- Rule: build the shortcut from tiles; the lock tests it on many numbers ----- */
    function rule(sig) {
      const R = ch.rule(lv), ids = Object.keys(R.slots);
      const pickNow = {}; let active = ids[0];
      const order = Object.fromEntries(ids.map(id => [id, shuffle(rng(fresh()), R.slots[id].map((_, i) => i))]));
      if (tape.length < 4) { const r = rng(fresh()); while (tape.length < 4) { const x = ch.gen(r, 'main', lv); addTape(x, ch.out(x)); } }
      inVal.textContent = '?'; outVal.textContent = '?';
      const draw = (result) => {
        panel.innerHTML = `<p class="lk-say"><b>Name the rule.</b> Fill each gap with a tile. The lock will test your rule on lots of numbers.</p>
          <p class="lk-rule">${R.parts.map(p => (R.slots[p] ? `<button type="button" class="lk-slot${active === p ? ' is-active' : ''}${pickNow[p] !== undefined ? ' is-filled' : ''}" data-slot="${p}" aria-pressed="${active === p}" aria-label="Gap ${ids.indexOf(p) + 1}: ${pickNow[p] !== undefined ? esc(R.slots[p][pickNow[p]].label) : 'empty'}">${pickNow[p] !== undefined ? esc(R.slots[p][pickNow[p]].label) : '?'}</button>` : `<span>${esc(p)}</span>`)).join(' ')}</p>
          <div class="lk-tiles" role="group" aria-label="Tiles for gap ${ids.indexOf(active) + 1}">${order[active].map(i => `<button type="button" class="lk-tile" data-tile="${i}" aria-pressed="${pickNow[active] === i}">${esc(R.slots[active][i].label)}</button>`).join('')}</div>
          <div class="px-row"><button type="button" class="md-btn md-btn--primary lk-test" ${ids.every(id => pickNow[id] !== undefined) ? '' : 'disabled'}>Test my rule</button></div>
          <div class="lk-test-out">${result || ''}</div>`;
      };
      draw();
      on(panel, 'click', e => {
        const s = e.target.closest('[data-slot]'); if (s) { active = s.dataset.slot; draw(); panel.querySelector('.lk-tile')?.focus({ preventScroll: true }); return; }
        const tl = e.target.closest('[data-tile]');
        if (tl) {
          pickNow[active] = +tl.dataset.tile; tone(PENTA[3 + ids.indexOf(active)], { dur: 0.08, type: 'triangle', gain: 0.07 });
          const nx = ids.find(id => pickNow[id] === undefined); if (nx) active = nx;
          draw(); (panel.querySelector(nx ? '.lk-tile' : '.lk-test'))?.focus({ preventScroll: true }); return;
        }
        if (e.target.closest('.lk-test')) {
          const shown = tape.slice(0, 6).map(t2 => t2.x);
          const wide = L.testInputs(ch, lv, rng(`rule:${ch.id}:${lv}`), 40, false);
          const vis = L.checkRule(ch, lv, pickNow, shown), all = L.checkRule(ch, lv, pickNow, wide);
          const bad = all.rows.find(rw => !rw.ok);
          const rows = vis.rows.concat(vis.ok && bad ? [bad] : []).map(rw => `<li class="${rw.ok ? 'is-ok' : 'is-bad'}"><span>${esc(ch.ask(rw.x))}</span><span>rule: <b>${esc(fmtOut(ch, rw.got))}</b></span><span>lock: <b>${esc(fmtOut(ch, rw.want))}</b></span><i aria-label="${rw.ok ? 'match' : 'no match'}">${rw.ok ? '✓' : '✗'}</i></li>`).join('');
          if (all.ok && vis.ok) { machine.classList.add('is-open'); sfx('magic'); reveal(); return; }
          machine.classList.remove('is-rattle'); void machine.offsetWidth; machine.classList.add('is-rattle');
          tone(140, { dur: 0.12, type: 'square', gain: 0.05 }); tone(120, { dur: 0.12, type: 'square', gain: 0.05, when: 0.1 });
          const misses = (vis.ok ? all.rows : vis.rows).filter(rw => !rw.ok).length;
          markFocus();
          draw(`<p class="lk-no">The lock rattles but holds. ${vis.ok ? 'Your rule fits the evidence, but not this new number:' : `${misses} of these do not match.`}</p><ul class="lk-rows">${rows}</ul>`);
          refocus('.lk-test');
          say(`The lock holds. ${misses} numbers do not match your rule.`);
        }
      }, sig);
    }

    /* ----- Reveal: name the sutra, show why it works ----- */
    function reveal() {
      const x = tape[0]?.x ?? ch.gen(rng(1), 'main', lv);
      const lines = ch.reveal.lines(x);
      panel.innerHTML = `<div class="lk-reveal">
        <p class="lk-reveal-k">${ch.found ? `You just discovered ${esc(ch.found)}. It goes with` : 'You just discovered'}</p>
        <h2 class="lk-reveal-s">${esc(ch.sutra)}</h2>
        <p class="lk-reveal-m">“${esc(ch.meaning)}”, a sutra from Bharati Krishna Tirtha's 1965 book.${ch.credit ? ` <span class="px-note">${esc(ch.credit)}</span>` : ''}</p>
        ${ch.reveal.picture === 'area' ? area(x) : ch.reveal.picture === 'columns' ? columns(x) : ''}
        <ol class="lk-why-lines">${lines.map((l, i) => `<li style="--i:${i}">${esc(l)}</li>`).join('')}</ol>
        <div class="px-row"><button type="button" class="md-btn md-btn--primary lk-go-on">Keep going</button></div></div>`;
      say(`You just discovered ${ch.found ? `${ch.found}. ${ch.credit}` : `${ch.sutra}, ${ch.meaning}.`} ${lines.join(' ')}`);
      confetti(40);
      if (L.discover(C, levels.findIndex(l => l.kind === 'rule'))) track('locks/discover', ch.sutra);
      save();
      later(() => panel.querySelector('.lk-area')?.classList.add('is-moved'), reducedMotion() ? 0 : 1400, ctl.signal);
      on(panel.querySelector('.lk-go-on'), 'click', cleared, ctl.signal);
      panel.querySelector('.lk-go-on').focus({ preventScroll: true });
    }
    function area(x) {
      const p = typeof x === 'number' ? { t: Math.floor(x / 10), b: 5, c: 5 } : { t: Math.floor(x.a / 10), b: x.a % 10, c: x.b % 10 };
      const T = 10 * p.t, W = T + 10, H = T + p.b, pad = 2, fs = Math.max(5, W * 0.09), top = fs * 2.6;
      return `<figure class="lk-figure"><svg class="lk-area" viewBox="${-fs * 1.6} ${-top} ${W + fs * 1.6 + pad} ${H + top + pad}" style="--T:${T}px;--B:${p.b}px;--C:${p.c}px;font-size:${fs.toFixed(1)}px" role="img" aria-label="Area picture: the bottom strip of ${T} by ${p.b} swings round beside the right strip, making a ${T} by ${T + 10} rectangle and a small ${p.c} by ${p.b} corner.">
          <text class="lk-a-t" x="${T / 2}" y="${-fs * 0.5}">${T}</text><text class="lk-a-t" x="${T + p.c / 2}" y="${-fs * 0.5}">${p.c}</text>
          <text class="lk-a-t" x="${-fs * 0.8}" y="${T / 2}">${T}</text><text class="lk-a-t lk-a-before" x="${-fs * 0.8}" y="${T + p.b / 2 + fs * 0.3}">${p.b}</text>
          <g class="lk-a-after"><path class="lk-a-brace" d="M0 ${-fs * 1.6} H${W}"/><text class="lk-a-t lk-a-t--big" x="${W / 2}" y="${-fs * 1.9}">${T + 10}</text></g>
          <rect class="lk-a-big" x="0" y="0" width="${T}" height="${T}"/>
          <rect class="lk-a-strip" x="${T}" y="0" width="${p.c}" height="${T}"/>
          <g class="lk-a-swing"><rect class="lk-a-strip lk-a-strip--b" x="0" y="0" width="${T}" height="${p.b}"/></g>
          <rect class="lk-a-corner" x="${T}" y="${T}" width="${p.c}" height="${p.b}"/>
        </svg><figcaption>${T} by ${T} in the middle, two strips, one small corner. The bottom strip swings round: now it is ${T} by ${T + 10}, plus ${p.c} × ${p.b} in the corner.</figcaption></figure>`;
    }
    function columns(x) {
      const top = String(x * 10).padStart(3, ' '), bot = String(x).padStart(3, ' '), sum = String(x * 11).padStart(3, ' ');
      const row = (s, cls = '') => `<div class="lk-col-row ${cls}">${[...s].map((d, i) => `<span class="${i === 1 ? 'is-mid' : ''}">${d.trim()}</span>`).join('')}</div>`;
      return `<figure class="lk-figure"><div class="lk-cols" role="img" aria-label="${x * 10} plus ${x} equals ${x * 11}">${row(top)}${row(bot, 'is-plus')}${row(sum, 'is-sum')}</div><figcaption>Times 10 shifts the number left; adding it once more puts each digit beside its neighbor.</figcaption></figure>`;
    }

    /* ----- Hints ----- */
    const nudge = () => {
      if (hintShown >= ch.hints.length) return;
      hintEl.textContent = ch.hints[hintShown]; hintShown++; C.hints = (C.hints || 0) + 1; save();
      $('.lk-nudge').textContent = hintShown < ch.hints.length ? 'Another nudge' : 'No more nudges';
      $('.lk-nudge').disabled = hintShown >= ch.hints.length;
      tone(PENTA[5], { dur: 0.2, gain: 0.06 });
    };
    on($('.lk-nudge'), 'click', nudge, signal);
    on(panel, 'click', e => { if (e.target.closest('.lk-next')) { markFocus(); history.replaceState(null, '', `#/dojo/locks/${ch.id}/${li + 1}`); start(li + 1); } }, signal);
    start(startLevel);
  }
}
