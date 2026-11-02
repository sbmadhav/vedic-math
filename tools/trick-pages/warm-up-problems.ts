/* The warm-up's problems (openspec change teacher-warm-up, design D3): for each of the 15 Tricks a worked example for
   the first screen and three fixed class problems, each larger or with more digits than the one before, so a teacher
   can prepare and two classes on the same day get the same warm-up. Every problem passes its Trick's valid() in
   js/vedic.js (test/warm-up.test.mjs runs them all). The question and answer words are made here, numbers only, so
   they are set as the Trick sets them. Published at /tricks/warm-up-problems.js with its types taken out (build.py).
   No DOM, no imports: a test loads it in Node. */
export type WarmUp = { example: number[]; problems: [number[], number[], number[]] };

/** The 15 Tricks in the order of the Trick page table, with the slug of each page at /tricks/<slug>/. tools/trick-pages/
    pages.ts holds the pages themselves and runs only in Node, so the warm-up keeps the two columns it needs here;
    test/warm-up.test.mjs fails when they differ from pages.ts. */
export const SLUGS: Readonly<Record<string, string>> = {
  sq5: 'square-numbers-ending-in-5', 'near-base': 'multiply-numbers-near-100', crosswise: 'multiply-any-two-numbers-in-one-line',
  from9: 'subtract-from-100-or-1000', by9s: 'multiply-by-9-99-or-999', ends10: 'multiply-when-last-digits-add-to-10',
  'square-near': 'square-numbers-near-100', by11: 'multiply-by-11', div9: 'divide-by-9', check9: 'check-answers-with-digit-sums',
  times5: 'multiply-by-5-25-50-or-125', 'sub-base': 'multiply-with-a-working-base', duplex: 'square-any-two-digit-number',
  sqroot: 'square-roots-in-your-head', cuberoot: 'cube-roots-in-your-head',
};
export const TRICK_IDS: readonly string[] = Object.keys(SLUGS);

export const PROBLEMS: Readonly<Record<string, WarmUp>> = {
  sq5: { example: [35], problems: [[25], [65], [115]] },
  'near-base': { example: [98, 97], problems: [[9, 7], [97, 96], [996, 988]] },
  crosswise: { example: [23, 14], problems: [[21, 13], [34, 52], [123, 321]] },
  from9: { example: [387], problems: [[37], [368], [4729]] },
  by9s: { example: [42, 99], problems: [[7, 9], [46, 99], [358, 999]] },
  ends10: { example: [43, 47], problems: [[23, 27], [64, 66], [112, 118]] },
  'square-near': { example: [96], problems: [[9], [97], [1004]] },
  by11: { example: [52], problems: [[23], [78], [4352]] },
  div9: { example: [241], problems: [[23], [142], [3121]] },
  check9: { example: [34, 12], problems: [[23, 14], [47, 38], [386, 52]] },
  times5: { example: [24, 5], problems: [[46, 5], [36, 25], [48, 125]] },
  'sub-base': { example: [46, 43], problems: [[48, 47], [53, 46], [61, 58]] },
  duplex: { example: [32], problems: [[21], [47], [89]] },
  sqroot: { example: [1849], problems: [[144], [2304], [7569]] },
  cuberoot: { example: [12167], problems: [[4913], [59319], [357911]] },
};

const MINUS = '−';
const digits = (n: number) => String(n).length;

/** The problem as the class reads it on the screen: "65²", "97 × 96", "1000 − 368", "142 ÷ 9", "√2304", "∛59319" */
export function problemText(id: string, vals: number[]): string {
  const [a = 0, b = 0] = vals;
  switch (id) {
    case 'sq5': case 'square-near': case 'duplex': return `${a}²`;
    case 'from9': return `${10 ** digits(a)} ${MINUS} ${a}`;
    case 'by11': return `${a} × 11`;
    case 'div9': return `${a} ÷ 9`;
    case 'sqroot': return `√${a}`;
    case 'cuberoot': return `∛${a}`;
    default: return `${a} × ${b}`;
  }
}

/** The answer Reveal shows. Divide by 9 shows the quotient and the remainder; Check answers with digit sums shows the
    product the class is checking (its Trick's answer() is the digit sum, which the steps then show). */
export function answerText(id: string, vals: number[], answer: number | string): string {
  const [a = 0, b = 0] = vals;
  if (id === 'div9') return `${Math.floor(a / 9)} r ${a % 9}`;
  if (id === 'check9') return String(a * b);
  return String(answer);
}

/** A problem's size for the "rising" check: its digit count, then its largest number */
export const sizeOf = (vals: number[]): [number, number] => [vals.reduce((n, v) => n + digits(v), 0), Math.max(...vals)];

/** True when each problem is larger than the one before (more digits, or the same digits and a larger number) */
export function rises(problems: readonly number[][]): boolean {
  for (let i = 1; i < problems.length; i++) {
    const [d0, m0] = sizeOf(problems[i - 1] ?? []), [d1, m1] = sizeOf(problems[i] ?? []);
    if (!(d1 > d0 || (d1 === d0 && m1 > m0))) return false;
  }
  return true;
}
