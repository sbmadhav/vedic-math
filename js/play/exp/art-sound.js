/* Mandala Studio sound: soft bells and plucked strings in a small generated room, scheduled on the
   AudioContext clock. An "ensemble" groups notes under one gain so stopping it silences every note
   already scheduled. Silent when sound is off (kit.muted). */
import { audio, muted } from '../kit.js';

let BUS = null;
function bus(a) {
  if (BUS && BUS.ctx === a) return BUS;
  const comp = a.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
  const room = a.createConvolver(), wet = a.createGain(); wet.gain.value = 0.32;
  const len = Math.floor(a.sampleRate * 2.8), ir = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  room.buffer = ir; room.connect(wet).connect(comp); comp.connect(a.destination);
  BUS = { ctx: a, dry: comp, room };
  return BUS;
}

/* An ensemble: notes go through its gain; stop() fades it out and disconnects. */
export function ensemble() {
  const a = !muted() && audio();
  if (!a) return { ctx: null, now: () => 0, bell() {}, pluck() {}, stop() {} };
  const B = bus(a), g = a.createGain(); g.gain.value = 1; g.connect(B.dry);
  const send = a.createGain(); send.gain.value = 1; send.connect(B.room);
  let live = true;
  const voice = (t, build) => { if (!live) return; build(t); };
  return {
    ctx: a, now: () => a.currentTime,
    /* a bell: sine with a soft inharmonic partial */
    bell(freq, at = 0, gain = 0.12, dur = 1.6) {
      voice(at || a.currentTime + 0.01, t => {
        [[1, gain, dur], [2.76, gain * 0.18, dur * 0.4], [5.4, gain * 0.05, dur * 0.2]].forEach(([r, gg, d]) => {
          const o = a.createOscillator(), e = a.createGain(); o.frequency.value = freq * r;
          e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(gg, t + 0.008); e.gain.exponentialRampToValueAtTime(0.0001, t + d);
          o.connect(e); e.connect(g); e.connect(send); o.start(t); o.stop(t + d + 0.05);
        });
      });
    },
    /* a plucked string: a bright tone whose filter closes */
    pluck(freq, at = 0, gain = 0.14, dur = 1.2) {
      voice(at || a.currentTime + 0.01, t => {
        const o = a.createOscillator(), f = a.createBiquadFilter(), e = a.createGain();
        o.type = 'sawtooth'; o.frequency.value = freq; f.type = 'lowpass'; f.Q.value = 2;
        f.frequency.setValueAtTime(freq * 8, t); f.frequency.exponentialRampToValueAtTime(freq * 1.2, t + dur * 0.6);
        e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(gain, t + 0.004); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(f).connect(e); e.connect(g); e.connect(send); o.start(t); o.stop(t + dur + 0.05);
      });
    },
    stop() {
      if (!live) return; live = false;
      const t = a.currentTime; g.gain.setTargetAtTime(0.0001, t, 0.05); send.gain.setTargetAtTime(0.0001, t, 0.05);
      const o = a.createOscillator(); o.connect(a.createGain()); o.onended = () => { g.disconnect(); send.disconnect(); }; o.start(t); o.stop(t + 0.4);
    }
  };
}

/* Two sustained strings for hearing an error as beats: setPitches(f1, f2), stop() */
export function twoStrings() {
  const a = !muted() && audio();
  if (!a) return { set() {}, stop() {} };
  const B = bus(a), out = a.createGain(); out.gain.value = 0.0001; out.connect(B.dry);
  const mk = () => { const o = a.createOscillator(); o.type = 'triangle'; const g = a.createGain(); g.gain.value = 0.5; o.connect(g).connect(out); o.start(); return o; };
  const o1 = mk(), o2 = mk();
  out.gain.setTargetAtTime(0.09, a.currentTime, 0.08);
  return {
    set(f1, f2) { const t = a.currentTime; o1.frequency.setTargetAtTime(f1, t, 0.05); o2.frequency.setTargetAtTime(f2, t, 0.05); },
    stop() { const t = a.currentTime; out.gain.setTargetAtTime(0.0001, t, 0.12); o1.stop(t + 0.8); o2.stop(t + 0.8); o2.onended = () => out.disconnect(); }
  };
}
