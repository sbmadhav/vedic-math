/* Tala Lab (#/games/tala): Konnakol rhythm math. Five small scenes, each discovered by ear first and explained after.
   Routes: #/games/tala (gati), #/games/tala/necklace, #/games/tala/cycle, #/games/tala/tihai, #/games/tala/compose[/<code>].
   Konnakol and Carnatic tala are living South Indian traditions; the math is counting.
   Logic in tala-core.js, sound and the look-ahead scheduler in tala-audio.js. */
import { head, level, t, store, say, confetti, toast, track, reducedMotion, esc, muted, setMuted, share, shareUrl, b64url } from '../kit.js';
import { on, later, loop, child } from '../life.js';
import * as C from './tala-core.js';
import { hit, makeClock, schedule, listen } from './tala-audio.js';

const KEY = 'tala';
const blank = () => ({ bpm: 72, best: 0, meets: [], called: [], solved: [], sols: {}, comps: [], stars: [] });
const SVGNS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;
const pt = (cx, cy, r, turn) => [cx + r * Math.sin(turn * TAU), cy - r * Math.cos(turn * TAU)];
const f1 = v => Math.round(v * 10) / 10;
const MODES = [
  { id: 'gati', name: 'Gati', sub: 'split the beat' },
  { id: 'necklace', name: 'Necklace', sub: 'where rhythms meet' },
  { id: 'cycle', name: 'Cycle', sub: 'land on sam' },
  { id: 'tihai', name: 'Tihai', sub: 'three to land' },
  { id: 'compose', name: 'Compose', sub: 'your own loop' }
];
const HAND = { clap: 'clap', wave: 'wave', pinky: '1', ring: '2', middle: '3', count: 'count' };

/* A player: one scheduler at a time under a child signal, sharing one clock. The first play waits for the
   clock (up to 300 ms), so each play takes a generation number: a second play or a stop while one is
   waiting supersedes it, and only the newest ever starts. `on` is true while a play waits too, so a second
   click on a Play button stops instead of starting another. opts.onStop runs when a play is stopped before
   its end (a Stop, a hidden tab, or a new play); opts.onEnd when it plays to the end. */
function player(signal) {
  let ctl = null, sched = null, clock = null, gen = 0, waiting = false, live = null;
  const P = {
    async play(opts) {
      P.stop();
      const my = ++gen; live = opts; waiting = true;
      clock = clock || (await makeClock(signal));
      if (my !== gen) return null;
      waiting = false;
      if (signal.aborted) { live = null; return null; }
      ctl = child(signal);
      const mine = ctl;
      sched = schedule({ clock, signal: ctl.signal, ...opts, onEnd: () => { if (ctl === mine) { live = null; P.stop(); } opts.onEnd && opts.onEnd(); } });
      return sched;
    },
    stop() {
      gen++; waiting = false;
      const was = live; live = null;
      if (ctl) ctl.abort(); ctl = null; sched = null;
      if (was && was.onStop) was.onStop();
    },
    get on() { return !!sched || waiting; }, get sched() { return sched; }, get clock() { return clock; },
    async ensureClock() { clock = clock || (await makeClock(signal)); return clock; }
  };
  return P;
}

/* Tap input: screen tap, Space or T, and the microphone when switched on */
function tapper({ wrap, pad, signal, P, onTap }) {
  const handle = ts => { if (!P.sched) return; onTap(P.clock.fromEvent(ts)); };
  on(pad, 'pointerdown', e => { e.preventDefault(); pad.classList.remove('is-hit'); void pad.offsetWidth; pad.classList.add('is-hit'); handle(e.timeStamp); }, signal);
  on(pad, 'keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handle(e.timeStamp); } }, signal);
  on(document, 'keydown', e => {
    if (e.repeat || !P.on || !wrap.isConnected) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if ((e.code === 'Space' || e.key === 't' || e.key === 'T') && !['input', 'textarea', 'select'].includes(tag)) { e.preventDefault(); pad.classList.remove('is-hit'); void pad.offsetWidth; pad.classList.add('is-hit'); handle(e.timeStamp); }
  }, signal);
}

export function mount({ root, signal, params }) {
  const lv = level();
  const S = { ...blank(), ...store.get(KEY, {}) };
  const save = () => store.set(KEY, S);
  const mode = MODES.find(m => m.id === params[0]) ? params[0] : 'gati';
  const P = player(signal);
  root.innerHTML = `<div class="md-wrap tl">
    ${head({ title: 'Tala Lab', kicker: 'Konnakol rhythm math', intro: t({ explorer: 'Clap, listen and count. Rhythm is made of numbers.', challenger: 'In South Indian Konnakol, drummers speak rhythm in syllables. Every rhythm here is a little piece of arithmetic you can hear.', pro: 'Konnakol speaks rhythm in solkattu syllables. Gati is division, polyrhythm is the least common multiple, landing on sam is remainders, a tihai is an equation.' }), color: 'sun' })}
    <nav class="tl-tabs" aria-label="Tala Lab scenes">${MODES.map(m => `<a href="#/games/tala/${m.id}" ${m.id === mode ? 'aria-current="page"' : ''}><b>${m.name}</b><small>${m.sub}</small></a>`).join('')}</nav>
    <div class="tl-mute" ${muted() ? '' : 'hidden'}><p><b>Sound is off.</b> Tala Lab is made for listening, but every beat also lights up, so you can play with your eyes.</p><button type="button" class="md-btn md-btn--sm tl-unmute">Turn sound on</button></div>
    <div class="tl-scene"></div>
    <p class="px-note tl-honest">Konnakol and the Carnatic tala system are living South Indian music traditions, taught from teacher to student. The syllables and talas here are real; the drum sounds are made by your browser.</p>
  </div>`;
  const wrap = root.querySelector('.tl'), scene = wrap.querySelector('.tl-scene');
  on(wrap.querySelector('.tl-unmute'), 'click', () => { setMuted(false); wrap.querySelector('.tl-mute').hidden = true; hit('ta'); say('Sound on'); }, signal);
  ({ gati, necklace, cycle, tihai, compose })[mode]();
  /* a hidden tab throttles timers, so stop cleanly instead of stuttering */
  on(document, 'visibilitychange', () => { if (document.hidden && P.on) wrap.querySelector('.tl-play[aria-pressed="true"], .tl-all[aria-pressed="true"]')?.click(); if (document.hidden) P.stop(); }, signal);
  track('tala/' + mode, 'Tala ' + mode);

  /* Shared transport bits */
  function tempo(id, value, min = 40, max = 140) {
    return `<label class="tl-tempo" for="${id}"><span>Tempo <b class="tl-bpm">${value}</b> beats a minute</span><input type="range" id="${id}" min="${min}" max="${max}" step="1" value="${value}"></label>`;
  }
  function playBtn(label = 'Play') { return `<button type="button" class="md-btn md-btn--primary tl-play" aria-pressed="false"><span class="tl-play-ic" aria-hidden="true"></span><span class="tl-play-l">${label}</span></button>`; }
  function setPlaying(btn, on, label = 'Play') { btn.setAttribute('aria-pressed', String(on)); btn.querySelector('.tl-play-l').textContent = on ? 'Stop' : label; }
  function flash(el) { if (!el) return; el.classList.remove('is-on'); void el.getBoundingClientRect(); el.classList.add('is-on'); }

  /* ======================= a) Gati ======================= */
  function gati() {
    const choices = lv === 'pro' ? C.GATI_ORDER : [3, 4, 5, 7];
    let n = 3, journey = false, target = lv === 'pro' ? 'count' : 'beat', bpm = S.bpm, taps = [];
    scene.innerHTML = `
      <section class="tl-stage px-stage">
        <div class="tl-row tl-chips" role="group" aria-label="Gati: syllables in one beat">
          ${choices.map(g => `<button type="button" class="md-chip" data-g="${g}" aria-pressed="${g === n}"><b>${g}</b> ${C.GATIS[g].name}</button>`).join('')}
          <button type="button" class="md-chip tl-journey" aria-pressed="false">Journey 4 3 5 7</button>
        </div>
        <div class="tl-gati">
          <figure class="tl-wheelbox"><svg class="tl-wheel" viewBox="0 0 320 320" role="img" aria-label="One beat as a circle"></svg>
            <figcaption class="tl-frac"></figcaption></figure>
          <div class="tl-side">
            <div class="tl-transport">${playBtn()} ${tempo('tlBpm', bpm)}</div>
            <ol class="tl-strip" aria-label="Four beats of syllables"></ol>
            <div class="tl-tapbox">
              <button type="button" class="tl-pad" aria-label="Tap along. Space or T also taps."><span>Tap</span><small>or Space</small></button>
              <div class="tl-meter">
                <p class="tl-feel" aria-live="off">${t({ explorer: 'Press Play, then tap with the clap.', challenger: 'Press Play, then tap on every clap.', pro: 'Press Play, then tap every syllable.' })}</p>
                <div class="tl-dots" aria-hidden="true"><i class="tl-dots-mid"></i></div>
                <div class="tl-row tl-tapopts">
                  <div class="tl-seg" role="group" aria-label="Tap on">
                    <button type="button" class="md-chip" data-tgt="beat" aria-pressed="${target === 'beat'}">Tap the beat</button>
                    <button type="button" class="md-chip" data-tgt="count" aria-pressed="${target === 'count'}">Tap every syllable</button>
                  </div>
                  <button type="button" class="md-chip tl-mic" aria-pressed="false" aria-describedby="tlMicNote">Clap to the mic</button>
                </div>
                <p class="px-note tl-micnote" id="tlMicNote">${t({ explorer: 'The mic only listens for claps, right here. Nothing is recorded or sent.', challenger: 'Listens for your claps on this device only. Nothing is recorded or sent.', pro: 'Claps are detected on this device only. No audio is recorded, stored or sent.' })}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <details class="tl-why"><summary>What just happened?</summary>
        <p>The clap never moved. Only the space inside each beat changed: 3 syllables make thirds, 4 make quarters, 5 make fifths, 7 make sevenths. In Carnatic music this is <i>gati</i> (also called <i>nadai</i>): Tisra is 3, Chatusra 4, Khanda 5, Misra 7 and Sankirna 9.</p>
        <p>At ${bpm} beats a minute one beat lasts ${Math.round(60000 / bpm)} ms. Divide it by the gati and you get the time between syllables. The Journey mode needs a beat that can split into 3, 4, 5 and 7 at once, so it uses lcm(3, 4, 5, 7) = 420 tiny ticks per beat.</p>
      </details>`;
    const svg = scene.querySelector('.tl-wheel'), strip = scene.querySelector('.tl-strip'), frac = scene.querySelector('.tl-frac');
    const btn = scene.querySelector('.tl-play'), range = scene.querySelector('#tlBpm'), feelEl = scene.querySelector('.tl-feel'), dots = scene.querySelector('.tl-dots');
    let beads = [], word, hand, cells = [], shownN = 0;
    const drawWheel = g => {
      shownN = g;
      const R = 116, words = C.groupWords(g);
      svg.innerHTML = `<defs><radialGradient id="tlGlow"><stop offset="0" class="tl-gs0"/><stop offset="1" class="tl-gs1"/></radialGradient></defs>
        <circle cx="160" cy="160" r="150" class="tl-halo"/>
        <circle cx="160" cy="160" r="${R}" class="tl-ring"/>
        ${words.map((w, i) => { const [x1, y1] = pt(160, 160, R - 14, i / g), [x2, y2] = pt(160, 160, R + 14, i / g); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="tl-tickl"/>`; }).join('')}
        <path class="tl-sweep" d=""/>
        <g class="tl-hand"><line x1="160" y1="160" x2="160" y2="${160 - R + 20}" class="tl-handl"/><circle cx="160" cy="${160 - R}" r="7" class="tl-handd"/></g>
        ${words.map((w, i) => { const [x, y] = pt(160, 160, R, i / g); return `<g class="tl-bead${i === 0 ? ' is-one' : ''}" transform="translate(${x} ${y})"><circle r="${g > 7 ? 17 : 21}"/><text dy=".35em">${w}</text></g>`; }).join('')}
        <text x="160" y="150" class="tl-word" text-anchor="middle">${words[0]}</text>
        <text x="160" y="186" class="tl-wsub" text-anchor="middle">${C.GATIS[g]?.name || ''} · ${g} in a beat</text>`;
      beads = [...svg.querySelectorAll('.tl-bead')]; word = svg.querySelector('.tl-word'); hand = svg.querySelector('.tl-hand');
      frac.innerHTML = `1 beat = ${g} syllables. Each is <b>1/${g}</b> of a beat, <b>${C.countMs(bpm, g)} ms</b> apart.`;
    };
    const seq = () => (journey ? [4, 4, 3, 3, 5, 5, 7, 7] : [n, n, n, n]);
    const drawStrip = () => {
      const s = seq().slice(0, journey ? 8 : 4);
      strip.innerHTML = s.map((g, b) => `<li class="tl-sbeat" data-b="${b}"><span class="tl-clap" aria-hidden="true"></span>${C.groupWords(g).map((w, i) => `<span class="tl-syl${i === 0 ? ' is-one' : ''}">${w}</span>`).join('')}</li>`).join('');
      cells = [...strip.querySelectorAll('.tl-sbeat')].map(li => ({ li, syl: [...li.querySelectorAll('.tl-syl')], clap: li.querySelector('.tl-clap') }));
      strip.classList.toggle('is-journey', journey);
    };
    drawWheel(n); drawStrip();
    const pattern = () => C.gatiPattern(seq());
    const start = async () => {
      taps = []; renderDots();
      setPlaying(btn, true);
      const s = await P.play({
        pattern: pattern(), bpm,
        gainOf: e => (e.track === 'beat' ? 0.7 : e.accent ? 0.9 : 0.6),
        onCue(e) {
          if (e.track === 'beat') { flash(cells[e.beat]?.clap); if (e.n !== shownN) drawWheel(e.n); return; }
          flash(beads[e.i]); word.textContent = e.word; flash(word);
          cells.forEach(c => c.syl.forEach(x => x.classList.remove('is-now')));
          cells[e.beat]?.syl[e.i]?.classList.add('is-now');
        }
      });
      if (!s) return;
      track('tala/gati-play', journey ? 'journey' : 'gati ' + n);
      say(`Playing ${journey ? 'the gati journey' : C.GATIS[n].name + ' gati, ' + n + ' syllables a beat'}`);
    };
    const stop = () => { P.stop(); setPlaying(btn, false); cells.forEach(c => c.syl.forEach(x => x.classList.remove('is-now'))); };
    on(btn, 'click', () => (P.on ? stop() : start()), signal);
    on(range, 'input', () => { bpm = +range.value; S.bpm = bpm; save(); scene.querySelector('.tl-bpm').textContent = bpm; frac.querySelector('b + b').textContent = `${C.countMs(bpm, shownN)} ms`; if (P.sched) P.sched.setBpm(bpm); }, signal);
    on(scene.querySelector('.tl-chips'), 'click', e => {
      const b = e.target.closest('[data-g]'), j = e.target.closest('.tl-journey');
      if (b) { n = +b.dataset.g; journey = false; }
      else if (j) journey = !journey; else return;
      scene.querySelectorAll('[data-g]').forEach(x => x.setAttribute('aria-pressed', String(!journey && +x.dataset.g === n)));
      scene.querySelector('.tl-journey').setAttribute('aria-pressed', String(journey));
      drawWheel(journey ? 4 : n); drawStrip();
      if (journey && target === 'count') setTarget('beat');
      if (P.on) start();
    }, signal);
    const setTarget = v => { target = v; scene.querySelectorAll('[data-tgt]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.tgt === v))); taps = []; renderDots(); };
    on(scene.querySelector('.tl-seg'), 'click', e => { const b = e.target.closest('[data-tgt]'); if (b) { if (journey && b.dataset.tgt === 'count') { toast('In the Journey, tap the beat: the syllables keep changing.'); return; } setTarget(b.dataset.tgt); } }, signal);

    /* The sweep: one turn per beat, read from the audio clock */
    loop(() => {
      const s = P.sched; if (!s || !hand) return;
      if (reducedMotion()) return;
      const beat = 60 / s.bpm, ph = C.mod((P.clock.now() - P.clock.latency() - s.start) / beat, 1);
      hand.setAttribute('transform', `rotate(${ph * 360} 160 160)`);
      const R = 116, [x, y] = pt(160, 160, R, ph), a0 = Math.max(0, ph - 0.22), [x0, y0] = pt(160, 160, R, a0);
      svg.querySelector('.tl-sweep').setAttribute('d', `M160 160 L${x0} ${y0} A${R} ${R} 0 0 1 ${x} ${y} Z`);
    }, signal);

    /* Taps */
    function renderDots() {
      dots.querySelectorAll('b').forEach(b => b.remove());
      taps.slice(-14).forEach((ms, i, arr) => { const b = document.createElement('b'); const g = C.feel(ms, lv).grade; b.className = 'tl-dot g' + g; b.style.left = `calc(50% + ${Math.max(-1, Math.min(1, ms / 160)) * 46}%)`; b.style.opacity = String(0.35 + 0.65 * ((i + 1) / arr.length)); dots.append(b); });
    }
    const pad = scene.querySelector('.tl-pad');
    const judge = (time, mic) => {
      const s = P.sched; if (!s) return;
      const beat = 60 / s.bpm, step = target === 'count' ? beat / n : beat;
      const r = C.nearestPulse(time, s.start, step); taps.push(r.ms);
      const f = C.feel(r.ms, lv), avg = C.meanAbs(taps.slice(-8));
      feelEl.innerHTML = `<b class="g${f.grade}">${f.text}</b> ${lv === 'explorer' ? '' : `<span>${r.ms > 0 ? '+' : ''}${Math.round(r.ms)} ms</span>`}${taps.length >= 4 ? ` <small>average ${avg} ms off</small>` : ''}${mic ? ' <small>(mic)</small>' : ''}`;
      renderDots();
      if (taps.length >= 8 && avg <= 30 && (!S.best || avg < S.best)) { S.best = avg; save(); toast(`New personal best: ${avg} ms average`); track('tala/best', 'Tap best'); }
      if (taps.length % 8 === 0) say(`${f.text}. Average ${avg} milliseconds off.`);
    };
    tapper({ wrap, pad, signal, P, onTap: time => judge(time, false) });
    micToggle(scene.querySelector('.tl-mic'), time => { if (!P.on) return; pad.classList.remove('is-hit'); void pad.offsetWidth; pad.classList.add('is-hit'); judge(time, true); });
  }

  /* Microphone toggle: opt in with a click (the browser asks), explained next to the button before that,
     processed here, never stored. Off again on a second click, a hidden tab or leaving the page. */
  function micToggle(btn, onClap) {
    let stopMic = null, pending = false;
    const off = () => { if (stopMic) { stopMic(); stopMic = null; } btn.setAttribute('aria-pressed', 'false'); btn.textContent = 'Clap to the mic'; };
    on(btn, 'click', async () => {
      /* a second click while the permission prompt is open must not ask for a second stream */
      if (pending) return;
      if (stopMic) { off(); return; }
      pending = true; btn.setAttribute('aria-busy', 'true');
      try {
        const clock = await P.ensureClock();
        const stop = await listen({ clock, signal, detector: C.onsetDetector(), onClap });
        /* the page was left or hidden while the browser was asking: the stream that arrives goes straight off */
        if (signal.aborted || document.hidden) { stop(); return; }
        stopMic = stop;
        btn.setAttribute('aria-pressed', 'true'); btn.textContent = 'Mic on (stays on this device)';
        toast('Listening for claps. Headphones help it ignore the drums.'); track('tala/mic', 'Mic on');
      } catch (e) { off(); if (!signal.aborted) toast('No microphone here. Tapping works just as well.'); }
      finally { pending = false; btn.removeAttribute('aria-busy'); }
    }, signal);
    on(document, 'visibilitychange', () => { if (document.hidden && stopMic) { off(); say('Microphone off'); } }, signal);
  }

  /* ======================= b) Polyrhythm necklace ======================= */
  function necklace() {
    let list = [3, 4], guess = 0, reveal = false, played = 0, bpm = Math.max(S.bpm, 84);
    const three = lv === 'pro';
    scene.innerHTML = `
      <section class="tl-stage px-stage tl-nk">
        <div class="tl-row tl-pick">
          ${[0, 1, 2].map(i => `<div class="tl-step tl-step--${i}" ${i === 2 && !three ? 'hidden' : ''}><span class="tl-step-l">${['Rhythm A', 'Rhythm B', 'Rhythm C'][i]}</span>
            <button type="button" class="tl-stepb" data-i="${i}" data-d="-1" aria-label="Fewer counts for ${['A', 'B', 'C'][i]}">&minus;</button><b class="tl-stepv" aria-live="off">${list[i] || 0}</b><button type="button" class="tl-stepb" data-i="${i}" data-d="1" aria-label="More counts for ${['A', 'B', 'C'][i]}">+</button></div>`).join('')}
          ${three ? '<button type="button" class="md-chip tl-third" aria-pressed="false">Add a third</button>' : ''}
        </div>
        <div class="tl-gears" aria-hidden="true"></div>
        <p class="tl-ask"></p>
        <ol class="tl-line" aria-label="Counts. Pick the count where you think they first meet."></ol>
        <div class="tl-transport">${playBtn('Play and see')} ${tempo('tlNkBpm', bpm, 50, 160)}</div>
        <div class="tl-result" aria-live="off"></div>
      </section>
      <details class="tl-why"><summary>Why do they meet there?</summary>
        <p>Count 1, 2, 3 and so on. Rhythm A strikes on every multiple of A, rhythm B on every multiple of B. They strike together on numbers that are multiples of both: the common multiples. The first one is the <b>least common multiple</b>, lcm(A, B).</p>
        <p>When A and B share no factor (3 and 4), the lcm is A × B. When they share one (4 and 6 share 2), they meet sooner: 4 × 6 ÷ 2 = 12. Drummers feel this as two cycles that drift apart and come home together.</p>
      </details>`;
    const gears = scene.querySelector('.tl-gears'), line = scene.querySelector('.tl-line'), ask = scene.querySelector('.tl-ask'), result = scene.querySelector('.tl-result'), btn = scene.querySelector('.tl-play');
    let rings = [], cellsEl = [];
    const L = () => C.lcmAll(list), span = () => Math.min(120, Math.max(L(), Math.min(list.reduce((p, x) => p * x, 1), 36)));
    const draw = () => {
      const k = list.length, W = k === 3 ? 600 : 440, cx = i => (W / (k * 2)) * (2 * i + 1);
      gears.innerHTML = `<svg viewBox="0 0 ${W} 240" class="tl-gsvg">
        <circle class="tl-bloom" cx="${W / 2}" cy="120" r="40"/>
        ${list.map((a, i) => `<g class="tl-gear tl-gear--${i}" data-i="${i}">
          <circle cx="${cx(i)}" cy="120" r="${k === 3 ? 74 : 86}" class="tl-gring"/>
          <path d="M${cx(i) - 9} 18 L${cx(i) + 9} 18 L${cx(i)} 32 Z" class="tl-gmark"/>
          <g class="tl-grot" style="transform-origin:${cx(i)}px 120px">
            ${Array.from({ length: a }, (_, j) => { const [x, y] = pt(cx(i), 120, k === 3 ? 74 : 86, j / a); return `<circle cx="${x}" cy="${y}" r="${j === 0 ? 13 : 8}" class="tl-gb${j === 0 ? ' is-home' : ''}"/>`; }).join('')}
          </g>
          <text x="${cx(i)}" y="128" text-anchor="middle" class="tl-gnum">${a}</text>
          <text x="${cx(i)}" y="150" text-anchor="middle" class="tl-gcount">counts</text>
        </g>`).join('')}
      </svg>`;
      rings = [...gears.querySelectorAll('.tl-gear')].map(g => ({ g, rot: g.querySelector('.tl-grot'), num: g.querySelector('.tl-gcount') }));
      const n = span();
      line.innerHTML = Array.from({ length: n }, (_, i) => `<li><button type="button" class="tl-cell" data-c="${i + 1}" aria-pressed="${guess === i + 1}" aria-label="Count ${i + 1}">${i + 1}</button></li>`).join('');
      cellsEl = [null, ...line.querySelectorAll('.tl-cell')];
      ask.innerHTML = reveal ? '' : t({ explorer: `A claps every ${list[0]}. B claps every ${list[1]}${list[2] ? `. C every ${list[2]}` : ''}. When do they clap <b>together</b>? Pick a number, then play.`, challenger: `A strikes every ${list[0]} counts, B every ${list[1]}${list[2] ? `, C every ${list[2]}` : ''}. Where do they first strike together? Pick a count, then play.`, pro: `Predict the first count where ${list.join(', ')} coincide, then play.` });
      result.innerHTML = '';
    };
    const sync = () => scene.querySelectorAll('.tl-step').forEach((s, i) => { s.querySelector('.tl-stepv').textContent = list[i] || 0; });
    draw();
    on(scene.querySelector('.tl-pick'), 'click', e => {
      const b = e.target.closest('.tl-stepb'), th = e.target.closest('.tl-third');
      if (th) { if (list.length === 3) list = list.slice(0, 2); else list = [...list, 5]; th.setAttribute('aria-pressed', String(list.length === 3)); scene.querySelector('.tl-step--2').hidden = list.length < 3; }
      else if (b) { const i = +b.dataset.i; list[i] = Math.min(9, Math.max(2, list[i] + +b.dataset.d)); }
      else return;
      guess = 0; reveal = false; P.stop(); setPlaying(btn, false, 'Play and see'); sync(); draw();
      if (L() > 120) result.innerHTML = `<p class="tl-warn">These meet only at ${L()}. That is a long wait, so the line stops at 120.</p>`;
    }, signal);
    on(line, 'click', e => { const b = e.target.closest('.tl-cell'); if (!b || P.on) return; guess = +b.dataset.c; line.querySelectorAll('.tl-cell').forEach(x => x.setAttribute('aria-pressed', String(x === b))); hit('ki'); say(`Your guess: count ${guess}`); }, signal);
    const meet = count => {
      const Lv = L(), k = count / Lv;
      gears.querySelector('.tl-bloom').classList.remove('is-on'); void gears.getBoundingClientRect(); gears.querySelector('.tl-bloom').classList.add('is-on');
      cellsEl[Lv]?.classList.add('is-meet');
      if (k > 1 || reveal) return;
      reveal = true; played++;
      const right = guess === Lv, key = [...list].sort((a, b) => a - b).join('-');
      if (!S.meets.includes(key)) { S.meets.push(key); save(); }
      result.innerHTML = `<p class="tl-meet"><b>${list.join(' and ')} meet at ${Lv}.</b> ${guess ? (right ? 'You called it.' : `You guessed ${guess}.`) : ''}</p><p>${esc(C.meetWhy(list))}</p>
        <p class="px-note">${C.gcd(list[0], list[1]) === 1 ? 'Now try 4 and 6. Do they wait until 24?' : 'Pairs you have heard meet: ' + S.meets.length + '.'}</p>`;
      /* a right call is tracked (and so earns Sparks) only the first time for each pair */
      if (right) { confetti(40); if (!S.called.includes(key)) { S.called.push(key); save(); track('tala/meet-right', key); } }
      say(`They meet at ${Lv}. ${right ? 'You called it.' : ''} ${C.meetWhy(list)}`);
    };
    const start = async () => {
      draw(); if (guess) cellsEl[guess]?.setAttribute('aria-pressed', 'true');
      reveal = false; setPlaying(btn, true);
      const s = await P.play({
        pattern: C.necklacePattern(list), bpm,
        gainOf: e => (e.track === 'count' ? 0.35 : e.track === 'meet' ? (e.k === 0 ? 0 : 0.9) : 0.85),
        onCue(e) {
          if (e.track !== 'count') return;
          const count = e.k * L() + e.count;
          if (count === 0) return;
          const c = ((count - 1) % span()) + 1;
          line.querySelectorAll('.is-now').forEach(x => x.classList.remove('is-now'));
          cellsEl[c]?.classList.add('is-now');
          if (count <= span()) list.forEach((a, i) => { if (count % a === 0) cellsEl[c]?.classList.add('hit-' + i); });
          rings.forEach((r, i) => {
            r.rot.style.transition = reducedMotion() ? 'none' : `transform ${f1((60 / bpm / 2) * 0.8)}s cubic-bezier(.3,.7,.3,1)`;
            r.rot.style.transform = `rotate(${(-count / list[i]) * 360}deg)`;
            if (count % list[i] === 0) { r.g.classList.remove('is-hit'); void r.g.getBoundingClientRect(); r.g.classList.add('is-hit'); }
          });
          if (count % L() === 0) { if (count <= span()) cellsEl[c]?.classList.add('is-meet'); meet(count); }
        }
      });
      if (s) track('tala/necklace', list.join('-'));
    };
    on(btn, 'click', () => { if (P.on) { P.stop(); setPlaying(btn, false, 'Play and see'); } else start(); }, signal);
    on(scene.querySelector('#tlNkBpm'), 'input', e => { bpm = +e.target.value; scene.querySelector('.tl-bpm').textContent = bpm; if (P.sched) P.sched.setBpm(bpm); }, signal);
  }

  /* ======================= c) Tala cycle ======================= */
  function cycle() {
    const talaIds = lv === 'explorer' ? ['adi'] : ['adi', 'rupaka', 'misra', 'khanda'];
    const pChoices = lv === 'explorer' ? [3, 5] : [2, 3, 4, 5, 6, 7, 9];
    let tala = C.TALAS.adi, p = 5, k = 1, starts = [1], guess = 0, bpm = Math.min(S.bpm + 20, 110), busy = false;
    scene.innerHTML = `
      <section class="tl-stage px-stage tl-cy">
        <div class="tl-row tl-talas" role="group" aria-label="Tala">${talaIds.map(id => `<button type="button" class="md-chip" data-tala="${id}" aria-pressed="${id === tala.id}">${C.TALAS[id].name} <small>${C.TALAS[id].beats}</small></button>`).join('')}</div>
        <div class="tl-cyc">
          <figure class="tl-cycbox"><svg class="tl-csvg" viewBox="0 0 340 340" role="group" aria-label="The tala cycle. Tap a beat to guess where the next phrase starts."></svg></figure>
          <div class="tl-side">
            <p class="tl-hands"></p>
            <div class="tl-row" role="group" aria-label="Phrase length">${pChoices.map(x => `<button type="button" class="md-chip" data-p="${x}" aria-pressed="${x === p}">${x} counts</button>`).join('')}</div>
            <p class="tl-phrase"></p>
            <p class="tl-ask" aria-live="off"></p>
            <div class="tl-row"><button type="button" class="md-btn md-btn--primary tl-next">Play the next phrase</button><button type="button" class="md-btn tl-all" aria-pressed="false">Play them all</button><button type="button" class="md-btn md-btn--sm tl-reset">Start over</button></div>
            ${tempo('tlCyBpm', bpm, 50, 140)}
            <div class="tl-result"></div>
          </div>
        </div>
      </section>
      <details class="tl-why"><summary>The arithmetic of landing</summary>
        <p>Phrase 1 starts on sam (beat 1). Each phrase moves the start <span class="tl-why-p">${p}</span> beats on, and the cycle wraps around after <span class="tl-why-n">${tala.beats}</span>. So phrase k starts on beat ((k − 1) × p mod n) + 1. That is clock arithmetic: the remainder after dividing by the cycle.</p>
        <p>The phrases come back to sam after lcm(p, n) ÷ p phrases. If p and n share no factor, every beat gets a turn, and joining the starts draws a star polygon. If they do share one, only some beats are visited and the shape is smaller.</p>
      </details>`;
    const svg = scene.querySelector('.tl-csvg'), ask = scene.querySelector('.tl-ask'), result = scene.querySelector('.tl-result'), allBtn = scene.querySelector('.tl-all');
    const R = 128, cx = 170, cy = 170;
    let beatsEl = [];
    const posOf = b => pt(cx, cy, R, (b - 1) / tala.beats);
    const draw = () => {
      const n = tala.beats;
      svg.innerHTML = `<circle cx="${cx}" cy="${cy}" r="${R + 30}" class="tl-halo"/><circle cx="${cx}" cy="${cy}" r="${R}" class="tl-ring"/>
        <path class="tl-arc" d=""/><g class="tl-star"></g>
        ${Array.from({ length: n }, (_, i) => { const [x, y] = pt(cx, cy, R, i / n), [lx, ly] = pt(cx, cy, R + 34, i / n); const h = tala.hands[i];
          return `<g class="tl-cb${i === 0 ? ' is-sam' : ''}" data-b="${i + 1}" tabindex="0" role="button" aria-label="Beat ${i + 1}, ${HAND[h]}${i === 0 ? ', sam' : ''}">
            <circle cx="${x}" cy="${y}" r="20" class="tl-cbc"/>${handIcon(h, x, y)}
            <text x="${lx}" y="${ly}" dy=".35em" text-anchor="middle" class="tl-cbn">${i === 0 ? 'sam' : i + 1}</text></g>`; }).join('')}
        <text x="${cx}" y="${cy - 6}" text-anchor="middle" class="tl-word tl-cword">${tala.beats}</text>
        <text x="${cx}" y="${cy + 22}" text-anchor="middle" class="tl-wsub tl-csub">beats in ${tala.name}</text>`;
      beatsEl = [null, ...svg.querySelectorAll('.tl-cb')];
      /* the explanation follows the chosen phrase length and tala */
      scene.querySelector('.tl-why-p').textContent = p; scene.querySelector('.tl-why-n').textContent = n;
      scene.querySelector('.tl-hands').innerHTML = `<b>${tala.name}</b>: ${tala.note}.`;
      scene.querySelector('.tl-phrase').innerHTML = `Phrase of ${p}: <span class="tl-ph">${C.phrase(p).map(w => `<i>${w}</i>`).join(' ')}</span>`;
      drawStar(); prompt();
    };
    const drawStar = () => {
      const g = svg.querySelector('.tl-star');
      g.innerHTML = starts.map((b, i) => { if (!i) return ''; const [x1, y1] = posOf(starts[i - 1]), [x2, y2] = posOf(b); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="tl-sline"/>`; }).join('');
      beatsEl.forEach((el, b) => el && el.classList.toggle('is-start', starts.includes(b)));
    };
    const prompt = () => {
      const done = starts.length > 1 && starts[starts.length - 1] === 1;
      ask.innerHTML = done ? '' : k === 1 ? t({ explorer: `The phrase starts on sam. Where will the next one start? Tap a beat.`, challenger: `Phrase 1 starts on sam. Tap the beat where phrase 2 will start, then play.`, pro: `Phrase 1 starts on sam. Predict where phrase 2 starts.` }) : `Phrase ${k} started on beat ${starts[starts.length - 1]}. Where does phrase ${k + 1} start?`;
    };
    draw();
    const pick = b => { if (busy) return; guess = b; beatsEl.forEach((el, i) => el && el.classList.toggle('is-guess', i === b)); hit('ki'); say(`Guess: beat ${b}`); };
    on(svg, 'click', e => { const g = e.target.closest('.tl-cb'); if (g) pick(+g.dataset.b); }, signal);
    on(svg, 'keydown', e => { const g = e.target.closest('.tl-cb'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(+g.dataset.b); } }, signal);
    /* play one phrase from the current start; the arc sweeps along the counts it covers */
    const nextPhrase = async () => {
      if (busy) return; busy = true;
      const from = starts[starts.length - 1] - 1, n = tala.beats, words = C.phrase(p);
      const pat = { len: p + 1, perBeat: 1, loop: false, events: [...words.map((w, i) => ({ at: i, voice: C.voiceOf(w), word: w, i, beat: C.mod(from + i, n), track: 'ph' })), ...words.map((w, i) => { const b = C.mod(from + i, n); return { at: i, voice: b === 0 ? 'sam' : tala.hands[b] === 'clap' ? 'clap' : 'wave', beat: b, track: 'tala', soft: true }; }), { at: p, voice: C.mod(from + p, n) === 0 ? 'bloom' : 'clap', beat: C.mod(from + p, n), track: 'land' }] };
      const arc = svg.querySelector('.tl-arc');
      await P.play({ pattern: pat, bpm, gainOf: e => (e.track === 'tala' ? 0.4 : e.track === 'land' ? 0.8 : 0.85),
        onCue(e) {
          if (e.track === 'ph') { flash(beatsEl[e.beat + 1]); svg.querySelector('.tl-cword').textContent = e.word; svg.querySelector('.tl-csub').textContent = `phrase ${k}, count ${e.i + 1} of ${p}`; const a0 = from / n, a1 = (from + e.i + 1) / n; arc.setAttribute('d', arcPath(cx, cy, R, a0, Math.min(a1, a0 + 0.999))); }
          if (e.track === 'land') land(C.landing(p, n, k + 1));
        }, onEnd: () => { busy = false; }, onStop: () => { busy = false; } });
    };
    const land = b => {
      k++; starts.push(b); drawStar(); flash(beatsEl[b]);
      if (!allBtn.matches('[aria-pressed="true"]')) busy = false;
      svg.querySelector('.tl-cword').textContent = b === 1 ? 'sam' : b;
      svg.querySelector('.tl-csub').textContent = b === 1 ? 'home again' : `phrase ${k} starts here`;
      const right = guess === b; guess = 0; beatsEl.forEach(el => el && el.classList.remove('is-guess'));
      const m = C.phrasesToSam(p, tala.beats);
      if (b === 1) {
        const st = C.star(p, tala.beats), key = `${tala.id}-${p}`;
        if (!S.stars.includes(key)) { S.stars.push(key); save(); }
        svg.classList.add('is-home'); later(() => svg.classList.remove('is-home'), 2400, signal);
        result.innerHTML = `<p class="tl-meet"><b>Back on sam after ${m} phrase${m > 1 ? 's' : ''}.</b> ${m} × ${p} = ${m * p} counts = ${m * p / tala.beats} cycle${m * p / tala.beats > 1 ? 's' : ''} of ${tala.beats}.</p>
          <p>${st.points === 1 ? `The phrase is exactly one cycle of ${tala.beats}, so every phrase starts on sam.` : st.points > 2 ? `The starts drew a ${st.points}-pointed ${st.step > 1 && st.step < st.points - 1 ? 'star' : 'shape'}${st.polygons > 1 ? ` (${tala.beats} and ${p} share ${st.polygons}, so only ${st.points} beats get a turn)` : ''}.` : 'The phrase fits the cycle evenly, so it just bounces between sam and the middle.'} Try another phrase length.</p>`;
        say(`Back on sam after ${m} phrase${m > 1 ? 's' : ''}. That is ${m * p} counts.`);
        if (!reducedMotion()) confetti(24);
        track('tala/cycle-home', key);
      } else { result.innerHTML = right ? `<p class="tl-ok">Yes, beat ${b}.</p>` : `<p>It started on beat ${b}. ${lv === 'explorer' ? 'Count on ' + p + ' from the last start.' : wrapText(starts[starts.length - 2], p, tala.beats, b)}</p>`; say(`Beat ${b}`); }
      prompt();
    };
    const reset = () => { P.stop(); busy = false; k = 1; starts = [1]; guess = 0; result.innerHTML = ''; allBtn.setAttribute('aria-pressed', 'false'); allBtn.textContent = 'Play them all'; svg.querySelector('.tl-arc').setAttribute('d', ''); draw(); };
    on(scene.querySelector('.tl-next'), 'click', () => { if (starts.length > 1 && starts[starts.length - 1] === 1) reset(); nextPhrase(); }, signal);
    on(scene.querySelector('.tl-reset'), 'click', reset, signal);
    /* a phrase or the whole run ends, or is stopped (a hidden tab stops the player): the scene is free again */
    const allDone = () => { busy = false; allBtn.setAttribute('aria-pressed', 'false'); allBtn.textContent = 'Play them all'; };
    on(allBtn, 'click', async () => {
      if (P.on) { reset(); return; }
      reset(); busy = true; allBtn.setAttribute('aria-pressed', 'true'); allBtn.textContent = 'Stop';
      const n = tala.beats, m = C.phrasesToSam(p, n), total = m * p, events = [];
      for (let c = 0; c <= total; c++) {
        const b = c % n; events.push({ at: c, voice: b === 0 ? 'sam' : tala.hands[b] === 'clap' ? 'clap' : 'wave', beat: b, track: 'tala', soft: true });
        if (c < total) { const i = c % p, w = C.phrase(p)[i]; events.push({ at: c, voice: C.voiceOf(w), word: w, i, beat: b, track: 'ph', ph: Math.floor(c / p) }); }
        if (c > 0 && c % p === 0) events.push({ at: c, voice: c === total ? 'bloom' : 'none', beat: b, track: 'land' });
      }
      const arc = svg.querySelector('.tl-arc');
      await P.play({ pattern: { len: total + 1, perBeat: 1, loop: false, events }, bpm, gainOf: e => (e.track === 'tala' ? 0.4 : 0.8),
        onCue(e) {
          if (e.track === 'ph') { flash(beatsEl[e.beat + 1]); svg.querySelector('.tl-cword').textContent = e.word; svg.querySelector('.tl-csub').textContent = `phrase ${e.ph + 1}`; const from = (e.ph * p) % n; arc.setAttribute('d', arcPath(cx, cy, R, from / n, Math.min((from + e.i + 1) / n, from / n + 0.999))); }
          if (e.track === 'land') land(C.mod(e.at, n) + 1);
        }, onEnd: allDone, onStop: allDone });
      track('tala/cycle-all', `${tala.id}-${p}`);
    }, signal);
    on(scene.querySelector('.tl-talas'), 'click', e => { const b = e.target.closest('[data-tala]'); if (!b) return; tala = C.TALAS[b.dataset.tala]; scene.querySelectorAll('[data-tala]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); reset(); }, signal);
    on(scene, 'click', e => { const b = e.target.closest('[data-p]'); if (!b) return; p = +b.dataset.p; scene.querySelectorAll('[data-p]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); reset(); }, signal);
    on(scene.querySelector('#tlCyBpm'), 'input', e => { bpm = +e.target.value; scene.querySelector('.tl-bpm').textContent = bpm; if (P.sched) P.sched.setBpm(bpm); }, signal);
  }

  /* ======================= d) Tihai builder ======================= */
  function tihai() {
    const list = C.puzzlesFor(lv);
    let idx = Math.max(0, list.findIndex(z => !S.solved.includes(z.id)));
    if (idx < 0 || idx >= list.length) idx = 0;
    let z, p, g, tried = false, bpm = Math.min(S.bpm, 80);
    scene.innerHTML = `
      <section class="tl-stage px-stage tl-th">
        <div class="tl-row tl-thtop"><p class="tl-pz" aria-live="off"></p><span class="px-sp"></span><div class="tl-row tl-pzs" role="group" aria-label="Puzzles"></div></div>
        <p class="tl-thsay"></p>
        <div class="tl-row tl-pick">
          <div class="tl-step tl-step--0"><span class="tl-step-l">Phrase <i>p</i></span><button type="button" class="tl-stepb" data-k="p" data-d="-1" aria-label="Shorter phrase">&minus;</button><b class="tl-stepv tl-pv"></b><button type="button" class="tl-stepb" data-k="p" data-d="1" aria-label="Longer phrase">+</button></div>
          <div class="tl-step tl-step--1"><span class="tl-step-l">Gap <i>g</i></span><button type="button" class="tl-stepb" data-k="g" data-d="-1" aria-label="Shorter gap">&minus;</button><b class="tl-stepv tl-gv"></b><button type="button" class="tl-stepb" data-k="g" data-d="1" aria-label="Longer gap">+</button></div>
        </div>
        <div class="tl-tl" aria-hidden="true"></div>
        <p class="tl-words"></p>
        <div class="tl-transport">${playBtn('Play the tihai')} ${tempo('tlThBpm', bpm, 40, 120)}</div>
        <div class="tl-result" aria-live="off"></div>
        <div class="tl-eq" hidden></div>
      </section>
      <details class="tl-why"><summary>What is a tihai?</summary>
        <p>A tihai is a phrase played three times, with the same gap between, timed so the very last syllable lands on sam, beat 1 of the cycle. It is how Carnatic and Hindustani musicians end a passage with a flourish: everyone hears it coming and it resolves exactly.</p>
        <p>Phrases and gaps fill every count up to sam, and the last syllable sits on sam itself. So with D counts to go: 3 × p + 2 × g = D + 1. Many (p, g) pairs can fit the same cycle; finding them is a small equation in whole numbers.</p>
      </details>`;
    const tl = scene.querySelector('.tl-tl'), result = scene.querySelector('.tl-result'), btn = scene.querySelector('.tl-play'), eq = scene.querySelector('.tl-eq');
    let cellEls = [];
    const load = i => {
      idx = i; z = list[i]; tried = false; P.stop(); setPlaying(btn, false, 'Play the tihai');
      const sols = C.tihaiSolutions(z.C, z.start);
      ({ p, g } = C.tihaiStart(z, lv));
      scene.querySelector('.tl-pz').innerHTML = `Puzzle <b>${i + 1}</b> of ${list.length}`;
      scene.querySelector('.tl-pzs').innerHTML = list.map((q, j) => `<button type="button" class="tl-pzb${S.solved.includes(q.id) ? ' is-done' : ''}" data-z="${j}" aria-current="${j === i}" aria-label="Puzzle ${j + 1}${S.solved.includes(q.id) ? ', solved' : ''}">${j + 1}</button>`).join('');
      const beat = z.start / z.gati + 1;
      scene.querySelector('.tl-thsay').innerHTML = `${esc(z.say)} <span class="px-note">Adi tala, ${z.gati === 1 ? 'one count' : z.gati + ' counts'} per beat: ${z.C} counts. Start on ${z.start ? `beat ${beat} (count ${z.start + 1})` : 'sam'}.${lv === 'pro' ? ` ${sols.length} solution${sols.length > 1 ? 's' : ''} exist; found ${(S.sols[z.id] || []).length}.` : ''}</span>`;
      scene.querySelectorAll('.tl-stepb').forEach(b => { b.disabled = !!(z.fix && b.dataset.k in z.fix); });
      eq.hidden = true; result.innerHTML = '';
      drawLine();
    };
    const drawLine = () => {
      scene.querySelector('.tl-pv').textContent = p; scene.querySelector('.tl-gv').textContent = g;
      const counts = C.tihaiCounts(p, g), total = Math.max(z.C, z.start + counts.length) + 1, miss = C.tihaiMiss(z.C, z.start, p, g);
      const html = [];
      for (let c = 0; c < total; c++) {
        const j = c - z.start, x = j >= 0 && j < counts.length ? counts[j] : null, isSam = c % z.C === 0;
        const cls = ['tl-c', x ? (x.gap ? 'is-gap' : 'rep-' + x.rep) : c < z.start ? 'is-before' : 'is-after', x?.last ? 'is-last' : '', isSam ? 'is-sam' : '', c % z.gati === 0 ? 'is-beat' : ''].join(' ');
        html.push(`<span class="${cls}" data-c="${c}">${x && x.word ? `<i>${x.word}</i>` : c === z.C ? '<i>sam</i>' : ''}</span>`);
      }
      tl.innerHTML = html.join(''); const per = z.gati <= 2 ? 8 : z.gati * 2; tl.style.setProperty('--per', per); tl.classList.toggle('is-dense', per > 10);
      cellEls = [...tl.children];
      scene.querySelector('.tl-words').innerHTML = `<span class="rep-0">${C.phrase(p).join(' ')}</span>${g ? ` <span class="tl-gapw">${'·'.repeat(g)}</span> ` : ' '}<span class="rep-1">${C.phrase(p).join(' ')}</span>${g ? ` <span class="tl-gapw">${'·'.repeat(g)}</span> ` : ' '}<span class="rep-2">${C.phrase(p).join(' ')}</span>`;
      tl.classList.toggle('is-lands', miss === 0);
      if (tried || lv === 'pro') showEq();
    };
    const showEq = () => {
      const D = C.toSam(z.C, z.start), lhs = C.tihaiSpan(p, g);
      eq.hidden = false;
      eq.innerHTML = `<p class="tl-eqm"><span>3 × ${p} + 2 × ${g} = <b>${lhs}</b></span><span class="tl-eqvs">${lhs === D + 1 ? '=' : '≠'}</span><span>${D} counts to sam + 1 = <b>${D + 1}</b></span></p>`;
    };
    load(idx);
    on(scene.querySelector('.tl-pick'), 'click', e => {
      const b = e.target.closest('.tl-stepb'); if (!b || b.disabled) return;
      if (b.dataset.k === 'p') p = Math.max(2, Math.min(20, p + +b.dataset.d)); else g = Math.max(0, Math.min(16, g + +b.dataset.d));
      P.stop(); setPlaying(btn, false, 'Play the tihai'); result.innerHTML = ''; drawLine(); hit('ki');
    }, signal);
    on(scene.querySelector('.tl-pzs'), 'click', e => { const b = e.target.closest('[data-z]'); if (b) load(+b.dataset.z); }, signal);
    const finish = miss => {
      tried = true; showEq();
      if (miss === 0) {
        const fresh = !S.solved.includes(z.id);
        if (fresh) S.solved.push(z.id);
        const got = new Set(S.sols[z.id] || []), isNew = !got.has(`${p},${g}`); got.add(`${p},${g}`); S.sols[z.id] = [...got]; save();
        const all = C.tihaiSolutions(z.C, z.start).length;
        result.innerHTML = `<p class="tl-meet"><b>Thom! Right on sam.</b> ${p} + ${g} + ${p} + ${g} + ${p} counts, and the last thom is sam.</p>
          <p>${all > 1 ? `This cycle has ${all} tihais with these rules. You have found ${got.size}.` : 'This is the only one that fits.'}</p>
          ${idx < list.length - 1 ? '<button type="button" class="md-btn md-btn--primary tl-nextpz">Next puzzle</button>' : '<p class="px-note">That was the last puzzle. Try finding every solution, or compose your own.</p>'}`;
        confetti(70); say(`Thom on sam! The tihai lands. ${all > 1 ? `${got.size} of ${all} solutions found.` : ''}`);
        /* tracked (and so paid in Sparks) only for a solution this Player has not found before, not on replays */
        if (isNew) track('tala/tihai-land', z.id);
        scene.querySelectorAll('.tl-pzb')[idx]?.classList.add('is-done');
      } else {
        const a = Math.abs(miss);
        result.innerHTML = `<p class="tl-miss">${miss < 0 ? `The last thom came ${a} count${a > 1 ? 's' : ''} before sam.` : `The last thom came ${a} count${a > 1 ? 's' : ''} after sam.`} ${lv === 'explorer' ? (miss < 0 ? 'Make it a little longer.' : 'Make it a little shorter.') : 'Each extra count of p moves the end by 3; each extra count of g moves it by 2.'}</p>`;
        say(result.textContent);
      }
    };
    on(result, 'click', e => { if (e.target.closest('.tl-nextpz')) load(idx + 1); }, signal);
    on(btn, 'click', async () => {
      if (P.on) { P.stop(); setPlaying(btn, false, 'Play the tihai'); return; }
      const pat = C.tihaiPattern({ C: z.C, start: z.start, p, g, gati: z.gati });
      setPlaying(btn, true); cellEls.forEach(c => c.classList.remove('is-now', 'is-done'));
      await P.play({ pattern: pat, bpm, gainOf: e => (e.track === 'tala' ? 0.45 : e.track === 'land' ? 1 : e.last ? 1.1 : e.i === 0 ? 0.95 : 0.8),
        onCue(e) {
          const c = e.at;
          if (e.track === 'tala') { cellEls.forEach(x => x.classList.remove('is-tala')); cellEls[c]?.classList.add('is-tala'); }
          if (e.track === 'tihai') { cellEls[c]?.classList.add('is-done'); cellEls.forEach(x => x.classList.remove('is-now')); cellEls[c]?.classList.add('is-now'); }
          if (e.track === 'land') { if (e.miss === 0) { tl.classList.remove('is-bloom'); void tl.offsetWidth; tl.classList.add('is-bloom'); } finish(e.miss); }
        }, onEnd: () => setPlaying(btn, false, 'Play the tihai') });
    }, signal);
    on(scene.querySelector('#tlThBpm'), 'input', e => { bpm = +e.target.value; scene.querySelector('.tl-bpm').textContent = bpm; if (P.sched) P.sched.setBpm(bpm); }, signal);
  }

  /* ======================= e) Composer ======================= */
  function compose() {
    let comp = (params[1] && C.decodeComp(params[1], b64url)) || C.cleanComp(S.draft || { n: 8, gati: 4, bpm: 72, seq: C.parseSeq(C.PRESETS[0].s) });
    let brush = 'ta', focus = 0;
    if (params[1]) track('tala/compose-open', 'Shared rhythm');
    scene.innerHTML = `
      <section class="tl-stage px-stage tl-co">
        <div class="tl-cogrid">
          <figure class="tl-cobox"><svg class="tl-cosvg" viewBox="0 0 340 340" aria-hidden="true"></svg>
            <div class="tl-slots" role="grid" aria-label="Rhythm circle. Arrow keys move, Enter paints the chosen syllable."></div></figure>
          <div class="tl-side">
            <div class="tl-row tl-brushes" role="radiogroup" aria-label="Syllable to paint">${C.PALETTE.map(w => `<button type="button" role="radio" class="tl-brush tl-v-${C.voiceOf(w)}" data-w="${w}" aria-checked="${w === brush}">${w || 'rest'}</button>`).join('')}</div>
            <div class="tl-row tl-pick">
              <div class="tl-step"><span class="tl-step-l">Counts</span><button type="button" class="tl-stepb" data-k="n" data-d="-1" aria-label="Fewer counts">&minus;</button><b class="tl-stepv tl-nv"></b><button type="button" class="tl-stepb" data-k="n" data-d="1" aria-label="More counts">+</button></div>
              <div class="tl-step"><span class="tl-step-l">Per beat</span><button type="button" class="tl-stepb" data-k="gati" data-d="-1" aria-label="Fewer counts per beat">&minus;</button><b class="tl-stepv tl-gv"></b><button type="button" class="tl-stepb" data-k="gati" data-d="1" aria-label="More counts per beat">+</button></div>
            </div>
            <p class="tl-cmath"></p>
            <div class="tl-transport">${playBtn()} ${tempo('tlCoBpm', comp.bpm, 40, 160)}</div>
            <div class="tl-row"><button type="button" class="md-btn tl-share">Share link</button><button type="button" class="md-btn tl-save">Save</button><button type="button" class="md-btn md-btn--sm tl-clear">Clear</button></div>
            <div class="tl-row tl-presets"><span class="px-note">Start from:</span>${C.PRESETS.map((x, i) => `<button type="button" class="md-chip" data-pre="${i}">${esc(x.name)}</button>`).join('')}</div>
            <div class="tl-saved"></div>
          </div>
        </div>
      </section>`;
    const svg = scene.querySelector('.tl-cosvg'), slots = scene.querySelector('.tl-slots'), btn = scene.querySelector('.tl-play');
    const R = 124, cx = 170, cy = 170;
    let slotEls = [];
    const persist = () => { S.draft = comp; save(); };
    const draw = () => {
      const n = comp.n;
      svg.innerHTML = `<circle cx="${cx}" cy="${cy}" r="${R + 32}" class="tl-halo"/><circle cx="${cx}" cy="${cy}" r="${R}" class="tl-ring"/>
        ${Array.from({ length: Math.ceil(n / comp.gati) }, (_, b) => { const [x, y] = pt(cx, cy, R - 34, (b * comp.gati) / n); return `<circle cx="${x}" cy="${y}" r="4" class="tl-beatdot"/>`; }).join('')}
        <path class="tl-sweep" d=""/>
        <text x="${cx}" y="${cy - 2}" text-anchor="middle" class="tl-word tl-coword">${comp.seq.filter(Boolean).length ? '' : 'paint'}</text>
        <text x="${cx}" y="${cy + 24}" text-anchor="middle" class="tl-wsub">${n} counts</text>`;
      const size = n > 20 ? 34 : n > 12 ? 42 : 52;
      slots.style.setProperty('--sz', size + 'px');
      slots.innerHTML = comp.seq.map((w, i) => { const [x, y] = pt(50, 50, (R / 340) * 100, i / n); return `<button type="button" role="gridcell" class="tl-slot tl-v-${C.voiceOf(w)}${i % comp.gati === 0 ? ' is-beat' : ''}" data-i="${i}" tabindex="${i === focus ? 0 : -1}" style="left:${x}%;top:${y}%" aria-label="Count ${i + 1}: ${w || 'rest'}">${w || '·'}</button>`; }).join('');
      slotEls = [...slots.children];
      scene.querySelector('.tl-nv').textContent = n; scene.querySelector('.tl-gv').textContent = comp.gati;
      const r = n % comp.gati, L = C.lcm(n, comp.gati);
      scene.querySelector('.tl-cmath').innerHTML = r === 0 ? `${n} counts = ${n / comp.gati} beat${n / comp.gati > 1 ? 's' : ''} of ${comp.gati}. The loop starts on the beat every time.` : `${n} counts in beats of ${comp.gati} leaves ${r} over (${n} = ${Math.floor(n / comp.gati)} × ${comp.gati} + ${r}). The loop drifts against the beat and comes home after lcm(${n}, ${comp.gati}) = ${L} counts.`;
    };
    draw();
    const paint = i => { comp.seq[i] = comp.seq[i] === brush ? '' : brush; const w = comp.seq[i]; if (w) hit(C.voiceOf(w)); persist(); draw(); slotEls[i].focus(); say(`Count ${i + 1}: ${w || 'rest'}`); };
    on(slots, 'click', e => { const b = e.target.closest('.tl-slot'); if (b) { focus = +b.dataset.i; paint(focus); } }, signal);
    on(slots, 'keydown', e => {
      const n = comp.n, mv = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (mv) { e.preventDefault(); focus = C.mod(focus + mv, n); slotEls.forEach((s, i) => s.tabIndex = i === focus ? 0 : -1); slotEls[focus].focus(); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); focus = e.key === 'Home' ? 0 : n - 1; slotEls.forEach((s, i) => s.tabIndex = i === focus ? 0 : -1); slotEls[focus].focus(); }
    }, signal);
    on(scene.querySelector('.tl-brushes'), 'click', e => { const b = e.target.closest('[data-w]'); if (!b) return; brush = b.dataset.w; scene.querySelectorAll('.tl-brush').forEach(x => x.setAttribute('aria-checked', String(x === b))); if (brush) hit(C.voiceOf(brush)); }, signal);
    on(scene.querySelector('.tl-pick'), 'click', e => {
      const b = e.target.closest('.tl-stepb'); if (!b) return;
      const k = b.dataset.k, lim = C.COMPOSE_LIMITS[k];
      const nv = Math.max(lim[0], Math.min(lim[1], comp[k] + +b.dataset.d));
      comp = C.cleanComp({ ...comp, [k]: nv, seq: comp.seq }); focus = Math.min(focus, comp.n - 1); persist(); draw(); if (P.on) start();
    }, signal);
    on(scene.querySelector('.tl-presets'), 'click', e => { const b = e.target.closest('[data-pre]'); if (!b) return; const x = C.PRESETS[+b.dataset.pre]; comp = C.cleanComp({ n: x.n, gati: x.gati, bpm: comp.bpm, seq: C.parseSeq(x.s) }); persist(); draw(); if (P.on) start(); }, signal);
    on(scene.querySelector('.tl-clear'), 'click', () => { comp = C.cleanComp({ ...comp, seq: [] }); persist(); draw(); }, signal);
    const start = async () => {
      setPlaying(btn, true);
      await P.play({ pattern: C.compPattern(comp), bpm: comp.bpm, gainOf: e => (e.track === 'beat' ? 0.5 : e.accent ? 1 : 0.8),
        onCue(e) { if (e.track !== 'comp') return; slotEls.forEach(s => s.classList.remove('is-now')); slotEls[e.slot]?.classList.add('is-now'); if (e.word) { const w = svg.querySelector('.tl-coword'); w.textContent = e.word; flash(w); } } });
    };
    on(btn, 'click', () => { if (P.on) { P.stop(); setPlaying(btn, false); slotEls.forEach(s => s.classList.remove('is-now')); } else { start(); track('tala/compose-play', comp.n + ' counts'); } }, signal);
    on(scene.querySelector('#tlCoBpm'), 'input', e => { comp.bpm = +e.target.value; scene.querySelector('.tl-bpm').textContent = comp.bpm; persist(); if (P.sched) P.sched.setBpm(comp.bpm); }, signal);
    loop(() => {
      const s = P.sched; if (!s || reducedMotion()) return;
      const len = comp.n * s.unit(), ph = C.mod((P.clock.now() - P.clock.latency() - s.start) / len, 1);
      const [x, y] = pt(cx, cy, R, ph), [x0, y0] = pt(cx, cy, R, Math.max(0, ph - 0.12));
      svg.querySelector('.tl-sweep').setAttribute('d', `M${cx} ${cy} L${x0} ${y0} A${R} ${R} 0 0 1 ${x} ${y} Z`);
    }, signal);
    const code = () => C.encodeComp(comp, b64url);
    on(scene.querySelector('.tl-share'), 'click', () => share({ title: 'A rhythm from Tala Lab', text: `I made a ${comp.n}-count Konnakol rhythm. Hear it:`, url: shareUrl(`#/games/tala/compose/${code()}`) }), signal);
    const savedList = () => {
      const box = scene.querySelector('.tl-saved');
      box.innerHTML = S.comps.length ? `<p class="px-note">Saved on this device</p><ul>${S.comps.map((c, i) => `<li><button type="button" class="tl-load" data-load="${i}">${esc(C.decodeComp(c, b64url)?.seq.map(w => w || '·').join(' ') || 'rhythm')}</button><button type="button" class="tl-del" data-del="${i}" aria-label="Delete saved rhythm ${i + 1}">&times;</button></li>`).join('')}</ul>` : '';
    };
    savedList();
    on(scene.querySelector('.tl-save'), 'click', () => { const c = code(); S.comps = [c, ...S.comps.filter(x => x !== c)].slice(0, 12); save(); savedList(); toast('Saved on this device'); track('tala/compose-save', comp.n + ' counts'); }, signal);
    on(scene.querySelector('.tl-saved'), 'click', e => {
      const l = e.target.closest('[data-load]'), d = e.target.closest('[data-del]');
      if (l) { const c = C.decodeComp(S.comps[+l.dataset.load], b64url); if (c) { comp = c; persist(); draw(); scene.querySelector('#tlCoBpm').value = comp.bpm; scene.querySelector('.tl-bpm').textContent = comp.bpm; if (P.on) start(); } }
      if (d) { S.comps.splice(+d.dataset.del, 1); save(); savedList(); }
    }, signal);
  }
}

/* "6 + 5 = 11, and 11 − 8 = 3": how a start wraps around the cycle */
function wrapText(prev, p, n, b) {
  const s = prev + p;
  return s <= n ? `${prev} + ${p} = ${s}.` : `${prev} + ${p} = ${s}, and around a cycle of ${n} that is beat ${b}${s - n === b ? ` (${s} − ${n} = ${b})` : ''}.`;
}

/* SVG helpers */
function arcPath(cx, cy, R, a0, a1) {
  const [x0, y0] = pt(cx, cy, R, a0), [x1, y1] = pt(cx, cy, R, a1), large = a1 - a0 > 0.5 ? 1 : 0;
  return `M${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1}`;
}
/* A tiny glyph for each hand gesture */
function handIcon(h, x, y) {
  if (h === 'clap') return `<circle cx="${x}" cy="${y}" r="8" class="tl-hi tl-hi--clap"/>`;
  if (h === 'wave') return `<path d="M${x - 9} ${y + 2} q4.5 -9 9 0 t9 0" class="tl-hi tl-hi--wave"/>`;
  const k = { pinky: 1, ring: 2, middle: 3, count: 1 }[h] || 1;
  return Array.from({ length: k }, (_, i) => `<circle cx="${x + (i - (k - 1) / 2) * 7}" cy="${y}" r="2.6" class="tl-hi tl-hi--f"/>`).join('');
}
