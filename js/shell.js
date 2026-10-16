/* The play shell (openspec game-shell-and-calm): every timed round and every Star round plays in a full-screen,
   fixed layout over the page, so the question, the entry and the keypad are always on screen and nothing scrolls.
   The route does not change: Back, deep links, analytics and the view lifecycle stay as they are.

   openShell(title, { signal, onExit, exit, exitId, focusBack }) adds the shell to #view and returns
   { el, area, header, close, setExit }:
   - area: where the round draws itself, exactly as it drew into its card before;
   - the header holds the Calm switch, the A and A+ text size and the exit button (exit: its label, Stop or Back;
     exitId: its id; onExit: what it does, close() when not given);
   - everything else on the page is inert while the shell is open;
   - close(focus = true) removes it, clears inert and focuses focusBack() (the button that started the round).
   Every listener runs on a child of signal, and the shell closes itself when signal aborts (the view is left). */
import * as fx from './fx.js';
import { on, onAbort, child } from './life.js';

let current = null;

/* Touch screens (phones, tablets and touch Chromebooks): the hidden answer inputs never open the system keyboard
   over the on-screen keypad. A physical keyboard still types through the round's own keydown listener. */
export const coarse = () => { try { return matchMedia('(any-pointer: coarse)').matches; } catch (e) { return false; } };
export function keypadOnly(input) {
  if (!input || !coarse()) return;
  input.setAttribute('inputmode', 'none'); input.readOnly = true;
}

const sizeBtn = (v, label, aria) => `<button type="button" class="play-size-b" data-size="${v}" aria-pressed="${fx.textSize() === v}"${aria ? ` aria-label="${aria}"` : ''}>${label}</button>`;

export function openShell(title, { signal, onExit = null, exit = 'Stop', exitId = 'playExit', focusBack = null } = {}) {
  if (current) current.close(false);
  const view = document.getElementById('view') || document.body, life = child(signal), ls = life.signal;
  const el = document.createElement('section');
  el.className = 'play-shell'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', String(title)); el.tabIndex = -1;
  el.innerHTML = `<div class="play-head"><p class="play-title"></p>
    <button type="button" class="md-switch play-calm" role="switch" aria-checked="${fx.calmOn()}"><span>Calm</span><span class="md-track" aria-hidden="true"><span class="md-knob"></span></span></button>
    <div class="play-size" role="group" aria-label="Text size">${sizeBtn('a', 'A', 'Normal text')}${sizeBtn('a+', 'A+', 'Larger text')}</div>
    <button type="button" class="md-btn md-btn--sm play-exit"></button></div><div class="play-area"></div>`;
  el.querySelector('.play-title').textContent = String(title);
  const header = el.querySelector('.play-head'), area = el.querySelector('.play-area'), exitBtn = el.querySelector('.play-exit');
  exitBtn.id = exitId; exitBtn.textContent = exit;

  /* Everything but the shell is inert: the rest of the view, the site header, the footer and the skip link */
  const others = [...view.children, ...document.querySelectorAll('body > header, body > footer, body > .skip')].filter(n => n !== el && !n.inert);
  others.forEach(n => (n.inert = true));
  const y = window.scrollY || 0, root = document.documentElement;
  root.classList.add('play-open');
  view.append(el);
  try { window.scrollTo(0, 0); } catch (e) {}

  let closed = false, exitFn = onExit;
  const shell = {
    el, area, header,
    close(focus = true) {
      if (closed) return; closed = true;
      if (current === shell) current = null;
      life.abort(); el.remove(); others.forEach(n => (n.inert = false));
      root.classList.remove('play-open');
      if (!focus) return;
      try { window.scrollTo(0, y); } catch (e) {}
      const f = typeof focusBack === 'function' ? focusBack() : focusBack;
      if (f && f.isConnected) f.focus();
    },
    /* The exit button's label and action: Stop during a round, Back on its result */
    setExit(label, fn = exitFn) { exitBtn.textContent = label; exitFn = fn; }
  };
  current = shell;
  on(exitBtn, 'click', () => (exitFn ? exitFn() : shell.close()), ls);
  const calmBtn = el.querySelector('.play-calm');
  on(calmBtn, 'click', () => fx.setCalm(!fx.calmOn()), ls);
  on(document, 'vmcalm', () => calmBtn.setAttribute('aria-checked', String(fx.calmOn())), ls);
  el.querySelectorAll('[data-size]').forEach(b => on(b, 'click', () => fx.setTextSize(b.dataset.size), ls));
  on(document, 'vmtext', () => el.querySelectorAll('[data-size]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === fx.textSize()))), ls);
  onAbort(signal, () => shell.close(false));
  el.focus({ preventScroll: true });
  return shell;
}
