import type { Page } from '@playwright/test';

/* A fake Web Audio and speech engine for the Say it and Sutra ambience specs (openspec sutra-pronunciation and
   sutra-ambience). Nothing is heard. window.__audio records every node the page makes (kind, frequency, what it
   connects to, gain ramps, start and stop), every decoded buffer, and whether a node is the Sutra ambience's bus
   (js/sutra-ambience.js marks it). A decoded buffer lasts window.__clipSecs seconds (default 1.2); a buffer source
   fires onended when it has played that long or when it is stopped. speechSynthesis is a recorder (window.__said). */
export async function fakeAudio(page: Page, { clipSecs = 1.2 } = {}) {
  await page.addInitScript(secs => {
    const w = window as any;
    w.__clipSecs = secs;
    const A = (w.__audio = { nodes: [] as any[], decoded: 0, contexts: 0 });
    const t0 = performance.now();
    // The fake clock every context shares, readable by a spec as window.__audio.currentTime
    Object.defineProperty(A, 'currentTime', { get: () => (performance.now() - t0) / 1000 });
    const param = (v: number) => {
      const p: any = { value: v, ramps: [] as any[] };
      for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues'])
        p[m] = (...a: any[]) => { p.ramps.push([m, ...a]); if (m !== 'cancelScheduledValues') p.value = a[0]; return p; };
      return p;
    };
    class Ctx {
      state = 'running'; sampleRate = 24000; destination: any = { kind: 'destination' }; id: number;
      constructor() { this.id = ++A.contexts; }
      get currentTime() { return (A as any).currentTime as number; }
      resume() { this.state = 'running'; return Promise.resolve(); }
      suspend() { this.state = 'suspended'; return Promise.resolve(); }
      close() { return Promise.resolve(); }
      make(kind: string) {
        const ctx = this;
        const n: any = {
          kind, ctx: this.id, to: [] as string[], started: null as null | number, stopped: null as null | number, onended: null as any, buffer: null,
          gain: param(1), frequency: param(440), detune: param(0), Q: param(1), playbackRate: param(1), type: 'sine',
          connect(x: any) { n.to.push(x && x.kind === 'destination' ? 'destination' : x && x.kind); return x; },
          disconnect() { n.to = []; },
          start(at = 0) { n.started = ctx.currentTime; if (kind === 'source') { const secs = n.buffer ? n.buffer.duration : 0; n.timer = setTimeout(() => { if (n.stopped === null) { n.stopped = ctx.currentTime; n.onended && n.onended(); } }, (secs / (n.playbackRate.value || 1)) * 1000 + Math.max(0, at - ctx.currentTime) * 1000); } },
          stop(at?: number) {
            n.stopAt = at ?? ctx.currentTime;
            if (kind === 'source') { clearTimeout(n.timer); if (n.stopped === null) { n.stopped = ctx.currentTime; n.onended && n.onended(); } }
            else if (n.stopped === null) { n.stopped = n.stopAt; const ms = Math.max(0, (n.stopAt - ctx.currentTime) * 1000); setTimeout(() => n.onended && n.onended(), ms); }
          },
        };
        A.nodes.push(n);
        return n;
      }
      createGain() { return this.make('gain'); }
      createOscillator() { return this.make('osc'); }
      createBiquadFilter() { return this.make('filter'); }
      createConvolver() { return this.make('verb'); }
      createBufferSource() { return this.make('source'); }
      createDynamicsCompressor() { return this.make('comp'); }
      createBuffer(ch: number, len: number, rate: number) { return { duration: len / rate, sampleRate: rate, numberOfChannels: ch, getChannelData: () => new Float32Array(len), copyToChannel() {} }; }
      decodeAudioData(buf: ArrayBuffer, ok?: (b: any) => void, no?: (e: any) => void) {
        const b = { duration: w.__clipSecs, sampleRate: 24000, numberOfChannels: 1, getChannelData: () => new Float32Array(10), bytes: buf.byteLength };
        A.decoded++;
        if (ok) setTimeout(() => ok(b), 0);
        return Promise.resolve(b);
      }
    }
    Object.defineProperty(window, 'AudioContext', { value: Ctx, configurable: true, writable: true });
    Object.defineProperty(window, 'webkitAudioContext', { value: Ctx, configurable: true, writable: true });

    w.__said = [];
    const voice = { name: 'Samantha', lang: 'en-US', voiceURI: 'Samantha', localService: true, default: true };
    const synth = {
      getVoices: () => [voice], pending: false, speaking: false, paused: false,
      speak(u: any) { w.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 0); },
      cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    class Utterance { text: string; voice: unknown = null; lang = ''; pitch = 1; rate = 1; volume = 1; onend: null | (() => void) = null; onerror = null; constructor(t: string) { this.text = t; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
  }, clipSecs);
}

type Node = { kind: string; ctx: number; to: string[]; started: number | null; stopped: number | null; stopAt?: number; frequency: { value: number }; gain: { value: number; ramps: any[][] }; buffer: any; sutraAmbience?: boolean };
/** A plain copy of what the fake recorded */
export const audioLog = (page: Page) => page.evaluate(() => {
  const A = (window as any).__audio;
  return {
    decoded: A.decoded as number,
    nodes: (A.nodes as any[]).map(n => ({ kind: n.kind, ctx: n.ctx, to: [...n.to], started: n.started, stopped: n.stopped, stopAt: n.stopAt, frequency: { value: n.frequency.value }, gain: { value: n.gain.value, ramps: n.gain.ramps.map((r: any[]) => [...r]) }, buffer: n.buffer ? { duration: n.buffer.duration } : null, sutraAmbience: !!n.sutraAmbience })) as Node[],
  };
});
/** Bowl strikes of the Sutra ambience: each strike makes one oscillator at the bowl's fundamental (G3, 196.215 Hz) */
export const BOWL_HZ = 130.81 * 1.5;
export const strikes = (log: { nodes: Node[] }) => log.nodes.filter(n => n.kind === 'osc' && Math.abs(n.frequency.value - BOWL_HZ) < 0.01).length;
export const ambienceBus = (log: { nodes: Node[] }) => log.nodes.filter(n => n.sutraAmbience);
export const rampedToZero = (n: Node) => n.gain.ramps.some(r => r[0] === 'linearRampToValueAtTime' && r[1] === 0);
export const hums = (log: { nodes: Node[] }) => log.nodes.filter(n => n.kind === 'osc' && Math.abs(n.frequency.value - 65.41) < 0.01);
export const said = (page: Page) => page.evaluate(() => ((window as any).__said as string[]).slice());
