/* The wait indicator for held input (openspec change muse-review-polish, feedback-wait spec, design D1).
   A round that holds input for feedback or a teaching moment calls hold(el, ms, then, opts) where it used
   later(then, ms, signal):
   - for the first BAR_AFTER (1.2 s) nothing shows: a short pause reads as a beat, not a freeze;
   - after that a thin bar is drawn right under el (the held keypad or choices) and fills until the hold ends, and
     the live region hears "Next question in a moment" once per hold, never per tick;
   - a skippable hold of NEXT_FROM (2 s) or more also offers Next, which Enter presses too; either ends the hold at
     once and then(true) runs. Timed rounds leave skippable off (the default), so nothing skips the race's own pacing;
   - under reduced motion, Pause motion or Calm the bar holds still and the time left shows as text instead.
   Returns { stop, end }: stop() takes the indicator away without then() running (the caller took over, as the Star
   replay does when its last step shows its own button); end() is what Next does. Everything runs under a child of
   signal (js/life.js), so leaving the view removes it. The app (js/fx.js) and the experiences (js/play/kit.js) both
   re-export this one module, so a Star and Discovery Locks share one bar. */
import { on, later, every, child, onAbort } from './life.js';
import { BAR_AFTER, holdPlan, holdLeftText, HOLD_SAID } from '../shared/src/hold.ts'; /* the thresholds and words, with their tests */
export { BAR_AFTER, NEXT_FROM, holdPlan } from '../shared/src/hold.ts';

/* No motion: the device setting, Pause motion (html.motion-paused) or Calm (vm.calm), the app's one rule (fx.noMotion) */
export function holdStill() {
  try { if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return true; } catch (e) {}
  try { if (document.documentElement.classList.contains('motion-paused')) return true; } catch (e) {}
  try { return localStorage.getItem('vm.calm') === '1'; } catch (e) { return false; }
}
const inField = t => !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '')));
/* One polite announcement per hold (#vmLive, the app's live region; cleared first so a repeat is read again) */
const live = text => { const el = document.getElementById('vmLive'); if (el) { el.textContent = ''; el.textContent = text; } };

export function hold(el, ms, then, { skippable = false, signal, label = 'Next' } = {}) {
  const life = child(signal), ls = life.signal, plan = holdPlan(ms, { skippable });
  let box = null, done = false;
  const stop = () => { if (done) return; done = true; life.abort(); };
  const end = early => { if (done) return; stop(); then(early); };
  onAbort(ls, () => { if (box) { box.remove(); box = null; } });
  later(() => end(false), ms, ls);
  if (!plan.bar || !el) return { stop, end: () => end(true) };
  later(() => {
    const still = holdStill(), left = ms - BAR_AFTER;
    box = document.createElement('div'); box.className = 'fx-hold' + (still ? ' still' : '');
    box.innerHTML = `<span class="fx-hold-bar" aria-hidden="true"><i></i></span><span class="fx-hold-left" aria-hidden="true"></span>${plan.next ? `<button type="button" class="md-btn md-btn--sm md-btn--primary fx-hold-next">${label}</button>` : ''}`;
    el.after(box);
    const bar = box.querySelector('.fx-hold-bar i'), txt = box.querySelector('.fx-hold-left');
    if (still) {
      /* The time left as text, once a second; no movement */
      let ms = left; const show = () => { txt.textContent = holdLeftText(ms); };
      show(); every(() => { ms -= 1000; show(); }, 1000, ls);
    } else if (bar.animate) bar.animate([{ width: '0%' }, { width: '100%' }], { duration: Math.max(1, left), easing: 'linear', fill: 'forwards' });
    else bar.style.width = '100%';
    live(HOLD_SAID);
    const btn = box.querySelector('.fx-hold-next');
    if (btn) {
      on(btn, 'click', () => end(true), ls);
      /* Enter anywhere but in a field or on a control of its own (a focused button presses itself) */
      on(document, 'keydown', e => {
        if (e.key !== 'Enter' || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || e.defaultPrevented) return;
        const t = e.target; if (inField(t) || (t && t.closest && t.closest('button, a'))) return;
        e.preventDefault(); end(true);
      }, ls);
    }
  }, BAR_AFTER, ls);
  return { stop, end: () => end(true) };
}
