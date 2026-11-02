/* The Trick page calculator (openspec change trick-pages, design D4, D8): "Try it with your numbers" on each
   /tricks/<slug>/ page. Published by build.py at /tricks/calculator.js with its types taken out (the way sw.js is), and
   loaded as a module, so it imports the game's own catalog and lifecycle helpers by their published URLs.

   It reads the page's data-trick, runs the Trick's valid() on the typed numbers (and its fields' limits), and steps
   through steps() with Show steps, New numbers, Back, Next and Show all, the way the game's animator does. Earlier
   steps stay on screen, nothing moves by itself (a step may fade in after a press, never under reduced motion, Pause
   motion or Calm: theme/tricks.css reads data-moved), and the step line is a polite live region that says the step's
   words after a press while focus stays on the button pressed. Nothing is stored. Two events of fixed words:
   math/tricks/calc/<trick> the first time Show steps draws steps on a page load, math/tricks/practice/<trick> on
   Practice this trick; never the typed numbers.

   Imports: the catalog is shared/src/vedic.ts, which build.py publishes at /js/ts/shared/src/vedic.js and points this
   import at (react-typescript task 3.1, the same way js/ modules reach it); js/life.js is a plain module, imported by
   its published URL (types/js/life.d.ts). The page's import map pins both to their ?v= URLs. */
import { TRICKS } from '../../shared/src/vedic.ts';
import type { Trick, TrickStep, Vals } from '../../shared/src/vedic.ts';
import { on } from '/js/life.js';

const root = document.getElementById('tkCalc');
const trick = root ? TRICKS.find(t => t.id === root.dataset.trick) : undefined;
if (root && trick) mount(root, trick);

function mount(calc: HTMLElement, t: Trick): void {
  const signal = new AbortController().signal; /* the page's lifetime */
  const el = <T extends HTMLElement>(id: string): T => {
    const found = calc.querySelector<T>('#' + id);
    if (!found) throw new Error(`calculator: #${id} is missing from the page`);
    return found;
  };
  const form = el<HTMLFormElement>('tkForm'), ins = [...form.querySelectorAll<HTMLInputElement>('input[data-i]')];
  const err = el('tkErr'), board = el('tkBoard'), nav = el('tkNav'), at = el('tkAt');
  const back = el<HTMLButtonElement>('tkBack'), next = el<HTMLButtonElement>('tkNext'), all = el<HTMLButtonElement>('tkAll');
  const rand = el<HTMLButtonElement>('tkRand');
  const practice = document.getElementById('tkPractice');

  let steps: TrickStep[] = [], i = 0, shownAll = false, counted = false;

  /* js/analytics.js is a deferred script after this module; until it has run, an event waits for the page's load */
  const track = (path: string, title: string): void => {
    const send = () => { if (typeof window.siteTrack === 'function') window.siteTrack(path, title); };
    if (typeof window.siteTrack === 'function' || document.readyState === 'complete') send();
    else on(window, 'load', send, signal, { once: true });
  };

  const disabled = (b: HTMLButtonElement, off: boolean) => b.setAttribute('aria-disabled', String(off));
  const isOff = (b: HTMLButtonElement) => b.getAttribute('aria-disabled') === 'true';

  /* Draws steps 0 to i (or every step), the last one current. One update of the atomic live region: the visible
     count and, after a press, the current step's words for screen readers. */
  const show = (said: boolean): void => {
    const upto = shownAll ? steps.length : i + 1;
    board.innerHTML = steps.slice(0, upto).map((s, k) => `<div class="tk-step${k === upto - 1 ? ' cur' : ''}"><div class="tk-show">${s.show}</div><p>${s.say}</p></div>`).join('');
    disabled(back, i === 0 && !shownAll);
    disabled(next, shownAll || i === steps.length - 1);
    disabled(all, shownAll || steps.length < 2);
    const words = board.querySelector('.tk-step.cur p')?.textContent ?? '';
    at.textContent = `Step ${upto} of ${steps.length}`;
    if (said && words) {
      const sr = document.createElement('span');
      sr.className = 'md-sr-only';
      sr.textContent = `: ${words}`;
      at.append(sr);
    }
  };

  const clear = (message: string): void => {
    err.textContent = message;
    steps = [];
    board.replaceChildren();
    nav.hidden = true;
    at.textContent = '';
  };

  /* The typed numbers as the catalog's four-slot tuple (a Trick reads the slots it has inputs for) */
  const tuple = (v: number[]): Vals => [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0, v[3] ?? 0];

  /* The typed numbers through the Trick's limits and its valid(); then its steps, from the first */
  const run = (user: boolean): void => {
    const typed = ins.map(x => Number(x.value));
    if (ins.some(x => x.value.trim() === '') || typed.some(v => !Number.isFinite(v))) { clear('Fill in every number.'); return; }
    const vals = tuple(typed);
    const limit = t.inputs.find((f, k) => (vals[k] ?? 0) < f.min || (vals[k] ?? 0) > f.max);
    const bad = limit ? `Pick a number from ${limit.min} to ${limit.max}.` : t.valid(vals);
    if (bad) { clear(bad); return; }
    err.textContent = '';
    steps = t.steps(vals);
    i = 0;
    shownAll = false;
    nav.hidden = false;
    show(user);
    if (user && !counted) { counted = true; track(`math/tricks/calc/${t.id}`, `Trick page: ${t.title}, steps shown`); }
  };

  on(form, 'submit', (e: Event) => { e.preventDefault(); calc.dataset.moved = ''; run(true); }, signal);
  on(rand, 'click', () => {
    let v: number[];
    do { v = t.random(); } while (t.valid(tuple(v)) || v.some((n, k) => n < (t.inputs[k]?.min ?? -Infinity) || n > (t.inputs[k]?.max ?? Infinity)));
    ins.forEach((x, k) => { x.value = String(v[k] ?? ''); });
    calc.dataset.moved = '';
    run(false);
  }, signal);
  on(back, 'click', () => { if (isOff(back)) return; calc.dataset.moved = ''; if (shownAll) { shownAll = false; i = steps.length - 1; } i = Math.max(0, i - 1); show(true); }, signal);
  on(next, 'click', () => { if (isOff(next)) return; calc.dataset.moved = ''; i = Math.min(steps.length - 1, i + 1); show(true); }, signal);
  on(all, 'click', () => { if (isOff(all)) return; calc.dataset.moved = ''; i = steps.length - 1; shownAll = true; show(true); }, signal);
  if (practice) on(practice, 'click', () => track(`math/tricks/practice/${t.id}`, `Trick page: ${t.title}, practice`), signal);

  calc.dataset.ready = '';
}
