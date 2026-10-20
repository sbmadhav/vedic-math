/* Sutra ambience (openspec sutra-ambience): a very mild sound while learning the Sutras, on the Sutra page and in
   its deep dives only.
   - One soft singing-bowl strike, synthesized like the Calm music's bowls (js/ambient.js), when the page renders and
     when a deep dive opens, at most once every 4 seconds. On by default (owner decision, 2026-10-17).
   - Low hum (off by default): a very quiet low drone while reading, slow fades.
   - Chanted Om (opt-in, off by default): a short CC0 recording (sounds/om.m4a) in place of the bowl, and in place of
     the hum every 20 seconds when the hum is on. Loaded only when the switch is on. It is atmosphere, not part of
     the 1965 book (OM_NOTE is shown wherever the switch is).
   - Silent when Sound effects is off, Calm is on, Pause motion is on, the setting is off, or the site's Calm music
     was already playing when the page opened (the music is used instead, never layered). If Calm music starts while
     the ambience plays, the ambience fades out. Reduced motion alone does not silence it.
   - Starts only after a tap or key press on the page. Fades out and lets its nodes go when the Player leaves the
     Sutra pages (the view's signal aborts) or hides the tab; on the tab's return the hum, if on, fades back in, with
     no strike. Every listener and timer goes through js/life.js on the view's signal. */
import { audioContext, isPlaying as musicPlaying, onChange as onMusicChange } from './ambient.js';
import { soundOn, calmOn, onMotionChange } from './fx.js';
import { on, every, onAbort, child } from './life.js';
import { OM } from './say-clips.js';

/* The Om's absolute path: the built module is served from /play/assets/, the sounds from /sounds/ (a variable base, so
   the bundler leaves the URL alone) */
const HERE = import.meta.url;

export const OM_NOTE = 'Om is a sacred syllable added here for atmosphere. It is not part of the 1965 book.';
const KEYS = { amb: ['sutraAmb', '1'], hum: ['sutraHum', '0'], om: ['sutraOm', '0'] };
const get = k => { try { const v = localStorage.getItem('vm.' + KEYS[k][0]); return (v === null ? KEYS[k][1] : v) === '1'; } catch (e) { return KEYS[k][1] === '1'; } };
const subs = new Set();
const set = (k, v) => { try { localStorage.setItem('vm.' + KEYS[k][0], v ? '1' : '0'); } catch (e) {} subs.forEach(f => { try { f(k, !!v); } catch (e) {} }); };
export const ambienceOn = () => get('amb'), setAmbience = v => set('amb', v);
export const humOn = () => get('hum'), setHum = v => set('hum', v);
export const omOn = () => get('om'), setOm = v => set('om', v);

export const STRIKE_GAP = 4000, LEVEL = 0.16, OM_EVERY = 20000;
/* Seams for the node tests; the page uses the defaults */
export const deps = {
  ctx: () => audioContext(),
  musicOn: () => musicPlaying(),
  onMusic: fn => onMusicChange(fn),
  paused: () => { try { return document.documentElement.classList.contains('motion-paused'); } catch (e) { return false; } },
  gestured: () => { try { return !!(navigator.userActivation && navigator.userActivation.hasBeenActive); } catch (e) { return false; } },
  now: () => Date.now(),
  omUrl: () => new URL(`/sounds/om.m4a?v=${OM.v}`, HERE).href, // content hash: a changed Om is a new URL
};
export const silencedBySettings = () => !ambienceOn() || !soundOn() || calmOn() || deps.paused();

let verbBuf = null, omBuf = null; // the reverb impulse and the decoded Om, kept for the page

/* Starts the ambience for one visit to the Sutra pages. Returns { strike }: call it when a deep dive opens. */
export function sutraAmbience({ signal }) {
  const musicAtStart = deps.musicOn(); // the Calm music was playing as the page opened: it is the ambience
  let ready = deps.gestured(), pending = false, last = -Infinity, ac = null, bus = null, hum = null, omLoop = null, live = false;
  const silent = () => signal.aborted || musicAtStart || deps.musicOn() || silencedBySettings() || (typeof document !== 'undefined' && document.hidden);

  function graph() {
    if (bus) return true;
    try { ac = deps.ctx(); } catch (e) { return false; }
    if (!ac) return false;
    if (ac.state === 'suspended' && ac.resume) ac.resume().catch(() => {});
    bus = ac.createGain(); bus.gain.value = 0; bus.connect(ac.destination);
    try { bus.sutraAmbience = true; } catch (e) {} // a mark the end-to-end tests' fake Web Audio looks for
    try {
      const verb = ac.createConvolver(), len = Math.round(ac.sampleRate * 3);
      if (!verbBuf) { verbBuf = ac.createBuffer(2, len, ac.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = verbBuf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); } }
      verb.buffer = verbBuf; const wet = ac.createGain(); wet.gain.value = 0.45; verb.connect(wet).connect(bus); bus.verb = verb;
    } catch (e) { bus.verb = null; }
    return true;
  }
  const send = node => { node.connect(bus); if (bus.verb) node.connect(bus.verb); };
  function fadeIn(secs) {
    if (!graph()) return false;
    if (ac.state === 'suspended' && ac.resume) ac.resume().catch(() => {});
    const t = ac.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(LEVEL, t + secs);
    live = true; return true;
  }
  function fadeOut(secs) {
    if (omLoop) { omLoop.abort(); omLoop = null; }
    if (!bus) return;
    const t = ac.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(0, t + secs);
    if (hum) { const h = hum; hum = null; [h.o, h.o2, h.lfo].forEach(o => { try { o.stop(t + secs + 0.5); } catch (e) {} }); }
    live = false;
  }

  /* The bowl from js/ambient.js (inharmonic partials, slow beating, long decay), softer */
  function bowl(f = 130.81 * 1.5, v = 0.12) {
    const t0 = ac.currentTime + 0.05, dur = 10;
    [[1, 1], [2.71, 0.45], [5.12, 0.2], [8.3, 0.07]].forEach(([r, a]) => [0, 1].forEach(k => {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f * r + (k ? 0.6 + r * 0.35 : 0);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v * a * 0.5, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur / Math.sqrt(r));
      o.connect(g); send(g); o.start(t0); o.stop(t0 + dur + 0.5);
    }));
  }
  /* Two low sines (C2 and a fifth above) through a low pass, a slow swell, a 6 second fade in */
  function startHum() {
    if (hum || !humOn() || omOn()) return;
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.frequency.value = 65.41; o2.frequency.value = 65.41 * 1.5 * 1.002; lp.type = 'lowpass'; lp.frequency.value = 320;
    lfo.frequency.value = 0.06; lg.gain.value = 0.008; lfo.connect(lg).connect(g.gain);
    const t = ac.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 6);
    o.connect(lp); o2.connect(lp); lp.connect(g); send(g); o.start(); o2.start(); lfo.start();
    hum = { o, o2, lfo, g };
  }
  async function om() {
    if (!omBuf) omBuf = fetch(deps.omUrl()).then(r => { if (!r.ok) throw new Error('om ' + r.status); return r.arrayBuffer(); })
      .then(b => new Promise((ok, no) => { const p = ac.decodeAudioData(b, ok, no); if (p && p.catch) p.catch(no); }))
      .catch(e => { omBuf = null; throw e; });
    const buf = await omBuf;
    if (silent() || !live) return;
    const s = ac.createBufferSource(), g = ac.createGain(), len = buf.duration / 0.8, t0 = ac.currentTime;
    s.buffer = buf; s.playbackRate.value = 0.8; // slower and a little lower
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.35, t0 + 0.4); g.gain.setValueAtTime(0.35, t0 + Math.max(0.5, len - 0.5)); g.gain.linearRampToValueAtTime(0, t0 + len);
    s.connect(g); send(g); s.start(t0);
  }
  /* The hum, or with Om on and the hum on, an Om every 20 seconds */
  function bed() {
    if (silent() || !ready || !humOn()) return;
    if (!fadeIn(omOn() ? 1 : 2)) return;
    if (omOn()) { if (!omLoop) { omLoop = child(signal); every(() => { if (!silent()) om().catch(() => {}); }, OM_EVERY, omLoop.signal); } }
    else startHum();
  }
  function strike(force = false) {
    if (silent()) return;
    if (!ready) { pending = true; return; }
    const now = deps.now(); if (!force && now - last < STRIKE_GAP) return; last = now;
    if (!fadeIn(0.05)) return;
    if (omOn()) om().catch(() => {}); else bowl();
    bed();
  }

  /* The first tap or key press on the page lets sound start; a tap on Say it or the Ambience button does not strike */
  const gesture = e => {
    if (ready) return; ready = true;
    const t = e && e.target && e.target.closest ? e.target : null;
    if (t && t.closest('[data-say], [data-amb]')) { pending = false; return; }
    if (pending) { pending = false; strike(); }
  };
  if (typeof document !== 'undefined') {
    on(document, 'pointerdown', gesture, signal, { capture: true, passive: true });
    on(document, 'keydown', gesture, signal, { capture: true });
    on(document, 'visibilitychange', () => {
      if (document.hidden) fadeOut(1);
      else if (!silent()) { if (bus && ac.state === 'suspended' && ac.resume) ac.resume().catch(() => {}); bed(); } // back: the hum, no strike
    }, signal);
  }
  onMotionChange(() => { if (silent()) fadeOut(1); }, signal);
  const offMusic = deps.onMusic(() => { if (deps.musicOn()) fadeOut(1.5); });
  const onSet = (k, v) => {
    if (signal.aborted) return;
    if (silent()) { fadeOut(k === 'amb' ? 1.5 : 1); return; }
    if (k === 'amb' && v) { ready = true; strike(true); }
    else if (k === 'hum') { if (v) bed(); else if (hum) { const t = ac.currentTime, h = hum; hum = null; h.g.gain.cancelScheduledValues(t); h.g.gain.setTargetAtTime(0, t, 0.6); [h.o, h.o2, h.lfo].forEach(o => o.stop(t + 3)); } }
    else if (k === 'om') { if (omLoop) { omLoop.abort(); omLoop = null; } if (hum) { const t = ac.currentTime; [hum.o, hum.o2, hum.lfo].forEach(o => o.stop(t + 1.5)); hum.g.gain.setTargetAtTime(0, t, 0.4); hum = null; } bed(); }
  };
  subs.add(onSet);
  onAbort(signal, () => {
    subs.delete(onSet); if (typeof offMusic === 'function') offMusic();
    fadeOut(1.5);
    /* Let the nodes go once the fade has run: a silent oscillator times it on the audio clock (no page timer) */
    if (bus) {
      const b = bus; bus = null;
      try { const done = ac.createOscillator(); done.onended = () => { try { b.disconnect(); } catch (e) {} }; done.start(); done.stop(ac.currentTime + 2); } catch (e) {}
    }
  });

  strike();
  return { strike: () => strike() };
}

/* The Ambience toggle shown on the Sutra page and in the deep dive */
const BOWL = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18a9 7 0 0 1-18 0z"/><path d="M8 20h8"/><path d="M12 3c0 2-2 2-2 4M15 4c0 1.6-1.6 1.6-1.6 3.2"/></svg>';
export const ambienceButton = ({ compact = false } = {}) => `<button type="button" class="amb-btn${compact ? ' amb-btn--compact' : ''}" data-amb aria-pressed="${ambienceOn()}"${compact ? ' title="Ambience"' : ''}>${BOWL}<span>Ambience</span></button>`;
export function wireAmbience(root, signal) {
  if (!root) return;
  on(root, 'click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-amb]'); if (!b || !root.contains(b)) return;
    setAmbience(!ambienceOn());
    document.querySelectorAll('[data-amb]').forEach(x => x.setAttribute('aria-pressed', String(ambienceOn())));
  }, signal);
}
/* The Me page block: Sutra ambience, Low hum and Chanted Om with the honest note */
export const settingsHTML = () => `<div class="amb-set" role="group" aria-labelledby="ambH">
    <h3 class="mq-h3" id="ambH">Sutra ambience</h3>
    <label><input type="checkbox" id="setAmb" ${ambienceOn() ? 'checked' : ''}> A soft singing bowl on the Sutra pages</label>
    <label><input type="checkbox" id="setHum" ${humOn() ? 'checked' : ''}> Low hum while reading</label>
    <label><input type="checkbox" id="setOm" aria-describedby="omNote" ${omOn() ? 'checked' : ''}> Chanted Om instead of the bowl</label>
    <p class="mq-small" id="omNote">${OM_NOTE}</p>
    <p class="mq-small">Quiet by design. It stays silent with Sound effects off, with Calm, with Pause motion, and while Calm music plays.</p>
  </div>`;
export function wireSettings(root) {
  const box = (id, fn) => { const el = root.querySelector('#' + id); if (el) el.onchange = () => fn(el.checked); };
  box('setAmb', setAmbience); box('setHum', setHum); box('setOm', setOm);
}
