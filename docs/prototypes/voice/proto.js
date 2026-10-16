/* better-voice listening prototype. Throwaway: not part of the app, never published (docs/ is repo-only).
   1. Today: js/voice.js speak() with the built-in voice, exactly as the game calls it.
   2. Tuned built-in (A): the proposed ranking (good, ok, poor), pitch 1, a calm rate.
   3. Kokoro stitched (B): one AAC sprite decoded with Web Audio, clips joined at play time.
   4. Kokoro whole: one AAC file per line, the quality ceiling for B.
   B plays in the Kokoro voice picked at the top (Heart, or the kid blend proposed for Explorer).
   The kid-voice panel plays four lines in each Kokoro candidate (stock voices and blends, never pitch shifted). */
import { speak as speakToday, stop as stopToday, normalize, sentences } from '../../../js/voice.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* ---------- Color mode (same saved key as the site) ---------- */
document.querySelectorAll('.md-modes button').forEach(b => {
  const cur = (() => { try { return localStorage.getItem('theme') || 'system'; } catch (e) { return 'system'; } })();
  b.setAttribute('aria-pressed', String(b.dataset.mode === cur));
  b.addEventListener('click', () => {
    const m = b.dataset.mode;
    if (m === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = m;
    try { m === 'system' ? localStorage.removeItem('theme') : localStorage.setItem('theme', m); } catch (e) {}
    document.querySelectorAll('.md-modes button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  });
});

/* ---------- Plan A: rate every voice good, ok or poor ---------- */
const NOVELTY = /espeak|\b(fred|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|kathy|hysterical|deranged|grandma|grandpa|rocko|shelley|eddy|flo|reed|sandy)\b/i;
export function rateVoice(v) {
  const name = v.name || '', uri = v.voiceURI || '';
  if (!/^en([-_]|$)/i.test(v.lang || '')) return null;
  if (NOVELTY.test(name) || NOVELTY.test(uri)) return { tier: 'poor', why: 'novelty or eSpeak', pts: 0 };
  if (/\bcompact\b/i.test(uri)) return { tier: 'poor', why: 'compact (small, robotic)', pts: 5 };
  if (/^microsoft\b/i.test(name) && !/\bonline\b/i.test(name)) return { tier: 'poor', why: 'Windows desktop voice', pts: 8 };
  /* Real child voices exist only as Microsoft's online neural voices (Edge): Ana (US) and Maisie (UK) */
  if (/\b(ana|maisie)\b/i.test(name) && /\bonline\b/i.test(name)) return { tier: 'good', why: 'child neural voice (Edge)', pts: 96 + lang(v), kid: true };
  const good = [[/\b(natural|neural)\b/i, 100, 'neural'], [/\bonline\b/i, 95, 'Microsoft online neural'], [/\bsiri\b/i, 90, 'Siri'],
    [/\bpremium\b/i, 88, 'Premium'], [/\benhanced\b/i, 84, 'Enhanced'], [/^google\b/i, 75, 'Google']];
  for (const [re, pts, why] of good) if (re.test(name) || re.test(uri)) return { tier: 'good', why, pts: pts + lang(v) };
  return { tier: 'ok', why: 'standard system voice', pts: 40 + lang(v) };
}
const lang = v => { const l = (v.lang || '').replace('_', '-').toLowerCase(); return l === 'en-us' ? 4 : l === 'en-gb' ? 3 : l === 'en-in' ? 2 : 1; };
const voices = () => ('speechSynthesis' in window ? speechSynthesis.getVoices() : []);
/* Explorer prefers a child voice when the device has one; everyone else never gets one first */
function ranked(explorer = false) {
  const pts = x => x.r.pts + (x.r.kid ? (explorer ? 50 : -50) : 0);
  return voices().map(v => ({ v, r: rateVoice(v) })).filter(x => x.r).sort((a, b) => pts(b) - pts(a) || a.v.name.localeCompare(b.v.name));
}
function showVoices() {
  const list = ranked(), best = list[0], kid = ranked(true)[0];
  $('#vpVoice').innerHTML = best ? `Tuned voice on this device: <b>${esc(best.v.name)}</b> (${esc(best.v.lang)}), rated <b>${best.r.tier}</b>: ${esc(best.r.why)}.`
    + (kid && kid.r.kid ? ` For Explorer lines it uses the child voice <b>${esc(kid.v.name)}</b>.` : ' No child voice on this device (only Edge has them: Microsoft Ana and Maisie).') : 'This browser has no English built-in voice. Only the Kokoro rows can play.';
  const warn = $('#vpWarn');
  if (best && best.r.tier === 'poor') {
    warn.hidden = false;
    warn.innerHTML = 'Plan A would show this once in Me settings: <i>"The voices on this device sound robotic. For a clearer voice, add an Enhanced English voice: on iPhone or iPad, Settings, Accessibility, Spoken Content, Voices; on a Mac, System Settings, Accessibility, Spoken Content, System voice, Manage Voices; on Windows, Settings, Time and language, Speech."</i>';
  } else warn.hidden = true;
  $('#vpList').innerHTML = list.map(x => `<li class="${x.r.tier}">${esc(x.v.name)} (${esc(x.v.lang)}): ${x.r.tier}, ${esc(x.r.why)}${x.r.kid ? ', child' : ''}</li>`).join('') || '<li>None</li>';
}
showVoices();
if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', showVoices);

let token = 0;
function speakTuned(html, explorer) {
  const list = ranked(explorer); if (!list.length) return;
  const v = list[0].v, parts = sentences(normalize(html)), my = token;
  let i = 0;
  const next = () => {
    if (my !== token || i >= parts.length) return;
    const u = new SpeechSynthesisUtterance(parts[i++]);
    u.voice = v; u.lang = v.lang; u.pitch = 1; u.rate = explorer ? 0.9 : 0.95; u.volume = 1;
    u.onend = () => setTimeout(next, 160); u.onerror = () => setTimeout(next, 0);
    speechSynthesis.speak(u);
  };
  setTimeout(next, 40);
}

/* ---------- Plan B: Kokoro clips ---------- */
let actx = null, playingNodes = [];
const ctx = () => { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; };
const decode = buf => new Promise((res, rej) => ctx().decodeAudioData(buf, res, rej));
const sprites = new Map(); // voice key -> Promise<{ buf, map }>
function loadSprite(voice) {
  if (!sprites.has(voice.key)) sprites.set(voice.key, Promise.all([fetch(voice.map).then(r => r.json()), fetch(voice.sprite).then(r => r.arrayBuffer()).then(decode)]).then(([map, buf]) => ({ map, buf, bounds: new Map() })));
  return sprites.get(voice.key);
}
/* Where a clip really starts and ends in the decoded sprite: search a little either side (decoders add a start offset) */
function clipBounds(sp, id) {
  const { buf: sprite, map: spriteMap, bounds } = sp;
  if (bounds.has(id)) return bounds.get(id);
  const [t, d] = spriteMap.clips[id], sr = sprite.sampleRate, data = sprite.getChannelData(0);
  const lo = Math.max(0, Math.floor((t - 0.15) * sr)), hi = Math.min(data.length - 1, Math.ceil((t + d + 0.15) * sr));
  let s = lo, e = hi; const thr = 0.01;
  while (s < hi && Math.abs(data[s]) < thr) s++;
  while (e > s && Math.abs(data[e]) < thr) e--;
  const pad = Math.round(0.012 * sr), out = [Math.max(lo, s - pad) / sr, (Math.min(hi, e + pad) - Math.max(lo, s - pad)) / sr];
  bounds.set(id, out); return out;
}
async function playStitched(plan, voice) {
  const my = token, sp = await loadSprite(voice); if (my !== token) return;
  const { buf: sprite, map: spriteMap } = sp;
  const a = ctx(), gap = +$('#vpGap').value / 1000; let at = a.currentTime + 0.05;
  for (const p of plan) {
    if (p.pause) { at += p.pause === 'short' ? 0.12 : 0.26; continue; }
    if (!spriteMap.clips[p.clip]) { console.warn('missing clip', p.clip); continue; }
    const [s, len] = clipBounds(sp, p.clip);
    const src = a.createBufferSource(), g = a.createGain(); src.buffer = sprite;
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.95, at + 0.006); g.gain.setValueAtTime(0.95, at + len - 0.008); g.gain.linearRampToValueAtTime(0, at + len);
    src.connect(g).connect(a.destination); src.start(at, s, len); playingNodes.push(src);
    at += len + gap;
  }
}
/* Whole lines also play through Web Audio, as the real clip voice would (and Playwright WebKit has no media element playback) */
const wholeBufs = new Map();
async function playWhole(url) {
  const my = token, a = ctx();
  if (!wholeBufs.has(url)) wholeBufs.set(url, fetch(url).then(r => r.arrayBuffer()).then(decode));
  const buf = await wholeBufs.get(url); if (my !== token) return;
  const src = a.createBufferSource(); src.buffer = buf; src.connect(a.destination); src.start(); playingNodes.push(src);
}

function stopAll() {
  token++; stopToday();
  try { speechSynthesis.cancel(); } catch (e) {}
  playingNodes.forEach(n => { try { n.stop(); } catch (e) {} }); playingNodes = [];
  document.querySelectorAll('.vp-btns [aria-pressed=true], .vp-kids [aria-pressed=true]').forEach(b => b.setAttribute('aria-pressed', 'false'));
}
$('#vpStop').addEventListener('click', stopAll);
$('#vpGap').addEventListener('input', e => { $('#vpGapOut').textContent = e.target.value; });

/* ---------- The lines ---------- */
const kb = n => (n / 1024).toFixed(1) + ' KB';
const { bitrateKbps, voices: KV, items } = await fetch('items.json').then(r => r.json());
const pickV = () => KV.find(v => v.key === (document.querySelector('input[name=vpKV]:checked') || {}).value) || KV[0];
$('#vpKV').innerHTML = KV.map((v, i) => `<label><input type="radio" name="vpKV" value="${v.key}" ${i === KV.length - 1 ? 'checked' : ''}> ${esc(v.name)} <span class="vp-size">(${esc(v.spec)}, speed ${v.speed})</span></label>`).join('');
$('#vpItems').innerHTML = items.map(it => `<article class="vp-item" data-id="${it.id}">
  <header><h3>${esc(it.label)}</h3><span class="vp-tag">${esc(it.mode)}</span></header>
  <div class="vp-q">${it.html}</div>
  <p class="vp-said">Said as: ${esc(it.text)}</p>
  <p class="vp-plan" aria-label="Stitched clips">${it.plan.map(p => p.pause ? '<span>pause</span>' : `<span>${esc(p.clip.replace(/^[fnw]:/, ''))}</span>`).join('')}</p>
  <div class="vp-btns">
    <button type="button" class="md-btn md-btn--sm" data-v="current">1. Today</button>
    <button type="button" class="md-btn md-btn--sm" data-v="tuned">2. Tuned (A)</button>
    <button type="button" class="md-btn md-btn--sm" data-v="stitch">3. Stitched (B)</button>
    <button type="button" class="md-btn md-btn--sm" data-v="whole">4. Whole (B)</button>
  </div>
  <p class="vp-size">Whole clip: ${KV.map(v => `${esc(v.name)} ${it.whole[v.key].secs} s, ${kb(it.whole[v.key].bytes)}`).join('; ')} (${bitrateKbps} kbps AAC).</p>
</article>`).join('');
document.querySelectorAll('.vp-item').forEach(card => {
  const it = items.find(x => x.id === card.dataset.id);
  card.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => {
    stopAll(); b.setAttribute('aria-pressed', 'true');
    const explorer = it.mode === 'Explorer', v = b.dataset.v, kv = pickV();
    document.body.classList.toggle('mode-explorer', explorer); // voice.js reads this to pick the Explorer pitch and rate
    if (v === 'current') speakToday(it.html, { natural: false });
    else if (v === 'tuned') speakTuned(it.html, explorer);
    else if (v === 'stitch') playStitched(it.plan, kv).catch(e => console.warn(e));
    else playWhole(it.whole[kv.key].file).catch(e => console.warn(e));
  }));
});

/* ---------- Kid-voice candidates ---------- */
const kids = await fetch('kids.json').then(r => r.ok ? r.json() : null).catch(() => null);
if (kids) {
  $('#vpKids').innerHTML = `<div class="vp-kids-table" role="table" aria-label="Kid voice candidates">
    ${kids.candidates.map(c => `<div class="vp-kid" role="row"><div role="rowheader"><b>${esc(c.id)}</b> <span class="vp-size">${esc(c.spec)}, speed ${c.speed}, about ${c.f0} Hz</span><br><span class="vp-size">${esc(c.note)}</span></div>
      <div class="vp-kids">${kids.lines.map(l => `<button type="button" class="md-btn md-btn--sm" role="cell" data-k="${c.files[l.id]}" title="${esc(l.text)}">${esc(l.id)}</button>`).join('')}</div></div>`).join('')}</div>`;
  document.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => { stopAll(); b.setAttribute('aria-pressed', 'true'); playWhole(b.dataset.k).catch(e => console.warn(e)); }));
}
window.__voiceProto = { KV, items, kids, decodeWhole: url => fetch(url).then(r => r.arrayBuffer()).then(decode).then(x => x.duration),
  loadSprite: key => loadSprite(KV.find(v => v.key === key)).then(sp => ({ duration: sp.buf.duration, clips: Object.keys(sp.map.clips).length })) };
