/* The projector warm-up at /teachers/warm-up/ (openspec change teacher-warm-up). A class screen, not a game view: no
   Mode, no Player, nothing stored, no Firebase (design D1). Five screens (design D2): Today's trick (its name, Sutra,
   idea and worked example stepped with Next), Problem 1, 2 and 3 (shown alone in the largest type; Reveal shows the
   answer, Show the steps the Trick's own steps for those numbers, which build up and stay), and Practice at home (the
   Trick page's address). Each screen is a run of beats (design D8): on Today's trick a beat is one more step of the
   example; on a problem the beats are the answer, then each step; Next and the clicker keys play the next beat and at a
   screen's end move on, Back undoes one and at a screen's start goes back to the previous screen fully built.
   Keys (design D5): Right, Space and Page Down go on; Left and Page Up go back; R reveals, then shows the steps. No
   clock, no sound, nothing moves by itself: a step may fade in only after a press (data-moved, theme/warm-up.css).
   Every listener goes through on() from /js/life.js with one page-lifetime signal.
   Counted in fixed words (analytics spec): math/teachers/warmup/start/<trick> on the first Next of a page load,
   math/teachers/warmup/done/<trick> on reaching Practice at home, each once. Never anything about anyone.
   Published at /tricks/warm-up.js with its types taken out (build.py), which also writes the page's import map. */
import { TRICKS, type Trick, type Vals } from '/js/vedic.js';
import { on } from '/js/life.js';
import { PAGES, TRICK_IDS } from '/tricks/pages.js';
import { PROBLEMS, problemText, answerText, type WarmUp } from '/tricks/warm-up-problems.js';
import { pickTrick } from '/tricks/warm-up-pick.js';
import { stepBoard, type StepBoard } from '/tricks/step-board.js';

const SITE = 'learnvedicmath.com';
const signal = new AbortController().signal; /* the page's lifetime */
/** A problem's numbers as a Trick takes them (Vals is typed as four, a Trick reads the ones it has) */
const V = (vals: readonly number[]): Vals => [vals[0] ?? 0, vals[1] ?? 0, vals[2] ?? 0, vals[3] ?? 0];

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`warm-up: #${id} is missing from the page`);
  return el as T;
}

const stage = byId('wuStage'), at = byId('wuAt'), pick = byId<HTMLSelectElement>('wuPick'), full = byId<HTMLButtonElement>('wuFull');
const screens = [byId('wuIntro'), byId('wuProblem'), byId('wuProblem'), byId('wuProblem'), byId('wuHome')];
const title = byId('wuTitle'), sutraName = byId('wuSutraName'), meaning = byId('wuMeaning'), idea = byId('wuIdea'), exQ = byId('wuExQ'), exBoardEl = byId('wuExBoard');
const q = byId('wuQ'), answer = byId('wuA'), boardEl = byId('wuBoard'), home = byId<HTMLAnchorElement>('wuUrl');
const back = byId<HTMLButtonElement>('wuBack'), reveal = byId<HTMLButtonElement>('wuReveal'), next = byId<HTMLButtonElement>('wuNext');

const track = (path: string, words: string) => { if (typeof window.siteTrack === 'function') window.siteTrack(path, words); };

let trick: Trick, warm: WarmUp, exBoard: StepBoard, boards: StepBoard[] = [];
let screen = 0, beat = 0, started = false, done = false;

const HOME = screens.length - 1;
const problemAt = (s: number) => (s >= 1 && s < HOME ? s - 1 : -1);
const lastBeat = (s: number) => {
  const k = problemAt(s);
  if (s === 0) return exBoard.count;
  if (k >= 0) return 1 + (boards[k]?.count ?? 0);
  return 0;
};
const label = (s: number) => (s === 0 ? "Today's trick" : s === HOME ? 'Practice at home' : `Problem ${s} of ${HOME - 1}`);

/** One update of the polite live region: where the class is and, after a press, what just appeared */
function say(words?: string) {
  const parts: (string | HTMLElement)[] = [label(screen)];
  if (words) {
    const sr = document.createElement('span');
    sr.className = 'md-sr-only';
    sr.innerHTML = ': ' + words;
    parts.push(sr);
  }
  at.replaceChildren(...parts);
}

function render(pressed = false) {
  const k = problemAt(screen);
  const current = screens[screen];
  for (const el of new Set(screens)) el.hidden = el !== current;
  stage.dataset.screen = screen === 0 ? 'trick' : screen === HOME ? 'home' : 'problem';
  let words: string | undefined;
  if (screen === 0) {
    exBoard.show(beat);
    if (pressed && beat > 0) words = trick.steps(V(warm.example))[beat - 1]?.say;
  } else if (k >= 0) {
    const vals = warm.problems[k] ?? [];
    const board = boards[k];
    q.textContent = problemText(trick.id, vals);
    answer.textContent = answerText(trick.id, vals, trick.answer(V(vals)));
    answer.hidden = beat < 1;
    boardEl.hidden = beat < 2;
    board?.show(Math.max(0, beat - 1));
    if (pressed && beat === 1) words = `the answer is ${answer.textContent}`;
    if (pressed && beat >= 2) words = trick.steps(V(vals))[beat - 2]?.say;
  }
  back.disabled = screen === 0 && beat === 0;
  next.disabled = screen === HOME;
  reveal.hidden = !(k >= 0 && beat < 2);
  reveal.textContent = beat === 0 ? 'Reveal' : 'Show the steps';
  say(words);
  /* After a press, what just appeared is brought into view when a long step board has scrolled (an instant scroll:
     nothing here sets scroll-behavior, so reduced motion is respected); never on its own */
  if (pressed) stage.querySelector('.sb-step[aria-current="step"]')?.scrollIntoView({ block: 'nearest' });
}

/** A press: the newest step may fade in from now on (theme/warm-up.css; never under reduced motion or Pause motion) */
const moved = () => { stage.dataset.moved = ''; };

function goOn() {
  if (screen === HOME) return;
  if (beat < lastBeat(screen)) beat++; else { screen++; beat = 0; }
  moved();
  render(true);
  if (!started) { started = true; track(`math/teachers/warmup/start/${trick.id}`, 'Vedic Math: warm-up started'); }
  if (screen === HOME && !done) { done = true; track(`math/teachers/warmup/done/${trick.id}`, 'Vedic Math: warm-up finished'); }
}

function goBack() {
  if (beat > 0) beat--;
  else if (screen > 0) { screen--; beat = lastBeat(screen); }
  else return;
  moved();
  render(true);
}

/** R: the answer, then the steps one by one; never leaves the problem */
function revealMore() {
  if (problemAt(screen) < 0 || beat >= lastBeat(screen)) return;
  beat++;
  moved();
  render(true);
}

function load(id: string) {
  const t = TRICKS.find(x => x.id === id), w = PROBLEMS[id], page = PAGES.find(p => p.id === id);
  if (!t || !w || !page) throw new Error(`warm-up: no Trick ${id}`);
  trick = t; warm = w;
  title.textContent = t.title;
  sutraName.textContent = t.sutra;
  meaning.textContent = t.meaning;
  idea.textContent = t.idea;
  exQ.textContent = problemText(id, w.example);
  exBoard = stepBoard(exBoardEl, t.steps(V(w.example)));
  boards = w.problems.map(vals => stepBoard(boardEl, t.steps(V(vals))));
  home.href = `/tricks/${page.slug}/`;
  home.textContent = `${SITE}/tricks/${page.slug}/`;
  pick.value = id;
  screen = 0; beat = 0;
  delete stage.dataset.moved;
  render();
}

/* Pick a trick: the 15 by name, in the order of the Trick page list */
pick.replaceChildren(...TRICK_IDS.map(id => {
  const o = document.createElement('option');
  o.value = id;
  o.textContent = TRICKS.find(t => t.id === id)?.title ?? id;
  return o;
}));
on(pick, 'change', () => { load(pick.value); history.replaceState(null, '', `?trick=${pick.value}`); }, signal);

on(next, 'click', goOn, signal);
on(back, 'click', goBack, signal);
on(reveal, 'click', revealMore, signal);
on<KeyboardEvent>(document, 'keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const t = e.target;
  if (t instanceof HTMLElement && (t instanceof HTMLSelectElement || t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable)) return;
  if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); goOn(); }
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goBack(); }
  else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); revealMore(); }
}, signal);

/* Full screen (the Fullscreen API), only where the browser offers it */
if (document.fullscreenEnabled) {
  full.hidden = false;
  const name = () => { full.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'; };
  on(full, 'click', () => {
    const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    p.catch(() => { /* refused by the browser: the page works the same without it */ });
  }, signal);
  on(document, 'fullscreenchange', name, signal);
  name();
}

load(pickTrick(location.search, new Date(), TRICK_IDS));
