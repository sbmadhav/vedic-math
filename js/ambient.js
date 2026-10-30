/* Calm atmosphere for Vedic Math: the background sky (js/sky-bg.js: Devanagari numerals as faint constellations,
   the nakshatra wheel on the horizon, one heritage story at a time) and gentle generated music (singing bowls, tanpura drone,
   Himalayan dawn pad, temple chimes). Music never starts on its own and pauses when the tab is hidden.
   Everything is drawn and synthesized in the browser: no audio files, no extra downloads. */

import { motionPaused, setMotionPaused, calmOn, setCalm } from './fx.js';
import { on, onAbort } from './life.js';
import { mountSkyBg } from './sky-bg.js';

const pref = (k, d) => { try { const v = localStorage.getItem('vm.' + k); return v === null ? d : v; } catch (e) { return d; } };
const setPref = (k, v) => { try { localStorage.setItem('vm.' + k, v); } catch (e) {} };

/* ---------------- Background: the sky of numbers (js/sky-bg.js draws js/sky-scene.js) ----------------
   The full scene on the app home, a quieter one elsewhere (setBgLevel, called by the router). The Moving background
   switch decides whether it is drawn at all; no motion draws it still. */
import { BG_NOTES } from './sky-scene.js';
let bg = null, bgLevel = 'full';
export const bgOn = () => pref('bg', '1') === '1';
export function setBg(on) { setPref('bg', on ? '1' : '0'); if (on) startBg(); else stopBg(); }
export function setBgLevel(level) { bgLevel = level; if (bg) bg.sky.setLevel(level); }

function startBg() {
  if (bg || !bgOn()) return;
  const ctl = new AbortController();
  bg = { ctl, sky: mountSkyBg({ signal: ctl.signal, level: bgLevel }) };
}
function stopBg() { if (bg) { bg.ctl.abort(); bg = null; } }

/* ---------------- Music ---------------- */
export const TRACKS = [
  { id: 'bowls', name: 'Singing bowls', note: 'Tibetan bowls struck slowly, ringing out' },
  { id: 'tanpura', name: 'Tanpura drone', note: 'The steady Sa and Pa drone behind Indian classical music' },
  { id: 'dawn', name: 'Himalayan dawn', note: 'A soft warm pad with distant bowls' },
  { id: 'chimes', name: 'Temple chimes', note: 'Sparse bells on a gentle hum' }
];
let ac = null, master = null, verb = null, playing = null, timers = [], live = [];
export const isPlaying = () => !!playing;
export const current = () => playing || pref('track', 'bowls');
export const volume = () => +pref('vol', '0.5');
export function setVolume(v) { setPref('vol', String(v)); if (master) master.gain.setTargetAtTime(v * .5, ac.currentTime, .2); try { document.querySelectorAll('.vm-vol input').forEach(i => { if (+i.value !== +v) i.value = v; }); } catch (e) {} } /* every Volume slider (header and play shell) shows the same value */

function ctx() {
  if (ac) return ac;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  master = ac.createGain(); master.gain.value = volume() * .5;
  // Small synthetic hall reverb
  verb = ac.createConvolver(); const len = ac.sampleRate * 3.5, buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  verb.buffer = buf; const wet = ac.createGain(); wet.gain.value = .45; verb.connect(wet).connect(master);
  master.connect(ac.destination);
  return ac;
}
/* The one AudioContext the music and the Sutra ambience (js/sutra-ambience.js) share; the ambience has its own gain */
export const audioContext = () => ctx();
const out = node => { node.connect(master); node.connect(verb); };
const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); };

/* Singing bowl: inharmonic partials with slow beating and a long decay */
function bowl(f, vol = .16, at = 0) {
  const t0 = ac.currentTime + at, dur = 9 + Math.random() * 4;
  [[1, 1], [2.71, .45], [5.12, .2], [8.3, .07]].forEach(([r, a]) => {
    [0, 1].forEach(k => { const o = ac.createOscillator(), gn = ac.createGain(); o.type = 'sine'; o.frequency.value = f * r + (k ? .6 + r * .35 : 0);
      gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(vol * a * .5, t0 + .02); gn.gain.exponentialRampToValueAtTime(.0001, t0 + dur / Math.sqrt(r));
      o.connect(gn); out(gn); o.start(t0); o.stop(t0 + dur + .5); });
  });
}
/* Bell for chimes */
function bell(f, vol = .07) { const t0 = ac.currentTime; [[1, 1], [2.4, .4], [5.95, .15]].forEach(([r, a]) => { const o = ac.createOscillator(), gn = ac.createGain(); o.frequency.value = f * r; gn.gain.setValueAtTime(vol * a, t0); gn.gain.exponentialRampToValueAtTime(.0001, t0 + 4 / r); o.connect(gn); out(gn); o.start(t0); o.stop(t0 + 4.5); }); }
/* Held tone (drone or pad voice) that lives until stop() */
function hold(f, type, vol, lp = 1200) {
  const o = ac.createOscillator(), gn = ac.createGain(), fl = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
  o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = lp; lfo.frequency.value = .05 + Math.random() * .08; lg.gain.value = vol * .35;
  lfo.connect(lg).connect(gn.gain); gn.gain.setValueAtTime(0, ac.currentTime); gn.gain.linearRampToValueAtTime(vol, ac.currentTime + 4);
  o.connect(fl).connect(gn); out(gn); o.start(); lfo.start(); live.push({ o, lfo, gn });
}
/* Tanpura pluck: bright attack, slow buzzy decay */
function pluck(f, vol = .09) { const t0 = ac.currentTime, o = ac.createOscillator(), gn = ac.createGain(), fl = ac.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.setValueAtTime(2600, t0); fl.frequency.exponentialRampToValueAtTime(500, t0 + 3); gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(vol, t0 + .01); gn.gain.exponentialRampToValueAtTime(.0001, t0 + 4.2); o.connect(fl).connect(gn); out(gn); o.start(t0); o.stop(t0 + 4.4); }

const SA = 130.81; // C3 as Sa
const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];
const PLAY = {
  bowls() { const loop = () => { bowl(SA * PENTA[Math.floor(Math.random() * PENTA.length)] * (Math.random() < .3 ? 2 : 1)); later(loop, 5500 + Math.random() * 6000); }; hold(SA / 2, 'sine', .035, 400); loop(); },
  tanpura() { hold(SA / 2, 'sine', .04, 300); const seq = [SA * 3 / 4, SA, SA, SA / 2]; let i = 0; const loop = () => { pluck(seq[i % 4]); i++; later(loop, i % 4 === 0 ? 1900 : 1150); }; loop(); },
  dawn() { [SA, SA * 3 / 2, SA * 2, SA * 5 / 2].forEach((f, i) => { hold(f, 'triangle', .022 - i * .003, 900); hold(f * 1.003, 'sine', .015, 900); }); const loop = () => { bowl(SA * 2 * PENTA[Math.floor(Math.random() * 4)], .07); later(loop, 11000 + Math.random() * 9000); }; later(loop, 4000); },
  chimes() { hold(SA, 'sine', .025, 500); hold(SA * 1.5, 'sine', .012, 500); const loop = () => { bell(SA * 4 * PENTA[Math.floor(Math.random() * PENTA.length)]); if (Math.random() < .4) later(() => bell(SA * 4 * PENTA[Math.floor(Math.random() * PENTA.length)], .05), 300 + Math.random() * 500); later(loop, 2500 + Math.random() * 5000); }; loop(); }
};

export function play(id = current()) {
  stop(); ctx(); if (ac.state === 'suspended') ac.resume();
  master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(0, ac.currentTime); master.gain.linearRampToValueAtTime(volume() * .5, ac.currentTime + 2);
  playing = id; setPref('track', id); (PLAY[id] || PLAY.bowls)(); emit();
  try { window.siteTrack && window.siteTrack('vedic-math/music/' + id, 'Music: ' + id); } catch (e) {}
}
export function stop() {
  timers.forEach(clearTimeout); timers = [];
  if (ac) { const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(0, t, .6); live.forEach(({ o, lfo, gn }) => { gn.gain.cancelScheduledValues(t); gn.gain.setTargetAtTime(0, t, .4); o.stop(t + 2); lfo.stop(t + 2); }); }
  live = []; const was = playing; playing = null; if (was) emit();
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { /* guarded: js/shell.js, which unit tests import, imports this module */ if (!ac) return; if (document.hidden) ac.suspend(); else if (playing) ac.resume(); });

const subs = new Set(); export const onChange = fn => (subs.add(fn), () => subs.delete(fn)); const emit = () => subs.forEach(f => f());

/* The Calm and sound control (openspec change play-nav-by-mode): one pill in the header of every page of the game, and
   a smaller one in the play shell's header, that opens one panel with Calm, Pause motion and the Calm music picker.
   Nothing in it starts by itself. idp prefixes its ids (vm in the header, pl in the shell); shell: the play shell's
   panel, which leaves out the moving background and its notes (the round covers them) and Calm (the shell has its own
   Calm switch). Every listener is on signal (js/life.js): the page's lifetime in the header, the round's in the shell. */
const NOTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l11-2v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="17.5" cy="16" r="2.5" fill="currentColor"/></svg>';
const sw = (id, cls, label, on, note = '') => `<button type="button" class="md-switch ${cls}" role="switch" id="${id}" aria-checked="${on}"${note ? ` aria-describedby="${id}N"` : ''}><span>${label}</span><span class="md-track" aria-hidden="true"><span class="md-knob"></span></span></button>${note ? `<p class="mq-small vm-swnote" id="${id}N">${note}</p>` : ''}`;
export function mountSound(slot, { signal, idp = 'vm', shell = false } = {}) {
  if (!slot) return;
  const id = k => idp + k;
  slot.innerHTML = `<button type="button" class="vm-mbtn${shell ? ' vm-mbtn--sm' : ''}" id="${id('MBtn')}" aria-expanded="false" aria-controls="${id('MPanel')}" aria-label="Calm and sound">${NOTE}<span class="lbl" aria-hidden="true">Calm</span><span class="vm-eq" aria-hidden="true"><i></i><i></i><i></i></span></button>
    <div class="vm-mpanel md-card" id="${id('MPanel')}" role="group" aria-label="Calm and sound" hidden><b class="vm-mt">Calm and sound</b>
    ${shell ? '' : sw(id('Calm'), 'vm-calm', 'Calm', calmOn(), 'No clocks in Practice, and nothing moves.')}
    ${sw(id('Motion'), 'vm-motion', 'Pause motion', motionPaused())}
    <b class="vm-mt vm-mt--sub">Calm music</b><p class="mq-small">Gentle sounds made live in your browser. They never start by themselves.</p>
    <div class="vm-tracks" role="group" aria-label="Choose music">${TRACKS.map(t => `<button class="vm-track" data-t="${t.id}" aria-pressed="false"><b>${t.name}</b><small>${t.note}</small></button>`).join('')}</div>
    <div class="vm-mrow"><button class="md-btn md-btn--sm vm-stop" id="${id('Stop')}">Stop</button><label class="vm-vol">Volume <input type="range" min="0" max="1" step="0.05" value="${volume()}" id="${id('Vol')}"></label></div>
    ${shell ? '' : `<label class="vm-bgt"><input type="checkbox" id="${id('Bg')}" ${bgOn() ? 'checked' : ''}> Moving background</label>
    <details class="vm-about"><summary>What is in the background?</summary><ul>${BG_NOTES.map(([h, b]) => `<li><b>${h}</b> ${b}</li>`).join('')}</ul></details>`}</div>`;
  const btn = slot.querySelector('.vm-mbtn'), panel = slot.querySelector('.vm-mpanel');
  const sync = () => { btn.classList.toggle('on', isPlaying()); slot.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-pressed', String(playing === b.dataset.t))); };
  const calm = () => { btn.classList.toggle('calm', calmOn()); const c = slot.querySelector('.vm-calm'); if (c) c.setAttribute('aria-checked', String(calmOn())); };
  const close = (focus = false) => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (focus) btn.focus(); };
  on(btn, 'click', e => { e.stopPropagation(); const open = panel.hidden; panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); }, signal);
  on(document, 'click', e => { if (!panel.hidden && !slot.contains(e.target)) close(); }, signal);
  on(document, 'keydown', e => { if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); close(true); } /* consumed: a round's own Escape (skip a replay) ignores a prevented key */ }, signal);
  slot.querySelectorAll('[data-t]').forEach(b => on(b, 'click', () => (playing === b.dataset.t ? stop() : play(b.dataset.t)), signal));
  on(slot.querySelector('.vm-stop'), 'click', stop, signal);
  on(slot.querySelector('input[type="range"]'), 'input', e => setVolume(+e.target.value), signal);
  const bgBox = slot.querySelector('.vm-bgt input'); if (bgBox) on(bgBox, 'change', e => setBg(e.target.checked), signal);
  on(slot.querySelector('.vm-motion'), 'click', () => setMotionPaused(!motionPaused()), signal);
  const c = slot.querySelector('.vm-calm'); if (c) on(c, 'click', () => setCalm(!calmOn()), signal);
  on(document, 'vmcalm', calm, signal);
  onAbort(signal, onChange(sync)); sync(); calm();
}
/* The header's control, for the page's lifetime */
const page = new AbortController();
export const mountMusic = slot => mountSound(slot, { signal: page.signal });

export function initAmbient() {
  mountMusic(document.getElementById('mqMusic'));
  // The sky waits for the page to load and the browser to be idle (js/sky-bg.js)
  startBg();
}
