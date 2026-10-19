/* Party Mode (#/arena/party): family math night on one big screen. Two to four players, a buzz key and a corner
   each, questions at each player's own level, six rounds and a podium. The game itself is the pure reducer
   in party-core.js; this file draws it, plays the sounds, narrates and wires keys and touch. */
import { head, store, rng, say, sfx, tone, PENTA, confetti, share, track, esc, muted, setMuted, reducedMotion } from '../kit.js';
import { on, later, every, loop, child, onAbort } from '../life.js';
import * as C from './party-core.js';

const KEY = 'party';
const COLOR_NAME = { coral: 'Coral', teal: 'Teal', sun: 'Sun', slate: 'Night' };
const LV_SHORT = { explorer: 'Explorer', challenger: 'Challenger', pro: 'Pro' };
const pick = (r, a) => a[Math.floor(r() * a.length)];
const freshSeed = () => (Math.random() * 2 ** 31) >>> 0;
/* Full screen, with the older WebKit names (iPad Safari); iPhone has neither, so the button is not shown there */
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
const fsCan = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const fsExit = () => { try { const p = (document.exitFullscreen || document.webkitExitFullscreen)?.call(document); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
/* Calm, the app's device preference (fx.calmOn): no clocks in this game either (party-core.js newGame calm) */
const calmOn = () => { try { return localStorage.getItem('vm.calm') === '1'; } catch (e) { return false; } };
const CALM_NOTE = 'Calm is on: no clocks. Take your time; End game or Show the answers moves things on.';
const CALM_RELAY = 'Team round! Pass the baton. Everyone runs the same number of times. Can the family reach the goal?';
const blurbOf = (type, calm) => (calm && type === 'relay' ? CALM_RELAY : C.ROUND_INFO[type].blurb);
const defaults = () => ({ seats: [{ adj: 0, noun: 0, color: 'coral', level: 'explorer' }, { adj: 1, noun: 1, color: 'teal', level: 'pro' }], length: 'full', handicap: true, games: 0 });

/* Avatar: shape and color both identify a player (never color alone) */
export function avatar(color, size = 56) {
  const shape = C.SHAPES[C.COLORS.indexOf(color)] || 'circle';
  const body = {
    circle: '<circle cx="32" cy="34" r="25"/>',
    triangle: '<path d="M32 6 L59 56 H5 Z" stroke-linejoin="round"/>',
    square: '<rect x="8" y="10" width="48" height="46" rx="9"/>',
    star: '<path d="M32 4 L39.5 22.5 L59 23.5 L44 36 L49 56 L32 45 L15 56 L20 36 L5 23.5 L24.5 22.5 Z" stroke-linejoin="round"/>'
  }[shape];
  const ey = shape === 'triangle' ? 40 : 33;
  return `<svg class="pt-avsvg" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><g class="pt-av-body">${body}</g><circle class="pt-av-eye" cx="25" cy="${ey}" r="4.6"/><circle class="pt-av-eye" cx="39" cy="${ey}" r="4.6"/><circle class="pt-av-pupil" cx="26" cy="${ey + 1}" r="2"/><circle class="pt-av-pupil" cx="40" cy="${ey + 1}" r="2"/><path class="pt-av-mouth" d="M27 ${ey + 9} Q32 ${ey + 13} 37 ${ey + 9}"/></svg>`;
}

const LINES = {
  round: ['Round {r}! {t}.', 'Here comes round {r}: {t}.', 'Get ready for round {r}, {t}!'],
  buzz: ['{n} buzzes in!', 'Bzzt! {n} has it.', '{n} is fastest on the buzzer!'],
  steal: ['{n} swoops in for the steal!', 'Steal attempt from {n}!'],
  correct: ['{n} nails it! Plus {p}.', 'Boom! {n} scores {p}.', 'Yes! {p} points to {n}.', 'Smooth, {n}. Plus {p}.'],
  stolen: ['Stolen! {n} grabs {p}.', 'Sneaky! {n} steals {p} points.'],
  wrong: ['Ooh, not quite, {n}.', 'So close, {n}!', 'Nope, {n}. Anyone else?'],
  timeout: ['Time is up for {n}.', 'The clock beat {n} that time.'],
  nobody: ['Nobody got that one. The answer was {a}.', 'That one escaped! It was {a}.'],
  passed: ['Nobody buzzed. Here are the answers.', 'Answers time! Nobody buzzed that one.'],
  timeoutAll: ['Silence! Nobody buzzed. Answers below.', 'Crickets... nobody buzzed in time.'],
  relayok: ['{n} passes the baton!', 'Go team! {n} got it.', '{n}, nice! Next runner!'],
  relayno: ['Fumble! It was {a}. Next runner!', 'Oops, {a}. Keep running!'],
  podium: ['What a game! Here is your podium.', 'And the champions of math night are...']
};
/* Saved settings, cleaned: a bad or old record (too many seats, unknown colors) falls back to the defaults
   instead of breaking Party Mode on every visit */
function loadSettings() {
  const d = defaults(), raw = store.get(KEY, {}), o = raw && typeof raw === 'object' ? raw : {};
  return {
    seats: C.cleanSeats(o.seats) || d.seats,
    length: o.length === 'quick' ? 'quick' : 'full',
    handicap: typeof o.handicap === 'boolean' ? o.handicap : d.handicap,
    games: Number.isInteger(o.games) && o.games >= 0 ? o.games : 0
  };
}
const line = (k, vars = {}) => pick(Math.random, LINES[k]).replace(/\{(\w)\}/g, (_, v) => vars[v] ?? '');

export async function mount({ root, signal }) {
  const S = loadSettings();
  const save = () => store.set(KEY, S);
  root.innerHTML = `<div class="pt">
    <div class="md-wrap">${head({ title: 'Party Mode', kicker: 'Family math night', intro: 'Two to four players on one screen, a buzzer each. Everyone gets questions at their own level, so the youngest and the grown ups can all win.', color: 'sun' })}</div>
    <div class="pt-body"></div>
  </div>`;
  const body = root.querySelector('.pt-body');
  let gameCtl = null;
  /* The setup screen: its listeners are added once here (under the screen's own signal); every change only re-renders */
  const setup = () => {
    if (gameCtl) gameCtl.abort(); gameCtl = child(signal); const sig = gameCtl.signal;
    root.querySelector('.pt').classList.remove('is-playing');
    drawSetup();
    const redraw = () => { save(); drawSetup(); };
    on(body, 'change', e => { const sel = e.target.closest('select[data-f]'); if (!sel) return; S.seats[+sel.dataset.i][sel.dataset.f] = +sel.value; save(); body.querySelector(`.pt-seat[data-i="${sel.dataset.i}"] .pt-seat-name`).textContent = C.playerName(S.seats[+sel.dataset.i]); }, sig);
    on(body, 'click', e => {
      const t = e.target;
      if (t.closest('.pt-add')) { if (S.seats.length >= C.KEYS.length) return; const used = S.seats.map(s => s.color); S.seats.push({ adj: (S.seats.length * 3) % C.ADJ.length, noun: (S.seats.length * 5) % C.NOUNS.length, color: C.COLORS.find(c => !used.includes(c)), level: 'challenger' }); redraw(); body.querySelector('.pt-seat:last-child select').focus(); return; }
      const rm = t.closest('[data-rm]'); if (rm) { if (S.seats.length <= 2) return; S.seats.splice(+rm.dataset.rm, 1); redraw(); (body.querySelector('.pt-add') || body.querySelector('.pt-start')).focus(); return; }
      const sh = t.closest('[data-shuffle]'); if (sh) { const s = S.seats[+sh.dataset.shuffle]; s.adj = Math.floor(Math.random() * C.ADJ.length); s.noun = Math.floor(Math.random() * C.NOUNS.length); sfx('tap'); redraw(); body.querySelector(`[data-shuffle="${sh.dataset.shuffle}"]`).focus(); return; }
      const col = t.closest('[data-color]'); if (col) {
        const i = +col.dataset.i, c = col.dataset.color, other = S.seats.findIndex(s => s.color === c);
        if (other >= 0 && other !== i) S.seats[other].color = S.seats[i].color;
        S.seats[i].color = c; redraw(); body.querySelector(`[data-i="${i}"][data-color="${c}"]`).focus(); return;
      }
      const lvb = t.closest('[data-lvl]'); if (lvb) { S.seats[+lvb.dataset.i].level = lvb.dataset.lvl; redraw(); body.querySelector(`[data-i="${lvb.dataset.i}"][data-lvl="${lvb.dataset.lvl}"]`).focus(); return; }
      const len = t.closest('[data-len]'); if (len) { S.length = len.dataset.len; redraw(); body.querySelector(`[data-len="${S.length}"]`).focus(); return; }
      if (t.closest('.pt-hc')) { S.handicap = !S.handicap; redraw(); body.querySelector('.pt-hc').focus(); return; }
      if (t.closest('.pt-start')) startGame(freshSeed());
    }, sig);
  };

  /* ---------- Setup ---------- */
  function drawSetup() {
    const seats = S.seats;
    body.innerHTML = `<div class="md-wrap"><section class="pt-setup px-stage" aria-labelledby="ptWho">
      <h2 id="ptWho" class="pt-h2">Who is playing?</h2>
      <ol class="pt-seats">${seats.map((p, i) => seatHtml(p, i)).join('')}</ol>
      ${seats.length < 4 ? '<button type="button" class="md-btn pt-add">+ Add a player</button>' : ''}
      <div class="pt-opts">
        <div><p class="pt-optl" id="ptLen">Game length</p><div class="px-row" role="radiogroup" aria-labelledby="ptLen">
          <button type="button" role="radio" class="md-chip" data-len="quick" aria-checked="${S.length === 'quick'}">Quick <small>about 6 minutes</small></button>
          <button type="button" role="radio" class="md-chip" data-len="full" aria-checked="${S.length === 'full'}">Full <small>about 12 minutes</small></button></div></div>
        <div><p class="pt-optl">Handicap</p><button type="button" role="switch" class="md-switch pt-hc" aria-checked="${S.handicap}">Fair play points<span class="md-track"><span class="md-knob"></span></span></button>
          <p class="px-note">Explorers score ×1.5 and get more time, Challengers ×1.25, Pros ×1. Everyone always gets questions at their own level.</p></div>
      </div>
      <div class="pt-startrow"><button type="button" class="md-btn md-btn--primary pt-start">Start the party</button><span class="px-note">Keys: ${seats.map((p, i) => `<kbd>${C.KEYS[i].toUpperCase()}</kbd> ${esc(C.playerName(p))}`).join(', ')}. Or tap your corner.</span></div>
      ${calmOn() ? `<p class="px-note pt-calm">${CALM_NOTE}</p>` : ''}
      <p class="px-note pt-future">Everyone shares this one screen for now. Using phones as buzzers needs a server to connect them, so that is saved for a later version.</p>
    </section>
    <section class="pt-rounds" aria-labelledby="ptRoundsH"><h2 id="ptRoundsH" class="pt-h2">Six rounds</h2><ol>${Object.entries(C.ROUND_INFO).map(([k, r]) => `<li><b>${esc(r.title)}</b> ${esc(blurbOf(k, calmOn()))}</li>`).join('')}</ol></section></div>`;
  }
  const seatHtml = (p, i) => `<li class="pt-seat pt-c--${p.color}" data-i="${i}">
    <span class="pt-av">${avatar(p.color, 64)}</span>
    <div class="pt-seat-main">
      <p class="pt-seat-name">${esc(C.playerName(p))}</p>
      <div class="pt-namepick"><label class="px-live" for="ptA${i}">First word for player ${i + 1}</label><select id="ptA${i}" data-f="adj" data-i="${i}">${C.ADJ.map((w, k) => `<option value="${k}"${k === p.adj ? ' selected' : ''}>${w}</option>`).join('')}</select>
        <label class="px-live" for="ptN${i}">Second word for player ${i + 1}</label><select id="ptN${i}" data-f="noun" data-i="${i}">${C.NOUNS.map((w, k) => `<option value="${k}"${k === p.noun ? ' selected' : ''}>${w}</option>`).join('')}</select>
        <button type="button" class="md-btn md-btn--sm" data-shuffle="${i}" aria-label="Random name for player ${i + 1}">Shuffle</button></div>
      <div class="pt-colors" role="radiogroup" aria-label="Color for player ${i + 1}">${C.COLORS.map(c => `<button type="button" role="radio" class="pt-sw pt-c--${c}" data-i="${i}" data-color="${c}" aria-checked="${c === p.color}" aria-label="${COLOR_NAME[c]}"></button>`).join('')}</div>
      <div class="pt-lvls" role="radiogroup" aria-label="Level for player ${i + 1}">${C.LEVELS.map(l => `<button type="button" role="radio" class="md-chip" data-i="${i}" data-lvl="${l}" aria-checked="${l === p.level}">${LV_SHORT[l]}</button>`).join('')}</div>
    </div>
    <div class="pt-seat-end"><span class="pt-keycap" role="img" aria-label="Buzz key ${C.KEYS[i].toUpperCase()}"><kbd>${C.KEYS[i].toUpperCase()}</kbd><small>buzz key</small></span>
    ${S.seats.length > 2 ? `<button type="button" class="md-btn md-btn--sm" data-rm="${i}" aria-label="Remove player ${i + 1}">Remove</button>` : ''}</div>
  </li>`;

  /* ---------- The game ---------- */
  function startGame(seed) {
    if (gameCtl) gameCtl.abort(); gameCtl = child(signal); const sig = gameCtl.signal;
    S.games++; save(); track('party/start', `${S.seats.length} players ${S.length}`);
    root.querySelector('.pt').classList.add('is-playing');
    let s = C.newGame({ players: S.seats.map((p, i) => ({ ...p, id: i })), seed, length: S.length, handicap: S.handicap, calm: calmOn() });
    const n = s.players.length;
    body.innerHTML = `<div class="pt-stage" data-n="${n}" tabindex="-1">
      <div class="pt-top">
        <p class="pt-progress" aria-live="off"></p>
        <span class="px-sp"></span>
        ${fsCan() ? `<button type="button" class="md-btn md-btn--sm pt-fs" aria-pressed="${fsEl() === body}">${fsEl() === body ? 'Exit full screen' : 'Full screen'}</button>` : ''}
        <button type="button" class="md-btn md-btn--sm pt-snd" aria-pressed="${!muted()}">${muted() ? 'Sound off' : 'Sound on'}</button>
        <button type="button" class="md-btn md-btn--sm pt-quit">End game</button>
      </div>
      ${s.calm ? `<p class="px-note pt-calm">${CALM_NOTE}</p>` : ''}
      <ol class="pt-board" aria-label="Scores">${s.players.map(p => `<li class="pt-score pt-c--${p.color}" data-p="${p.id}"><span class="pt-av">${avatar(p.color, 40)}</span><span class="pt-sname">${esc(C.playerName(p))}<small>${LV_SHORT[p.level]}</small></span><b class="pt-pts">0</b><span class="pt-sbar" aria-hidden="true"><i></i></span></li>`).join('')}</ol>
      <div class="pt-arena">
        ${s.players.map(p => `<button type="button" class="pt-zone pt-zone--${p.id} pt-c--${p.color}" data-buzz="${p.id}" aria-label="${esc(C.playerName(p))} buzzer, key ${p.key.toUpperCase()}" aria-describedby="ptZq${p.id} ptZst${p.id}"><span class="pt-zhead"><span class="pt-av">${avatar(p.color, 48)}</span><span class="pt-zname">${esc(C.playerName(p))}</span><kbd>${p.key.toUpperCase()}</kbd></span><span class="pt-zq" id="ptZq${p.id}"></span><span class="pt-zst" id="ptZst${p.id}"></span></button>`).join('')}
        <section class="pt-center" aria-label="Game">
          <p class="pt-host"></p>
          <div class="pt-timer" aria-hidden="true"${s.calm ? ' hidden' : ''}><i></i></div>
          <div class="pt-main"></div>
        </section>
      </div>
    </div>`;
    const stage = body.querySelector('.pt-stage'), main = stage.querySelector('.pt-main'), hostEl = stage.querySelector('.pt-host'), bar = stage.querySelector('.pt-timer i'), prog = stage.querySelector('.pt-progress');
    let pad = '', tStart = 0, tTotal = 0, lastBeep = 99, stepCtl = null, shown = {};
    s.players.forEach(p => { shown[p.id] = 0; });
    const nameOf = id => C.playerName(s.players.find(p => p.id === id));
    const narrate = text => { hostEl.textContent = text; hostEl.classList.remove('is-pop'); void hostEl.offsetWidth; hostEl.classList.add('is-pop'); say(text); };

    const dispatch = a => {
      const prev = s, next = C.reduce(s, { now: Date.now(), ...a });
      if (next === prev) return false;
      s = next; effects(prev); draw(prev); return true;
    };
    const effects = prev => {
      const e = s.event || {}, P = id => s.players.find(p => p.id === id);
      if (s.deadline !== prev.deadline) { tStart = Date.now(); tTotal = Math.max(1, s.deadline - tStart); lastBeep = 99; }
      if (s.turn !== prev.turn || s.phase !== prev.phase) pad = '';
      switch (e.kind) {
        case 'round': { const t = C.round(s).type; narrate(line('round', { r: s.ri + 1, t: C.ROUND_INFO[t].title })); [0, 2, 4, 7].forEach((k, i) => tone(PENTA[k + 2], { dur: 0.2, when: i * 0.1, type: 'triangle', gain: 0.12 })); break; }
        case 'buzz': narrate(line(e.steal ? 'steal' : 'buzz', { n: nameOf(e.pid) })); tone(PENTA[3 + e.pid * 2], { dur: 0.3, type: 'square', gain: 0.07 }); tone(PENTA[5 + e.pid * 2], { dur: 0.3, type: 'square', gain: 0.06, when: 0.08 }); break;
        case 'correct': narrate(line(e.steal ? 'stolen' : 'correct', { n: nameOf(e.pid), p: e.pts })); sfx('ok'); break;
        case 'wrong': narrate(line('wrong', { n: nameOf(e.pid) })); sfx('no'); break;
        case 'timeout': narrate(line('timeout', { n: nameOf(e.pid) })); sfx('no'); break;
        case 'nobody': narrate(line('nobody', { a: answersText(prev) })); break;
        case 'timeout-all': narrate(line(s.calm ? 'passed' : 'timeoutAll')); tone(196, { dur: 0.3, type: 'triangle', gain: 0.1 }); break;
        case 'relayok': narrate(line('relayok', { n: nameOf(e.pid) })); tone(PENTA[Math.min(10, 2 + s.count % 9)], { dur: 0.14, type: 'triangle', gain: 0.12 }); break;
        case 'relayno': narrate(line('relayno', { a: e.answer })); sfx('no'); break;
        case 'relay': narrate(e.done ? `Team goal reached! ${s.results.count} bonds. Everyone gets a bonus!` : `${s.results.count} bonds! The goal was ${s.results.goal}. So close, team.`); e.done ? sfx('win') : sfx('tap'); if (e.done) confetti(50); break;
        case 'estimate': { const w = e.winners.map(nameOf); narrate(w.length ? `Closest: ${w.join(' and ')}!` : 'No guesses at all? Brave strategy.'); sfx('win'); break; }
        case 'locked': sfx('tap'); narrate(`${nameOf(e.pid)} is locked in.`); break;
        case 'outoftime': sfx('tap'); narrate(`Out of time, ${nameOf(e.pid)}. Your bet stays as it was.`); break;
        case 'wager': sfx('tap'); break;
        case 'final': { const ok = s.results.filter(x => x.ok).map(x => nameOf(x.id)); narrate(ok.length ? `Big moment! Right: ${ok.join(', ')}.` : 'Ouch! Nobody got the final.'); sfx(ok.length ? 'win' : 'no'); break; }
        case 'podium': narrate(line('podium')); later(() => { confetti(90); sfx('win'); }, 400, sig); track('party/finish', `${n} players`); break;
        case 'question': if (C.round(s).type === 'estimate') narrate('Everyone gets the same question. Secret guesses!'); else if (C.round(s).type === 'relay') narrate(s.calm ? 'Go go go! Pass the baton.' : 'Go go go! The clock is running.'); else if (s.phase === 'open') narrate(pick(Math.random, ['Read your own question. Buzz when you know it!', 'Eyes on your corner. Buzz!', 'Fingers on buzzers...'])); else if (s.phase === 'answer') narrate(`${nameOf(s.buzzer)}, this one is yours.`); else if (s.phase === 'wager') narrate('The final round. Place your bets!'); break;
      }
    };
    const answersText = st => { const ids = Object.keys(st.qs); return ids.length === 1 ? String(st.qs[ids[0]].answer) : 'shown below'; };

    /* ---------- Drawing ---------- */
    const draw = prev => {
      const r = C.round(s), t = r ? r.type : null;
      prog.textContent = s.phase === 'podium' ? 'Final scores' : r ? `Round ${s.ri + 1} of ${s.rounds.length}: ${C.ROUND_INFO[t].title}${r.n > 1 && s.phase !== 'intro' ? `, ${t === 'steal' ? 'turn' : 'question'} ${s.qi + 1} of ${r.n}` : ''}` : '';
      stage.dataset.phase = s.phase; stage.dataset.round = t || '';
      drawBoard(); drawZones(); drawCenter();
      if (stepCtl) { stepCtl.abort(); stepCtl = null; }
      /* Under Calm the reveal waits for Next instead of moving on by itself */
      if (s.phase === 'reveal' && !s.calm && ['buzz', 'steal', 'trick'].includes(t)) { stepCtl = child(sig); later(() => dispatch({ type: 'next' }), reducedMotion() ? 5500 : 4200, stepCtl.signal); }
      if (prev && (s.phase !== prev.phase || s.phase === 'relay')) { const f = main.querySelector('[data-autofocus]'); if (f && (document.activeElement === document.body || stage.contains(document.activeElement))) f.focus({ preventScroll: true }); }
    };
    const drawBoard = () => {
      const max = Math.max(1, ...s.players.map(p => p.score)), lead = Math.max(...s.players.map(p => p.score));
      s.players.forEach(p => {
        const li = stage.querySelector(`.pt-score[data-p="${p.id}"]`);
        li.querySelector('.pt-sbar i').style.width = `${(p.score / max) * 100}%`;
        li.classList.toggle('is-lead', p.score === lead && lead > 0);
        if (shown[p.id] !== p.score) {
          const from = shown[p.id], to = p.score, t0 = performance.now(), el = li.querySelector('.pt-pts'); shown[p.id] = to;
          li.classList.remove('is-bump'); void li.offsetWidth; li.classList.add(to > from ? 'is-bump' : 'is-drop');
          if (reducedMotion()) el.textContent = to;
          else loop(now => { const k = Math.min(1, (now - t0) / 700); el.textContent = Math.round(from + (to - from) * (1 - (1 - k) ** 3)); return k < 1; }, sig);
        }
      });
    };
    const drawZones = () => {
      const t = C.round(s)?.type;
      s.players.forEach(p => {
        const z = stage.querySelector(`[data-buzz="${p.id}"]`), q = s.qs[p.id], locked = s.locked.includes(p.id);
        const canBuzz = (s.phase === 'open' || s.phase === 'stealopen') && !locked;
        z.classList.toggle('is-live', canBuzz); z.classList.toggle('is-locked', locked && ['open', 'stealopen', 'answer'].includes(s.phase)); z.classList.toggle('is-on', s.buzzer === p.id && s.phase === 'answer');
        const turnP = ['secret', 'relay', 'wager'].includes(s.phase) ? s.players[s.turn] : null;
        z.classList.toggle('is-turn', !!turnP && turnP.id === p.id);
        z.setAttribute('aria-disabled', String(!canBuzz));
        const zq = z.querySelector('.pt-zq'), st = z.querySelector('.pt-zst');
        zq.textContent = (t === 'buzz' || t === 'trick') && q && ['open', 'answer'].includes(s.phase) ? q.text : '';
        st.textContent = locked && ['open', 'stealopen', 'answer'].includes(s.phase) ? 'Locked out' : s.buzzer === p.id && s.phase === 'answer' ? 'Answering' : canBuzz ? (s.phase === 'stealopen' ? 'Buzz to steal!' : 'Buzz!') : turnP && turnP.id === p.id ? (s.phase === 'relay' ? 'Running' : 'Your turn') : s.phase === 'reveal' && s.event && s.event.pid === p.id && s.event.kind === 'correct' ? `+${s.event.pts}` : '';
      });
    };
    const choicesHtml = (q, off = false) => `<div class="pt-choices" role="group" aria-label="Answers">${q.choices.map((c, i) => `<button type="button" class="pt-choice" data-ans="${c}"${off ? ' disabled' : i === 0 ? ' data-autofocus' : ''}><kbd>${i + 1}</kbd><span>${c}</span></button>`).join('')}</div>`;
    const gateHtml = p => `<div class="pt-gate pt-c--${p.color}"><span class="pt-av">${avatar(p.color, 72)}</span><p class="pt-gate-t"><b>${esc(C.playerName(p))}</b>, your secret turn.</p><p class="pt-gate-s">Everyone else, look away!</p><button type="button" class="md-btn md-btn--primary pt-ready" data-autofocus>I am ready</button></div>`;
    const keypadHtml = () => `<div class="pt-pad"><output class="pt-padout" aria-label="Your guess">${pad || '<span class="pt-ph">type a guess</span>'}</output><div class="pt-keys" role="group" aria-label="Number keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button type="button" data-key="${d}">${d}</button>`).join('')}<button type="button" data-key="back" aria-label="Delete">⌫</button><button type="button" data-key="0">0</button><button type="button" data-key="ok" class="pt-ok" aria-label="Lock in" data-autofocus>Lock</button></div></div>`;
    function drawCenter() {
      const r = C.round(s), t = r?.type, cur = s.players[s.turn];
      let h = '';
      if (s.phase === 'intro') {
        const info = C.ROUND_INFO[t];
        h = `<p class="pt-rnum">Round ${s.ri + 1}</p><h2 class="pt-rtitle">${esc(info.title)}</h2><p class="pt-rblurb">${esc(blurbOf(t, s.calm))}</p>`;
        if (t === 'trick') { const tr = C.TRICKS[s.trick]; h += `<div class="pt-trick"><p class="pt-trick-n">${esc(tr.name)}${tr.sutra ? ` <small>${esc(tr.sutra)}, from Bharati Krishna Tirtha's 1965 book</small>` : ''}</p><p>${esc(tr.line)}</p><ol class="pt-demo">${tr.demo.map((d, i) => `<li style="--i:${i}">${esc(d)}</li>`).join('')}</ol><p class="px-note">Each player gets a version at their own level.</p></div>`; }
        if (t === 'relay') h += `<p class="pt-goal">Team goal: <b>${r.goal}</b> bonds ${s.calm ? `in ${r.runs} runs` : `in ${r.ms / 1000} seconds`}</p>`;
        h += `<button type="button" class="md-btn md-btn--primary pt-next pt-go" data-autofocus>Let's go</button><p class="pt-hint">Press Enter</p>`;
      } else if (s.phase === 'open') {
        h = `<p class="pt-callout">Buzz!</p><p class="pt-sub">${t === 'trick' ? `Use the trick: ${esc(C.TRICKS[s.trick].line)}` : 'Everyone has their own question in their corner. Know it? Buzz!'}</p>${s.calm ? '<button type="button" class="md-btn pt-pass">Show the answers</button>' : ''}`;
      } else if (s.phase === 'stealopen') {
        h = `<p class="pt-callout pt-callout--steal">Steal!</p><p class="pt-sub">${esc(nameOf(s.locked[0]))} missed it. Buzz to steal with a question at your level.</p>${s.calm ? '<button type="button" class="md-btn pt-pass">No steal, show the answer</button>' : ''}`;
      } else if (s.phase === 'answer') {
        const p = s.players.find(x => x.id === s.buzzer), q = s.qs[p.id];
        h = `<p class="pt-who pt-c--${p.color}"><span class="pt-av">${avatar(p.color, 40)}</span>${esc(C.playerName(p))}${s.stealing ? ' steals' : ''}</p><p class="pt-q">${esc(q.text)} = ?</p>${choicesHtml(q)}`;
      } else if (s.phase === 'secret' && t === 'estimate') {
        h = `<p class="pt-q pt-q--est">${esc(s.shared.text)}</p>` + (s.ready ? `<p class="pt-sub"><b>${esc(C.playerName(cur))}</b>, type your guess and lock it in.</p>${keypadHtml()}` : gateHtml(cur));
      } else if (s.phase === 'secret' && t === 'final') {
        const q = s.qs[cur.id];
        h = s.ready ? `<p class="pt-who pt-c--${cur.color}"><span class="pt-av">${avatar(cur.color, 40)}</span>${esc(C.playerName(cur))}, betting ${s.wagers[cur.id] || 0}</p><p class="pt-q">${esc(q.text)} = ?</p>${choicesHtml(q)}` : gateHtml(cur);
      } else if (s.phase === 'wager') {
        const opts = C.wagerOptions(cur.score);
        h = `<p class="pt-who pt-c--${cur.color}"><span class="pt-av">${avatar(cur.color, 40)}</span>${esc(C.playerName(cur))} has ${cur.score}</p><p class="pt-sub">How much will you bet on your final question? Right doubles the bet (plus a bonus), wrong loses it.</p><div class="pt-choices pt-choices--wager">${opts.map((v, i) => `<button type="button" class="pt-choice" data-wager="${v}"${i === 0 ? ' data-autofocus' : ''}><kbd>${i + 1}</kbd><span>${v === 0 ? 'Play safe' : v === cur.score ? `All in: ${v}` : `Half: ${v}`}</span></button>`).join('')}</div>`;
      } else if (s.phase === 'relay') {
        const q = s.qs[cur.id];
        h = `<div class="pt-relay"><p class="pt-count"><b>${s.count}</b><span>/ ${r.goal} bonds</span></p>${s.calm ? `<p class="pt-runs">${r.runs - s.tries} ${r.runs - s.tries === 1 ? 'run' : 'runs'} left</p>` : '<p class="pt-clock" aria-hidden="true"></p>'}</div><p class="pt-who pt-c--${cur.color}"><span class="pt-av">${avatar(cur.color, 40)}</span>${esc(C.playerName(cur))} runs</p><p class="pt-q">${esc(q.text)}</p>${choicesHtml(q, !!s.relayLock)}${s.relayLock ? '<p class="pt-sub">Fumble! Catch your breath...</p>' : ''}`;
      } else if (s.phase === 'reveal') h = revealHtml(t);
      else if (s.phase === 'podium') h = podiumHtml();
      main.innerHTML = h;
    }
    const revealHtml = t => {
      const e = s.event || {};
      const next = `<button type="button" class="md-btn md-btn--primary pt-next" data-autofocus>${s.ri === s.rounds.length - 1 ? 'To the podium' : 'Next'}</button>`;
      if (t === 'estimate' && s.results) {
        const A = s.shared.answer, vals = s.results.filter(x => x.guess != null).map(x => x.guess), lo = Math.min(A, ...vals), hi = Math.max(A, ...vals), span = Math.max(1, hi - lo);
        const pos = v => 6 + ((v - lo) / span) * 88;
        return `<p class="pt-q pt-q--est">${esc(s.shared.text)}</p><p class="pt-answer">Answer: <b>${A.toLocaleString('en-US')}</b>${s.shared.unit ? ` ${esc(s.shared.unit)}` : ''}</p>${s.shared.how ? `<p class="px-note">${esc(s.shared.how)}</p>` : ''}
          <div class="pt-line" aria-hidden="true"><span class="pt-line-a" style="left:${pos(A)}%">★</span>${s.results.filter(x => x.guess != null).map(x => { const p = s.players.find(q => q.id === x.id); return `<span class="pt-line-g pt-c--${p.color}${x.win ? ' is-win' : ''}" style="left:${pos(x.guess)}%">${avatar(p.color, 30)}</span>`; }).join('')}</div>
          <ul class="pt-res">${s.results.map(x => { const p = s.players.find(q => q.id === x.id); return `<li class="pt-c--${p.color}${x.win ? ' is-win' : ''}"><span class="pt-av">${avatar(p.color, 28)}</span>${esc(C.playerName(p))}<b>${x.guess == null ? 'no guess' : x.guess.toLocaleString('en-US')}</b><em>${x.pts ? `+${x.pts}` : ''}</em></li>`; }).join('')}</ul>${next}`;
      }
      if (t === 'relay' && s.results) return `<p class="pt-callout${s.results.done ? '' : ' pt-callout--soft'}">${s.results.count} / ${s.results.goal}</p><p class="pt-sub">${s.results.done ? 'Team goal reached! Bonus points for everyone.' : 'Not quite the goal this time. Every bond still scored.'}</p>${next}`;
      if (t === 'final' && s.results) return `<ul class="pt-res">${s.results.map(x => { const p = s.players.find(q => q.id === x.id); return `<li class="pt-c--${p.color}${x.ok ? ' is-win' : ''}"><span class="pt-av">${avatar(p.color, 28)}</span>${esc(C.playerName(p))}<b>${x.ok ? 'Right' : x.out ? 'Out of time' : 'Missed'}</b><em>${x.pts > 0 ? '+' : ''}${x.pts}</em></li>`; }).join('')}</ul>${next}`;
      const ids = Object.keys(s.qs).map(Number);
      const rows = ids.map(id => { const p = s.players.find(q => q.id === id), q = s.qs[id]; return `<li class="pt-c--${p.color}${e.pid === id && e.kind === 'correct' ? ' is-win' : ''}"><span class="pt-av">${avatar(p.color, 28)}</span>${esc(q.text)} = <b>${q.answer}</b>${q.how ? `<small>${esc(q.how)}</small>` : ''}</li>`; }).join('');
      const head_ = e.kind === 'correct' ? `<p class="pt-callout">+${e.pts}</p><p class="pt-sub">${esc(nameOf(e.pid))}${e.steal ? ' stole it' : ' got it'}!</p>` : `<p class="pt-callout pt-callout--soft">${e.kind === 'timeout-all' ? (s.calm ? 'Answers' : 'Time!') : 'Nobody'}</p>`;
      return `${head_}<ul class="pt-res pt-res--answers">${rows}</ul>${next}`;
    };
    const podiumHtml = () => {
      const st = C.standings(s), top = st.slice(0, 3), order = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : top;
      return `<h2 class="pt-rtitle">Champions of math night</h2><div class="pt-podium">${order.map(p => `<div class="pt-step pt-step--${p.place} pt-c--${p.color}"><span class="pt-av">${avatar(p.color, p.place === 1 ? 96 : 72)}</span><b>${esc(C.playerName(p))}</b><span class="pt-step-s">${p.score}</span><div class="pt-block"><span>${p.place}</span></div></div>`).join('')}</div>
        ${st.length > 3 ? `<p class="pt-sub">${st.slice(3).map(p => `${p.place}. ${esc(C.playerName(p))}, ${p.score}`).join(' · ')}</p>` : ''}
        <div class="px-row pt-endrow"><button type="button" class="md-btn md-btn--primary pt-rematch" data-autofocus>Rematch</button><button type="button" class="md-btn pt-newp">New players</button><button type="button" class="md-btn pt-share">Share the scores</button></div>`;
    };

    /* ---------- Input ---------- */
    const choose = v => {
      if (s.phase === 'wager') return dispatch({ type: 'wager', value: v });
      if (s.phase === 'secret' && !s.ready) return;
      dispatch({ type: 'answer', value: v });
    };
    const padKey = k => {
      if (!(s.phase === 'secret' && C.round(s).type === 'estimate' && s.ready)) return;
      if (k === 'ok') { if (pad) dispatch({ type: 'answer', value: Number(pad) }); return; }
      pad = k === 'back' ? pad.slice(0, -1) : (pad + k).replace(/^0+(?=\d)/, '').slice(0, 9);
      tone(PENTA[(+k || 0) % PENTA.length], { dur: 0.06, type: 'triangle', gain: 0.06 });
      const o = main.querySelector('.pt-padout'); if (o) o.innerHTML = pad ? Number(pad).toLocaleString('en-US') : '<span class="pt-ph">type a guess</span>';
    };
    const ready = () => { if (!dispatch({ type: 'ready' })) return; main.querySelector('[data-autofocus]')?.focus({ preventScroll: true }); say(C.round(s).type === 'estimate' ? `${s.shared.text} Type a guess.` : `${s.qs[s.players[s.turn].id].text}. Pick an answer.`); };
    const fsToggle = () => {
      if (!fsCan()) return;
      if (fsEl()) { fsExit(); return; }
      try { const p = (body.requestFullscreen || body.webkitRequestFullscreen)?.call(body); if (p && p.catch) p.catch(() => {}); } catch (e) {}
    };
    on(stage, 'click', e => {
      const z = e.target.closest('[data-buzz]'); if (z) { dispatch({ type: 'buzz', pid: +z.dataset.buzz }); return; }
      const c = e.target.closest('[data-ans]'); if (c) { choose(+c.dataset.ans); return; }
      const w = e.target.closest('[data-wager]'); if (w) { choose(+w.dataset.wager); return; }
      const k = e.target.closest('[data-key]'); if (k) { padKey(k.dataset.key); return; }
      if (e.target.closest('.pt-ready')) { ready(); return; }
      if (e.target.closest('.pt-next')) { dispatch({ type: 'next' }); return; }
      if (e.target.closest('.pt-pass')) { dispatch({ type: 'pass' }); return; }
      if (e.target.closest('.pt-fs')) { fsToggle(); return; }
      if (e.target.closest('.pt-snd')) { setMuted(!muted()); const b = e.target.closest('.pt-snd'); b.setAttribute('aria-pressed', String(!muted())); b.textContent = muted() ? 'Sound off' : 'Sound on'; return; }
      if (e.target.closest('.pt-quit')) { if (globalThis.confirm && !globalThis.confirm('End this game?')) return; if (fsEl()) fsExit(); setup(); return; }
      if (e.target.closest('.pt-rematch')) { track('party/rematch', 'Rematch'); startGame(freshSeed()); return; }
      if (e.target.closest('.pt-newp')) { if (fsEl()) fsExit(); setup(); return; }
      if (e.target.closest('.pt-share')) share({ title: 'Vedic Math Party', text: `Family math night! ${C.standings(s).map(p => `${p.place}. ${C.playerName(p)} ${p.score}`).join(', ')}` });
    }, sig);
    on(document, 'keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, select, textarea')) return;
      const k = e.key.toLowerCase(), onBtn = e.target.closest?.('button');
      /* A held key is one press, not a stream of buzzes and answers (Enter or Space held on a button would click it again) */
      if (e.repeat) { if (C.KEYS.includes(k) || /^[0-9]$/.test(k) || k === 'enter' || k === ' ' || k === 'backspace') e.preventDefault(); return; }
      const pi = C.KEYS.indexOf(k);
      if (pi >= 0 && pi < s.players.length) { if (dispatch({ type: 'buzz', pid: pi })) e.preventDefault(); return; }
      if (s.phase === 'secret' && C.round(s).type === 'estimate' && s.ready) {
        if (/^\d$/.test(k)) { padKey(k); e.preventDefault(); return; }
        if (k === 'backspace') { padKey('back'); e.preventDefault(); return; }
        if (k === 'enter' && !onBtn) { padKey('ok'); e.preventDefault(); return; }
      }
      if (/^[1-4]$/.test(k)) { const b = main.querySelectorAll('.pt-choice')[+k - 1]; if (b) { b.click(); e.preventDefault(); } return; }
      if ((k === 'enter' || k === ' ') && !onBtn) { const b = main.querySelector('.pt-ready, .pt-next, .pt-rematch'); if (b) { b.click(); e.preventDefault(); } return; }
      if (k === 'f' && !onBtn && fsCan()) fsToggle();
    }, sig);
    const fsChange = () => { const b = stage.querySelector('.pt-fs'), fs = fsEl() === body; if (b) { b.setAttribute('aria-pressed', String(fs)); b.textContent = fs ? 'Exit full screen' : 'Full screen'; } stage.classList.toggle('is-fs', fs); };
    on(document, 'fullscreenchange', fsChange, sig); on(document, 'webkitfullscreenchange', fsChange, sig);

    /* Clock: the reducer gets the time; the bar and countdown beeps are drawn every frame */
    every(() => dispatch({ type: 'tick', typed: pad }), 200, sig);
    loop(() => {
      if (!s.deadline) { bar.style.width = '0%'; return; }
      const left = Math.max(0, s.deadline - Date.now()), k = left / tTotal;
      bar.style.width = `${k * 100}%`; bar.classList.toggle('is-low', left < 3500);
      const secs = Math.ceil(left / 1000);
      if (secs <= 3 && secs >= 1 && secs < lastBeep && s.phase !== 'secret') { lastBeep = secs; tone(secs === 1 ? 880 : 660, { dur: 0.07, type: 'square', gain: 0.04 }); }
      const ck = main.querySelector('.pt-clock'); if (ck) ck.textContent = `${secs}s`;
    }, sig);

    dispatch({ type: 'start' });
    stage.focus({ preventScroll: true });
    stage.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
  onAbort(signal, () => { if (fsEl()) fsExit(); });

  setup();
}
