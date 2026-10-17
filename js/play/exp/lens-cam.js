/* Math Lens camera and digit reader. The camera is opt-in; one frame is frozen on a canvas on this device,
   cleaned up (grayscale, contrast, threshold) and read for digits right here. The picture is never stored
   or sent anywhere. The reader (Tesseract.js) loads on first use from cdn.jsdelivr.net at a pinned
   version: only its program and model files download; your image stays on the device. */
import { say, sfx, track, esc } from '../kit.js';
import { on, onAbort, child } from '../life.js';

const TV = '5.1.1';
const TESS = {
  lib: `https://cdn.jsdelivr.net/npm/tesseract.js@${TV}/dist/tesseract.esm.min.js`,
  workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@${TV}/dist/worker.min.js`,
  corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',
  langPath: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int'
};
const PRIVACY = '<p class="ln-privacy"><span class="ln-dot" aria-hidden="true"></span><b>Nothing leaves your phone.</b> The picture is looked at here, on this device, and then forgotten. It is never saved or uploaded.</p>';

/* ---------- Image clean-up (pure on ImageData-like objects, so it can be tested) ---------- */
/* Grayscale, stretch contrast between the 2nd and 98th percentile, then Otsu threshold. Dark digits on a
   light background come out black on white; light digits on dark get flipped so the reader sees the same. */
export function clean(img) {
  const { data, width, height } = img, n = width * height, g = new Uint8ClampedArray(n), hist = new Array(256).fill(0);
  for (let i = 0; i < n; i++) { const v = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]); g[i] = v; hist[v]++; }
  let lo = 0, hi = 255, acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.02) { lo = v; break; } }
  acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * 0.02) { hi = v; break; } }
  const span = Math.max(1, hi - lo), h2 = new Array(256).fill(0);
  for (let i = 0; i < n; i++) { const v = Math.max(0, Math.min(255, Math.round(((g[i] - lo) * 255) / span))); g[i] = v; h2[v]++; }
  /* Otsu */
  let sum = 0; for (let v = 0; v < 256; v++) sum += v * h2[v];
  let sumB = 0, wB = 0, best = 0, th = 128;
  for (let v = 0; v < 256; v++) {
    wB += h2[v]; if (!wB) continue; const wF = n - wB; if (!wF) break;
    sumB += v * h2[v]; const mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; th = v; }
  }
  let dark = 0; for (let i = 0; i < n; i++) if (g[i] <= th) dark++;
  const flip = dark > n / 2;
  for (let i = 0; i < n; i++) { const ink = flip ? g[i] > th : g[i] <= th, v = ink ? 0 : 255; data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v; data[i * 4 + 3] = 255; }
  return { threshold: th, flipped: flip };
}

/* The reader loads from cdn.jsdelivr.net. The published page's Content-Security-Policy (build.py) does not list that
   host, so there the camera could be turned on but nothing could ever be read: the camera is then not offered at all
   (no permission prompt for nothing). Allowing it is an owner decision recorded in the play-experiences change. */
export function readerAllowed() {
  const m = typeof document !== 'undefined' && document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  return !m || /(^|[\s;])script-src[^;]*https:\/\/cdn\.jsdelivr\.net/.test(m.getAttribute('content') || '');
}

let reader = null; /* one reader per page load; terminated when the view closes */
async function getReader(onProgress) {
  if (reader) return reader;
  const mod = await import(TESS.lib);
  const T = mod.default || mod;
  const w = await T.createWorker('eng', 1, { workerPath: TESS.workerPath, corePath: TESS.corePath, langPath: TESS.langPath, logger: m => onProgress && onProgress(m) });
  await w.setParameters({ tessedit_char_whitelist: '0123456789:.$' });
  reader = w; return w;
}

/* Renders the camera flow into host. Calls onDigits(text, kind) with what it read (text may be empty). */
export function camera(host, { signal, kindChips, onDigits, onType }) {
  const ctl = child(signal), sig = ctl.signal;
  let stream = null, kind = 'plate', box = null;
  const stopStream = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } };
  onAbort(sig, stopStream);
  onAbort(signal, () => { if (reader) { const r = reader; reader = null; r.terminate().catch(() => {}); } });
  /* The camera is on only while the Player is looking at it: hiding the tab (or the phone locking) turns it off,
     and the Player turns it on again with one tap. Nothing is kept from the live view. */
  on(document, 'visibilitychange', () => {
    if (!document.hidden || !stream) return;
    stopStream(); intro('The camera turned off while you were away. Turn it on again when you are ready.');
  }, sig);

  const intro = (note = '') => {
    host.innerHTML = `<div class="ln-cam-intro">
      ${note ? `<p class="ln-err" role="status">${esc(note)}</p>` : ''}
      <p class="ln-q">Use the camera?</p>
      <p>Math Lens needs to see the digits for a moment. You point, tap <b>Capture</b>, and it reads the digits from that one frozen frame.</p>
      ${PRIVACY}
      <div class="px-row"><button type="button" class="md-btn md-btn--primary ln-on">Turn on the camera</button><button type="button" class="md-btn ln-typeinstead">Type the digits instead</button></div>
    </div>`;
  };
  const live = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { fail('This browser cannot use a camera here. You can type the digits instead.'); return; }
    host.innerHTML = `<div class="ln-cam" aria-label="Camera view">
        <video class="ln-video" playsinline muted autoplay aria-hidden="true"></video>
        <div class="ln-aim" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <span class="ln-badge"><span class="ln-dot" aria-hidden="true"></span>On this device only</span>
      </div>
      <p class="ln-tip">Fill the box with the digits. Hold steady, good light helps.</p>
      <div class="px-row ln-camrow"><button type="button" class="md-btn md-btn--primary ln-snap" disabled>Capture</button><button type="button" class="md-btn ln-typeinstead">Type instead</button></div>`;
    const v = host.querySelector('video');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (sig.aborted || !host.contains(v)) { stopStream(); return; }
      /* The browser or the Player can end the camera from outside (permission revoked, camera unplugged) */
      stream.getVideoTracks().forEach(tr => on(tr, 'ended', () => { if (stream) { stopStream(); fail('The camera stopped. You can type the digits instead.'); } }, sig));
      v.srcObject = stream; await v.play().catch(() => {});
      const snap = host.querySelector('.ln-snap'); snap.disabled = false; snap.focus();
      say('Camera on. Point at some digits and press Capture.');
      track('lens/camera', 'Camera on');
    } catch (e) {
      stopStream();
      fail(e && e.name === 'NotAllowedError' ? 'The camera was not allowed. That is fine: type the digits instead, or allow the camera in your browser settings.' : 'No camera could be opened. Type the digits instead.');
    }
  };
  const fail = msg => {
    host.innerHTML = `<p class="ln-err" role="alert">${esc(msg)}</p><div class="px-row"><button type="button" class="md-btn md-btn--primary ln-typeinstead">Type the digits</button><button type="button" class="md-btn ln-on">Try the camera again</button></div>`;
    say(msg);
  };

  /* Freeze one frame, stop the camera, let the player drag a box around the digits */
  const capture = () => {
    const v = host.querySelector('video'); if (!v || !v.videoWidth) return;
    const cv = document.createElement('canvas'); cv.width = v.videoWidth; cv.height = v.videoHeight;
    cv.getContext('2d').drawImage(v, 0, 0);
    stopStream(); v.srcObject = null;
    box = { x: 0.1, y: 0.3, w: 0.8, h: 0.4 };
    host.innerHTML = `<div class="ln-cam ln-cam--still"><div class="ln-still" role="group" aria-label="Captured picture. Drag a box around the digits.">
        <div class="ln-box" aria-hidden="true"></div></div>
        <span class="ln-badge"><span class="ln-dot" aria-hidden="true"></span>Frozen on this device</span>
      </div>
      <p class="ln-tip">Drag a box around the digits (or leave it as it is).</p>
      <p class="ln-q">What is it?</p>${kindChips(kind, 'ckind')}
      <p class="ln-dl px-note">${reader ? '' : 'The first read downloads a digit-reading model once (about 6 MB) from cdn.jsdelivr.net. Only the model comes down. Your picture is never sent.'}</p>
      <div class="ln-prog" hidden><div class="ln-bar"><i></i></div><span class="ln-progt" aria-live="off">Getting ready</span></div>
      <div class="px-row ln-camrow"><button type="button" class="md-btn md-btn--primary ln-read">Read the digits</button><button type="button" class="md-btn ln-again">Retake</button><button type="button" class="md-btn ln-typeinstead">Type instead</button></div>`;
    const still = host.querySelector('.ln-still'); cv.className = 'ln-canvas'; cv.setAttribute('aria-hidden', 'true'); still.prepend(cv);
    still.style.aspectRatio = `${cv.width} / ${cv.height}`;
    still._cv = cv; placeBox();
    sfx('tap'); say('Captured. The camera is off. Drag a box around the digits, then press Read the digits.');
    host.querySelector('.ln-read').focus();
    /* drag a box */
    let start = null, pid = null;
    const pos = e => { const r = still.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
    on(still, 'pointerdown', e => { e.preventDefault(); pid = e.pointerId; try { still.setPointerCapture(pid); } catch (er) {} start = pos(e); }, sig);
    on(still, 'pointermove', e => {
      if (!start || e.pointerId !== pid) return; const [x, y] = pos(e);
      const b = { x: Math.min(x, start[0]), y: Math.min(y, start[1]), w: Math.abs(x - start[0]), h: Math.abs(y - start[1]) };
      if (b.w > 0.03 && b.h > 0.03) { box = b; placeBox(); }
    }, sig);
    const end = () => { start = null; };
    on(still, 'pointerup', end, sig); on(still, 'pointercancel', end, sig);
  };
  const placeBox = () => { const el = host.querySelector('.ln-box'); if (el) el.style.cssText = `left:${box.x * 100}%;top:${box.y * 100}%;width:${box.w * 100}%;height:${box.h * 100}%`; };

  const read = async () => {
    const still = host.querySelector('.ln-still'); if (!still) return;
    const cv = still._cv, sx = Math.round(box.x * cv.width), sy = Math.round(box.y * cv.height), sw = Math.max(8, Math.round(box.w * cv.width)), sh = Math.max(8, Math.round(box.h * cv.height));
    const scale = Math.min(3, Math.max(1, 900 / sw));
    const out = document.createElement('canvas'); out.width = Math.round(sw * scale); out.height = Math.round(sh * scale);
    const g = out.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high'; g.drawImage(cv, sx, sy, sw, sh, 0, 0, out.width, out.height);
    const img = g.getImageData(0, 0, out.width, out.height); clean(img); g.putImageData(img, 0, 0);
    const prog = host.querySelector('.ln-prog'), bar = prog.querySelector('i'), pt = prog.querySelector('.ln-progt');
    prog.hidden = false; host.querySelectorAll('.ln-camrow button').forEach(b => { b.disabled = true; });
    const progress = m => { if (sig.aborted) return; const p = Math.round((m.progress || 0) * 100); bar.style.width = p + '%'; pt.textContent = /recogniz/.test(m.status) ? `Reading ${p}%` : /load|initializ/.test(m.status) ? `Getting the reader ready ${p}%` : 'Working'; };
    let text = '', failed = false;
    try {
      pt.textContent = reader ? 'Reading' : 'Downloading the reader (one time)';
      say(pt.textContent);
      const w = await getReader(progress);
      if (sig.aborted) return;
      await w.setParameters({ tessedit_pageseg_mode: kind === 'receipt' ? '6' : '7' });
      const res = await w.recognize(out);
      text = (res && res.data && res.data.text || '').replace(/\n+/g, ' ').replace(/[^\d:.$ ]/g, '').replace(/\s+/g, ' ').trim();
    } catch (e) {
      if (sig.aborted) return;
      console.warn('Math Lens reader', e);
      text = ''; failed = true;
    }
    if (sig.aborted) return;
    ctl.abort();
    onDigits(text, kind, failed);
  };

  on(host, 'click', e => {
    if (e.target.closest('.ln-on')) { live(); return; }
    if (e.target.closest('.ln-typeinstead')) { ctl.abort(); onType(); return; }
    if (e.target.closest('.ln-snap')) { capture(); return; }
    if (e.target.closest('.ln-again')) { live(); return; }
    if (e.target.closest('.ln-read')) { read(); return; }
    const k = e.target.closest('[data-ckind]');
    if (k) { kind = k.dataset.ckind; host.querySelectorAll('[data-ckind]').forEach(b => b.setAttribute('aria-checked', String(b === k))); }
  }, sig);
  intro();
  host.querySelector('.ln-on').focus();
  return { stop: () => ctl.abort() };
}
