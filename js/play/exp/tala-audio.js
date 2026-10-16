/* Tala Lab sound: synthesized percussion (no audio files) and a look-ahead scheduler on the AudioContext
   clock. Notes are placed with start(time) a little ahead of when they sound, so timing never depends on
   when a JavaScript timer happens to run. The scheduling tick and the visual cues go through js/life.js. */
import { audio, muted, PENTA } from '../kit.js';
import { every, loop, later, onAbort, child } from '../life.js';
import { eventsInWindow, plan } from './tala-core.js';

/* ---------- The mixing bus: a gentle compressor and a short room ---------- */
let BUS = null;
function bus(a) {
  if (BUS && BUS.ctx === a) return BUS;
  const comp = a.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.2;
  const out = a.createGain(); out.gain.value = 0.9;
  const room = a.createConvolver(), wet = a.createGain(); wet.gain.value = 0.16;
  room.buffer = impulse(a, 1.6, 2.6);
  comp.connect(out).connect(a.destination);
  room.connect(wet).connect(comp);
  const noise = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate), d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  BUS = { ctx: a, dry: comp, room, noise };
  return BUS;
}
function impulse(a, secs, decay) {
  const len = Math.floor(a.sampleRate * secs), b = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}
const env = (a, t, peak, attack, release) => { const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release); return g; };
function osc(a, B, t, { type = 'sine', f0, f1, glide = 0.1, peak, attack = 0.002, release, wet = 0.4 }) {
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
  const g = env(a, t, peak, attack, release); o.connect(g); g.connect(B.dry);
  if (wet) { const w = a.createGain(); w.gain.value = wet; g.connect(w).connect(B.room); }
  o.start(t); o.stop(t + attack + release + 0.05);
}
function noise(a, B, t, { type = 'bandpass', freq = 3000, q = 1, peak, release, attack = 0.001, wet = 0.2, offset = 0 }) {
  const s = a.createBufferSource(); s.buffer = B.noise;
  const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = env(a, t, peak, attack, release); s.connect(f).connect(g).connect(B.dry);
  if (wet) { const w = a.createGain(); w.gain.value = wet; g.connect(w).connect(B.room); }
  s.start(t, offset); s.stop(t + attack + release + 0.05);
}

/* The voices. gain scales each; `accent` lifts it a little. All sound at time t on the audio clock. */
const VOICES = {
  /* deep left head of the mridangam: a falling low tone with a soft thump */
  thom(a, B, t, v) { osc(a, B, t, { f0: 140, f1: 68, glide: 0.18, peak: 0.55 * v, release: 0.55, wet: 0.25 }); noise(a, B, t, { type: 'lowpass', freq: 380, peak: 0.25 * v, release: 0.08, wet: 0 }); },
  /* ringing right-head stroke: a bright pitched ping with a crisp edge */
  ta(a, B, t, v) { osc(a, B, t, { type: 'triangle', f0: 620, f1: 560, glide: 0.05, peak: 0.24 * v, release: 0.16 }); osc(a, B, t, { f0: 1240, peak: 0.06 * v, release: 0.07, wet: 0 }); noise(a, B, t, { freq: 3600, q: 1.4, peak: 0.16 * v, release: 0.03, wet: 0.1 }); },
  /* open pitched stroke (dhi): a longer singing tone */
  di(a, B, t, v) { osc(a, B, t, { type: 'sine', f0: 392, f1: 384, glide: 0.3, peak: 0.26 * v, release: 0.42, wet: 0.5 }); osc(a, B, t, { f0: 784, peak: 0.05 * v, release: 0.2 }); noise(a, B, t, { freq: 2400, q: 2, peak: 0.08 * v, release: 0.025, wet: 0 }); },
  /* soft closed stroke */
  ki(a, B, t, v) { noise(a, B, t, { freq: 5200, q: 1.6, peak: 0.13 * v, release: 0.04, wet: 0.15 }); osc(a, B, t, { type: 'triangle', f0: 900, peak: 0.04 * v, release: 0.03, wet: 0 }); },
  /* a hand clap: three quick bursts */
  clap(a, B, t, v) { [0, 0.011, 0.022].forEach((d, i) => noise(a, B, t + d, { freq: 1300, q: 0.9, peak: (i === 2 ? 0.3 : 0.18) * v, release: i === 2 ? 0.12 : 0.012, wet: 0.35 })); },
  /* the wave of the palm: a soft brush */
  wave(a, B, t, v) { noise(a, B, t, { type: 'lowpass', freq: 900, q: 0.4, peak: 0.12 * v, attack: 0.02, release: 0.12, wet: 0.3 }); },
  /* a quiet metronome tick */
  tick(a, B, t, v) { osc(a, B, t, { type: 'sine', f0: 1760, peak: 0.05 * v, release: 0.03, wet: 0 }); },
  /* sam: the clap and a low thom together, with a soft bell */
  sam(a, B, t, v) { VOICES.clap(a, B, t, v); VOICES.thom(a, B, t, 0.7 * v); osc(a, B, t, { f0: PENTA[0], peak: 0.07 * v, release: 1.2, wet: 0.7 }); },
  /* the meeting chord: a bloom of pentatonic bells, slightly spread */
  bloom(a, B, t, v) {
    [0, 2, 4, 7, 9].forEach((n, i) => { osc(a, B, t + i * 0.035, { f0: PENTA[n], peak: 0.09 * v, attack: 0.01, release: 2.4, wet: 0.9 }); osc(a, B, t + i * 0.035, { f0: PENTA[n] * 2.01, peak: 0.02 * v, attack: 0.01, release: 1.2, wet: 0.9 }); });
    VOICES.thom(a, B, t, 0.9 * v);
  },
  none() {}, rest() {}
};
export const VOICE_NAMES = Object.keys(VOICES);

/* Play one voice now or at an audio time. Silent when sound is off. */
export function hit(voice, { at = 0, gain = 1 } = {}) {
  if (muted()) return; const a = audio(); if (!a) return;
  const B = bus(a); (VOICES[voice] || VOICES.ki)(a, B, at || a.currentTime + 0.005, gain);
}

/* ---------- Clock ---------- */
/* Audio time when there is a running AudioContext (sound on or off: the clock still runs), otherwise
   performance time. `heard(e)` maps an event time to when it is heard (output latency). `fromEvent`
   turns a DOM event timestamp into clock time. */
export async function makeClock(signal) {
  const a = audio();
  if (a && a.state !== 'running') { try { await Promise.race([a.resume(), new Promise(r => later(r, 300, signal))]); } catch (e) {} }
  if (a && a.state === 'running') {
    const lat = () => (a.outputLatency || 0) + (a.baseLatency || 0);
    return {
      audio: a, now: () => a.currentTime, latency: lat,
      fromEvent(ts) {
        try { const o = a.getOutputTimestamp && a.getOutputTimestamp(); if (o && o.performanceTime > 0) return o.contextTime + (ts - o.performanceTime) / 1000; } catch (e) {}
        return a.currentTime - lat() - Math.max(0, (performance.now() - ts) / 1000);
      }
    };
  }
  return { audio: null, now: () => performance.now() / 1000, latency: () => 0, fromEvent: ts => ts / 1000 };
}

/* ---------- Scheduler ---------- */
/* Plays a pattern (see tala-core) from now. Every 25 ms (life.every, tied to signal) it schedules the
   next 120 ms of notes on the audio clock; a frame loop (life.loop) hands each event to onCue when it
   is heard. gainOf(e) sets loudness (0 skips sound). Returns { start, stop(), setBpm(bpm), at(time) }. */
export function schedule({ clock, pattern, bpm, signal, onCue = () => {}, onEnd = () => {}, gainOf = e => (e.soft ? 0.55 : e.accent ? 1 : 0.8), lead = 0.12 }) {
  let start = clock.now() + lead, horizon = start, tempo = bpm, stopped = false;
  const cues = [];
  const unit = () => 60 / tempo / pattern.perBeat;
  const endAt = () => (pattern.loop ? Infinity : start + pattern.len * unit());
  const tick = () => {
    if (stopped) return;
    const now = clock.now(), w = plan(horizon, now);
    horizon = w.horizon;
    for (const e of eventsInWindow(pattern, start, tempo, w.from, w.to)) {
      const g = gainOf(e);
      if (g > 0 && clock.audio && e.voice !== 'none') hit(e.voice, { at: e.time, gain: g });
      cues.push(e);
    }
  };
  tick();
  every(tick, 25, signal);
  let ended = false;
  loop(() => {
    if (stopped) return false;
    const heardNow = clock.now() - clock.latency();
    while (cues.length && cues[0].time <= heardNow) onCue(cues.shift());
    if (!ended && heardNow >= endAt() + unit() * 0.5) { ended = true; stopped = true; onEnd(); return false; }
  }, signal);
  return {
    get start() { return start; },
    unit,
    stop() { stopped = true; cues.length = 0; },
    /* change tempo without a jump: keep the current position in the loop */
    setBpm(b) {
      const now = clock.now(), pos = (now - start) / unit();
      tempo = b; start = now - pos * unit();
      /* notes already scheduled keep their times; the next tick continues on the new grid */
    },
    get bpm() { return tempo; }
  };
}

/* ---------- Microphone (opt in) ---------- */
/* Listens for claps with an onset detector on loudness. Audio stays on this device; nothing is stored.
   onClap(clockTime). Returns a stop function; stops on its own when signal aborts. */
export async function listen({ clock, signal, detector, onClap, onLevel = () => {} }) {
  const a = clock.audio; if (!a || !navigator.mediaDevices?.getUserMedia) throw new Error('no-mic');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
  const src = a.createMediaStreamSource(stream), an = a.createAnalyser(); an.fftSize = 512; src.connect(an);
  const buf = new Float32Array(an.fftSize);
  let live = true;
  const stop = () => { if (!live) return; live = false; stream.getTracks().forEach(t => t.stop()); src.disconnect(); };
  onAbort(signal, stop);
  const ctl = child(signal);
  loop(() => {
    if (!live) return false;
    an.getFloatTimeDomainData(buf);
    let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    const level = Math.sqrt(s / buf.length); onLevel(level);
    /* the frame holds the last fftSize samples; the clap began about half a frame ago */
    if (detector(level, a.currentTime * 1000)) onClap(a.currentTime - an.fftSize / a.sampleRate / 2 - (a.baseLatency || 0));
  }, ctl.signal);
  return () => { stop(); ctl.abort(); };
}
