/* The shapes the question generators share (openspec change react-typescript, task 3.1): a Skill (GLOSSARY.md) with
   its generator, and the question it makes. Question and step text is HTML, rendered only through the allow-list in
   markup.ts once views move to React (design B1). Types only: nothing here runs. */

/* How a question is answered: a number, a choice, an expression, several fields, an inequality, a set of numbers,
   free text (a time like 3:25) or a complex number */
export type QuestionKind = 'num' | 'choice' | 'expr' | 'fields' | 'ineq' | 'set' | 'text' | 'complex';

/* An inequality's answer: x op val, op one of <, >, <=, >= */
export interface IneqAnswer { op: string; val: number }
/* A set's or a complex number's answer is a list of numbers ([re, im] for a complex number) */
export type Answer = number | string | number[] | IneqAnswer;

export interface Field { label: string; answer: number; tol?: number }

export interface Question {
  q: string;
  kind: QuestionKind;
  answer?: Answer;
  /* A picture (SVG or HTML from viz.ts) */
  viz?: string;
  hints?: string[];
  steps?: string[];
  choices?: (string | number)[];
  fields?: Field[];
  /* What read aloud says instead of the question's text */
  say?: string;
  /* The answer may be off by this much */
  tol?: number;
  unit?: string;
  /* Only a plain number is an answer (skills/index.ts withPlain) */
  plain?: boolean;
  /* Expression answers: the variables allowed ([] for a number such as 2sqrt(3)), and a required form */
  vars?: string[];
  form?: string;
  /* Generator-specific fields (range, simplest, signs, asDecimal and others) that the checker and the views read */
  [extra: string]: unknown;
}

/* One Skill: its place in the map, its lesson text and its question generator (level 1 to 3) */
export interface Skill {
  id: string;
  grade: string | number;
  strand: string;
  title: string;
  kid?: string;
  idea?: string;
  method?: string[];
  /* The Trick a speed-trick Skill practices (vedic.ts) */
  trick?: string;
  /* An arithmetic Skill that accepts an expression as the answer (skills/index.ts isArithmetic) */
  exprOk?: boolean;
  gen(lv: number): Question;
  [extra: string]: unknown;
}
