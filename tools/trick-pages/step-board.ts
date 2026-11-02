/* The step board (openspec change teacher-warm-up, design D7; trick-pages design D4): a Trick's steps() for some
   numbers, drawn into an element the way the game's animator draws them (js/app.js mountAnimator). The steps build up
   and stay: show(n) draws steps 1 to n, the last one marked aria-current="step", so the working the class has seen
   stays on the screen (the working-memory point). It draws only; the caller wires Back, Next and keys, and may set
   data-moved on an ancestor after a press so the newest step fades in (off under reduced motion and Pause motion in the
   stylesheet). The step text comes from js/vedic.js, numbers only, so it is set as the game sets it. Published at
   /tricks/step-board.js with its types taken out (build.py), shared by the warm-up and the Trick page calculator. */
export type Step = { say: string; show: string };

export type StepBoard = {
  /** How many steps there are */
  readonly count: number;
  /** How many are on the board now */
  readonly shown: number;
  /** Draws steps 1 to n (0 clears the board); n is kept inside 0 to count */
  show(n: number): void;
};

export function stepBoard(root: HTMLElement, steps: readonly Step[]): StepBoard {
  let shown = 0;
  const show = (n: number) => {
    shown = Math.max(0, Math.min(steps.length, n));
    const items = steps.slice(0, shown).map((s, k) => {
      const item = document.createElement('div');
      item.className = 'sb-step';
      item.dataset.s = String(k + 1);
      if (k === shown - 1) item.setAttribute('aria-current', 'step');
      const board = document.createElement('div');
      board.className = 'sb-show';
      board.innerHTML = s.show;
      const say = document.createElement('p');
      say.className = 'sb-say';
      say.innerHTML = s.say;
      item.append(board, say);
      return item;
    });
    root.replaceChildren(...items);
    root.dataset.shown = String(shown);
  };
  show(0);
  return { get count() { return steps.length; }, get shown() { return shown; }, show };
}
