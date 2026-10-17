/* sutra-pronunciation listening page (throwaway prototype, repo-only).
   Names, Devanagari and respellings come straight from tools/ (the same code that made the clips);
   clip files, sizes and pitch from clips.json; what Whisper heard from check.json if it exists.
   Speech only follows a tap. The ambience panel tries the proposed Sutra ambience: a synthesized bowl strike,
   an optional quiet hum, and the opt-in Om (CC0 recording), all with slow fades. */
import { NAMES } from './tools/names.mjs';
import { toDeva, respell, toIPA } from './tools/sanskrit.mjs';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const RECOMMENDED = 'hf_alpha'; // see design.md decision 3; the owner's ears decide
const SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

const SHORT = { hf_alpha: 'Alpha', hf_beta: 'Beta', hm_omega: 'Omega', hm_psi: 'Psi', kid_alpha_jalpha: 'Kid blend (Alpha)', kid_beta_jalpha: 'Kid blend (Beta)', hf_alpha_espeak: 'Alpha, Hindi rules' };
let clips = { sets: [], clips: [], perSet: {} }, heard = null;
try { clips = await (await fetch('clips.json', { cache: 'no-cache' })).json(); } catch (e) {}
try { heard = await (await fetch('check.json', { cache: 'no-cache' })).json(); } catch (e) {}
const fileOf = (id, set) => { const c = clips.clips.find(x => x && x.id === id); return c && c.files[set]; };

/* ---------- One player for everything: a new tap stops what is playing ----------
   Clips play through Web Audio (decodeAudioData), like the app's natural voice: Playwright's WebKit and some
   locked-down browsers refuse an <audio> element but decode and play a buffer after a tap. */
let pressed = null, clipCtx = null, clipSrc = null;
const decoded = new Map();
function stopAll() {
  try { clipSrc && clipSrc.stop(); } catch (e) {} clipSrc = null;
  try { speechSynthesis.cancel(); } catch (e) {}
  if (pressed) pressed.setAttribute('aria-pressed', 'false'); pressed = null;
}
async function playFile(file, btn) {
  stopAll(); pressed = btn; btn && btn.setAttribute('aria-pressed', 'true');
  try {
    clipCtx = clipCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (clipCtx.state === 'suspended') clipCtx.resume();
    if (!decoded.has(file)) decoded.set(file, await clipCtx.decodeAudioData(await (await fetch(file)).arrayBuffer()));
    if (pressed !== btn) return;
    const src = clipCtx.createBufferSource(); src.buffer = decoded.get(file); src.connect(clipCtx.destination);
    src.onended = () => { if (clipSrc === src) { clipSrc = null; if (pressed === btn) stopAll(); } };
    clipSrc = src; src.start();
  } catch (e) { if (pressed === btn) stopAll(); $('#svBuiltIn').textContent = 'This clip could not play here.'; }
}

/* ---------- Built-in voices: an English voice reading the IAST (today's app), and a Hindi voice if the device has one ---------- */
const voices = () => { try { return speechSynthesis.getVoices(); } catch (e) { return []; } };
const enVoice = () => voices().find(v => /^en[-_]US/i.test(v.lang) && /natural|online|siri|samantha|google/i.test(v.name)) || voices().find(v => /^en/i.test(v.lang));
const hiVoice = () => voices().find(v => /^hi[-_]/i.test(v.lang));
function speakWith(text, voice, lang, btn) {
  stopAll(); if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text); u.lang = lang; if (voice) u.voice = voice; u.rate = 0.85;
  pressed = btn; btn.setAttribute('aria-pressed', 'true'); u.onend = u.onerror = () => { if (pressed === btn) stopAll(); };
  speechSynthesis.speak(u);
}
function builtInNote() {
  const en = enVoice(), hi = hiVoice();
  $('#svBuiltIn').innerHTML = `Built-in voice on this device: <b>${en ? esc(en.name) : 'none'}</b> reads the IAST (what read aloud would do today). Hindi voice: <b>${hi ? esc(hi.name) : 'none on this device'}</b>${hi ? ' reads the Devanagari' : ''}.`;
}
try { speechSynthesis.addEventListener('voiceschanged', () => { builtInNote(); if (!pressed) render(); }); } catch (e) {}

/* ---------- Names ---------- */
function render() {
  const sets = clips.sets || [], hi = hiVoice(), showHeard = $('#svWhisper').checked && heard;
  $('#svSets').innerHTML = sets.length ? sets.map(s => { const p = clips.perSet[s.id] || {}; return `<li><b>${esc(s.label)}</b>${s.id === RECOMMENDED ? ' (recommended)' : ''}: ${Math.round((p.bytes || 0) / 1024)} KB for all 29, typical pitch ${p.f0 || '?'} Hz${heard && heard.perSet[s.id] != null ? `, Whisper match ${heard.perSet[s.id]}` : ''}</li>`; }).join('') : '<li>No clips yet: run tools/make-clips.mjs.</li>';
  $('#svItems').innerHTML = NAMES.map(n => {
    const deva = toDeva(n.say), row = heard && heard.rows.find(r => r.id === n.id);
    const btns = sets.map(s => { const f = fileOf(n.id, s.id); return f ? `<button type="button" class="md-btn md-btn--sm ${s.id === RECOMMENDED ? 'rec' : ''} ${s.src === 'espeak' ? 'cmp' : ''}" data-file="${f.file}" aria-pressed="false" aria-label="${esc(s.label)}: ${esc(n.iast)}">${esc(SHORT[s.id] || s.label)}</button>` : ''; }).join('')
      + `<button type="button" class="md-btn md-btn--sm cmp" data-en="${esc(n.iast)}" aria-pressed="false">Built-in English (today)</button>`
      + (hi ? `<button type="button" class="md-btn md-btn--sm cmp" data-hi="${esc(deva)}" aria-pressed="false">Built-in Hindi</button>` : '');
    const rec = fileOf(n.id, RECOMMENDED);
    return `<article class="sv-item" id="${n.id}">
      <header><span class="sv-tag">${n.kind} ${n.n}</span>${n.app !== n.iast ? `<span class="sv-tag">App writes: ${esc(n.app)}</span>` : ''}</header>
      <p class="sv-deva" lang="sa">${deva}</p>
      <p class="sv-name"><b lang="sa-Latn">${esc(n.iast)}</b>${rec ? `<button type="button" class="sv-say" data-file="${rec.file}" aria-pressed="false" aria-label="Hear how to say ${esc(n.iast)}">${SPEAKER}<span>Say it</span></button>` : ''}</p>
      <p class="sv-resp">${esc(respell(n.say))}</p>
      <p class="sv-mean">${esc(n.meaning)}</p>
      ${n.note ? `<p class="sv-flag">${esc(n.note)}</p>` : ''}
      <div class="sv-btns">${btns}</div>
      <p class="sv-ipa">Phonemes sent to Kokoro: ${esc(toIPA(n.say))}</p>
      ${showHeard && row ? `<p class="sv-heard">Whisper heard: ${sets.map(s => { const h = row.heard[s.id]; return h ? `${esc(s.id)} <span class="${h.score < 0.6 ? 'lo' : ''}">${esc(h.text.length > 60 ? h.text.slice(0, 60) + '... (Whisper looped)' : h.text || '(nothing)')} (${h.score})</span>` : ''; }).join(' · ')}</p>` : ''}
    </article>`;
  }).join('');
}
$('#svItems').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.getAttribute('aria-pressed') === 'true') { stopAll(); return; }
  if (b.dataset.file) playFile(b.dataset.file, b);
  else if (b.dataset.en != null) speakWith(b.dataset.en, enVoice(), (enVoice() || {}).lang || 'en-US', b);
  else if (b.dataset.hi != null) speakWith(b.dataset.hi, hiVoice(), 'hi-IN', b);
});
$('#svWhisper').disabled = !heard;
if (!heard) $('#svWhisper').parentElement.insertAdjacentHTML('beforeend', ' <span class="sv-muted">(run tools/check.mjs first)</span>');
$('#svWhisper').addEventListener('change', render);
builtInNote(); render();

/* ---------- Sutra ambience: bowl strike, quiet hum, opt-in Om ---------- */
let ac = null, master = null, verb = null, hum = null, omTimer = 0, omBuf = null;
const vol = () => +$('#svVol').value;
function ctx() {
  if (ac) return ac;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
  verb = ac.createConvolver(); const len = ac.sampleRate * 4, buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
  verb.buffer = buf; const wet = ac.createGain(); wet.gain.value = .5; verb.connect(wet).connect(master);
  return ac;
}
const out = node => { node.connect(master); node.connect(verb); };
function fadeTo(v, secs) { const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(v, t + secs); }
/* The same bowl as js/ambient.js: inharmonic partials with slow beating and a long decay, softer */
function strike(f = 130.81 * 1.5, v = .12) {
  ctx(); if (ac.state === 'suspended') ac.resume(); fadeTo(vol() * .5, .05);
  const t0 = ac.currentTime + .05, dur = 10;
  [[1, 1], [2.71, .45], [5.12, .2], [8.3, .07]].forEach(([r, a]) => [0, 1].forEach(k => {
    const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f * r + (k ? .6 + r * .35 : 0);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v * a * .5, t0 + .03); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur / Math.sqrt(r));
    o.connect(g); out(g); o.start(t0); o.stop(t0 + dur + .5);
  }));
}
function startHum() {
  ctx(); if (ac.state === 'suspended') ac.resume(); stopHum(true);
  const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
  o.frequency.value = 65.41; o2.frequency.value = 65.41 * 1.5 * 1.002; lp.type = 'lowpass'; lp.frequency.value = 320;
  lfo.frequency.value = .06; lg.gain.value = .008; lfo.connect(lg).connect(g.gain);
  g.gain.setValueAtTime(0, ac.currentTime); g.gain.linearRampToValueAtTime(.03, ac.currentTime + 6); // slow fade in
  o.connect(lp); o2.connect(lp); lp.connect(g); out(g); o.start(); o2.start(); lfo.start();
  hum = { o, o2, lfo, g }; fadeTo(vol() * .5, 2);
}
function stopHum(now) {
  if (!hum) return; const t = ac.currentTime, h = hum; hum = null;
  h.g.gain.cancelScheduledValues(t); h.g.gain.setTargetAtTime(0, t, now ? .05 : 1.2);
  [h.o, h.o2, h.lfo].forEach(o => o.stop(t + (now ? .3 : 5)));
}
async function om() {
  ctx(); if (ac.state === 'suspended') ac.resume(); fadeTo(vol() * .5, 1);
  if (!omBuf) omBuf = await ac.decodeAudioData(await (await fetch('audio/ambience/om-commons.m4a')).arrayBuffer());
  const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = omBuf; s.playbackRate.value = .8; // slower and a little lower
  const t0 = ac.currentTime, len = omBuf.duration / .8;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.35, t0 + .4); g.gain.setValueAtTime(.35, t0 + len - .5); g.gain.linearRampToValueAtTime(0, t0 + len);
  s.connect(g); out(g); s.start(t0);
}
const note = t => { $('#svAmbNote').textContent = t; };
$('#svStrike').onclick = () => { strike(); note('One soft strike: what the Sutra page plays when it opens.'); };
$('#svHum').onclick = e => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', String(on));
  if (on) { startHum(); note('Low hum on: fades in over 6 seconds, stays very quiet.'); } else { stopHum(); note('Hum fading out.'); }
};
$('#svOm').onclick = e => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', String(on));
  clearInterval(omTimer);
  if (on) { om().catch(() => note('The Om recording could not play here.')); omTimer = setInterval(() => om().catch(() => {}), 14000); note('Om every 14 seconds instead of the bowl. Om is a sacred syllable added for atmosphere; it is not part of the 1965 book.'); }
  else note('Om off.');
};
$('#svStop').onclick = () => { clearInterval(omTimer); $('#svOm').setAttribute('aria-pressed', 'false'); $('#svHum').setAttribute('aria-pressed', 'false'); if (ac) { stopHum(); fadeTo(0, 2); } note('Fading out over 2 seconds.'); };
$('#svVol').oninput = () => { if (ac && (hum || omTimer)) fadeTo(vol() * .5, .3); };
/* Leaving the tab: the proposal fades the ambience out when the tab is hidden */
document.addEventListener('visibilitychange', () => { if (document.hidden && ac) { clearInterval(omTimer); omTimer = 0; $('#svOm').setAttribute('aria-pressed', 'false'); $('#svHum').setAttribute('aria-pressed', 'false'); stopHum(); fadeTo(0, 1); } });
