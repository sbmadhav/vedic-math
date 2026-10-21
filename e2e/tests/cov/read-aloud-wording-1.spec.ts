import { test, expect, open, type Page } from '../fixtures';

/* read-aloud-wording spec, Requirements "Question marks and blanks", "Ordinals and fractions as words", "Brackets keep
   their grouping", "Speed trick steps in clean form", "Negative numbers" and "Nothing unreadable is spoken": one test
   per scenario, through the shipped normalize() of js/voice.js (the words the voice is given). */
const words = (page: Page, html: string) => page.evaluate(async h => (await e2eMod('voice')).normalize(h) as string, html);

test.beforeEach(async ({ page }) => { await open(page, '#/learn'); });

test('A number bond: "3 and how many more make <b>10</b>?" reads "3 and how many more make 10?"', async ({ page }) => {
  expect(await words(page, '3 and how many more make <b>10</b>?')).toBe('3 and how many more make 10?');
});

test('Two blanks: "124 &divide; 5 = ? remainder ?" reads "124 divided by 5 equals what, remainder what?"', async ({ page }) => {
  expect(await words(page, '124 &divide; 5 = ? remainder ?')).toBe('124 divided by 5 equals what, remainder what?');
});

test('Ordinals: "Keep the 12ths." and "the 6th multiple" read as twelfths and sixth', async ({ page }) => {
  expect(await words(page, 'Keep the 12ths.')).toBe('Keep the twelfths.');
  expect(await words(page, 'the 6th multiple')).toBe('the sixth multiple');
});

test('Fraction names: 7 over 12 and 3 over 4 read "seven twelfths" and "three fourths"', async ({ page }) => {
  // The fraction markup the questions use (js/games.js and js/sutra-details.js frac())
  expect(await words(page, '<span class="fr"><span>7</span><span>12</span></span>')).toMatch(/seven twelfths/);
  expect(await words(page, '<span class="fr"><span>3</span><span>4</span></span>')).toMatch(/three fourths/);
});

test('Composition: "Find <i>f</i>(<i>g</i>(1))." reads "Find f of g of 1."', async ({ page }) => {
  expect(await words(page, 'Find <i>f</i>(<i>g</i>(1)).')).toBe('Find f of g of 1.');
});

test('A power of a bracket: "(4<i>x</i> + 3)<sup>4</sup>" reads "4 x plus 3, all to the power of 4"', async ({ page }) => {
  expect(await words(page, '(4<i>x</i> + 3)<sup>4</sup>')).toBe('4 x plus 3, all to the power of 4');
});

test('Two points: the midpoint question reads both points as negative numbers', async ({ page }) => {
  expect(await words(page, 'Find the midpoint of (&minus;5, &minus;5) and (&minus;11, 3).')).toBe('Find the midpoint of the points negative 5, negative 5, and negative 11, 3.');
});

test('A number times a sum: "2(<i>x</i> + 3)" and "(<i>x</i> &minus; 7)(<i>x</i> &minus; 8)" keep their grouping', async ({ page }) => {
  expect(await words(page, '2(<i>x</i> + 3)')).toBe('2 times, x plus 3');
  expect(await words(page, '(<i>x</i> &minus; 7)(<i>x</i> &minus; 8)')).toBe('x minus 7, times x minus 8');
});

test('Transpose: the step for a = 6, b = 2, c = −1, d = −12 reads "Equation: 6x + 2 = −x − 12."', async ({ page }) => {
  const step = await page.evaluate(async () => { const m: any = await e2eMod('vedic'); const t = m.TRICKS.find((x: any) => x.id === 'transpose'); return t.steps([6, 2, -1, -12])[0].say as string; });
  expect(step).toBe('Equation: 6x + 2 = −x − 12.');
});

test('A system of equations: the two lines read as negative numbers with a pause between them', async ({ page }) => {
  expect(await words(page, 'Solve:<br>&minus;4<i>x</i> &minus; 2<i>y</i> = &minus;28<br>&minus;<i>x</i> + <i>y</i> = 2')).toBe('Solve: negative 4 x minus 2 y equals negative 28. negative x plus y equals 2');
});

test('Every generated line: a seeded sample of every Skill, Kata, Arena League, Pro family and tower normalizes with nothing unreadable', async ({ page }) => {
  // test/voice-normalize.test.mjs samples over 50,000 lines in node; here a smaller seeded sample of the shipped modules
  test.setTimeout(90_000);
  const fails: string[] = await page.evaluate(async () => {
    const V: any = await e2eMod('voice');
    const { SKILLS }: any = await e2eMod('skills/index');
    const { TRICKS }: any = await e2eMod('vedic');
    const L: any = await e2eMod('levels');
    const A: any = await e2eMod('arena');
    const M: any = await e2eMod('mental');
    const lines: [string, string][] = [];
    const add = (src: string, t: string) => { if (t) lines.push([src, t]); };
    const spoken = (p: any) => p && (p.say || p.q);
    L.seeded('voice-wording-e2e', () => {
      for (const s of SKILLS) for (const lv of [1, 2, 3]) for (let i = 0; i < 4; i++) { const p = s.gen(lv); add(`${s.id} level ${lv}`, spoken(p)); (p.hints || []).forEach((h: string) => add(`${s.id} hint`, h)); }
      for (const f of M.FAMILIES) for (let d = 1; d <= 20; d += 4) add(`mental ${f} ${d}`, spoken(M.mentalQ(f, d)));
    });
    for (const t of TRICKS) for (const n of [1, 17, 34, 50]) for (const p of L.kata(t.id, n).problems) add(`kata ${t.id} ${n}`, spoken(p));
    for (const league of ['explorer', 'challenger', 'pro']) for (const p of A.makeSet(league, 'voice-e2e')) add(`arena ${league}`, spoken(p));
    // Every tower, 3 problems each (a tower's set is seeded, so this is the same sample every run)
    for (let id = 1; id <= L.CHALLENGE_COUNT; id++) for (const p of L.challengeSet(L.challenge(id), 3)) add(`tower ${id}`, spoken(p));
    const problems = (w: string) => {
      const bad: string[] = [];
      if (/[<>&#_^{}\\|⟨⟩□√′∫·×÷−±≤≥≠≈→←²³…\u0001-\u0003]/.test(w)) bad.push('symbol left');
      if (/\d+[A-Za-z]+/.test(w)) bad.push('digits then letters');
      if (/\bwhat what\b/i.test(w)) bad.push('what what');
      if (/\d what\b/.test(w)) bad.push('a question mark read as what after a number');
      const dbl = w.match(/\b([A-Za-z]+) \1\b/i); if (dbl) bad.push(`doubled word: ${dbl[0]}`);
      for (const part of V.sentences(w)) if (part.length > 160 && !part.includes(',')) bad.push('a long sentence with no pause');
      if (/,\s*[,.?!:]|\s[,.?!]/.test(w)) bad.push('stray punctuation');
      return bad;
    };
    const out: string[] = [], seen = new Set<string>();
    for (const [src, html] of lines) { const w = V.normalize(html); if (seen.has(w)) continue; seen.add(w); const bad = problems(w); if (bad.length) out.push(`${src}: ${bad.join('; ')} :: ${w}`); }
    if (lines.length < 1000) out.push(`only ${lines.length} lines sampled`);
    const towers = new Set(lines.filter(([src]) => src.startsWith('tower ')).map(([src]) => src));
    if (towers.size !== L.CHALLENGE_COUNT) out.push(`only ${towers.size} of ${L.CHALLENGE_COUNT} towers sampled`);
    return out;
  });
  expect(fails).toEqual([]);
});
