import { test, expect, open, type Page, hrefTo } from '../fixtures';

/* ratings spec, "Skill Rating picks the Practice question level":
   - Rating climbs in a session: WHEN a Player's Rating on a Skill crosses into the range of the Skill's next level
     during a session THEN the following questions on that Skill are generated at that next level.
     practice.spec.ts checks the level is 2 or more from the 4th question on; these pin the exact question where the
     session Rating crosses each band (1 to 7 level 1, 8 to 13 level 2, 14 to 20 level 3) and that every question
     after it stays at the new level.
   - Mastery unchanged: WHEN a Player answers a Practice question THEN the Skill's mastery ring changes exactly as it
     did before Ratings were added. practice.spec.ts checks the stored mastery value; these check the ring itself (its
     fill and the % label) after every answer, and that the Player's Rating does not change it. */

const progress = (page: Page) => page.evaluate(async () => (await e2eMod('store')).load());
const box = (page: Page) => page.locator('#practice');

/** Answers the times-table question on screen: right on the first try, or wrong (ok false). */
async function answer(page: Page, ok = true) {
  const [a, b] = ((await box(page).locator('#prQ').textContent()) || '').match(/\d+/g)!.map(Number);
  await box(page).locator('.ans-in').fill(String(ok ? a * b : a * b + 1));
  await box(page).locator('#prCheck').click();
}
async function nextQuestion(page: Page) {
  await expect(box(page).locator('#prCheck')).toHaveText('Next');
  await box(page).locator('#prCheck').click();
  await expect(box(page).locator('#prCheck')).toHaveText('Check');
}
const level = async (page: Page) => Number(await box(page).locator('#prQ').getAttribute('data-level'));

/* The session Rating (js/adapt.js Dial): +1.5 per right answer for the first five, then +1 on a streak of 3 or more.
   Whole-number Rating = Math.round. Level bands: 1 to 7, 8 to 13, 14 to 20. */
const band = (d: number) => { const lv = Math.round(d); return lv <= 7 ? 1 : lv <= 13 ? 2 : 3; };

test.describe('Rating climbs in a session (Challenger, starts at Rating 5)', () => {
  test.use({ seedMode: 'challenger' });

  test('each question right after the Rating crosses into the next band is generated at that next level', async ({ page }) => {
    await open(page, '#/skill/3-mult');
    // Expected: d = 5, 6.5, 8, 9.5, 11, 12.5, 13.5, 14.5, 15.5 before questions 1 to 9 (all right, first try)
    const ds = [5]; for (let n = 1; n < 9; n++) ds.push(ds[n - 1] + (n <= 5 ? 1.5 : 1));
    const want = ds.map(band);
    expect(want).toEqual([1, 1, 2, 2, 2, 2, 3, 3, 3]); // the plan itself: crossings before question 3 and question 7
    const got: number[] = [];
    for (let i = 0; i < 9; i++) {
      got.push(await level(page));
      await answer(page);
      await expect(box(page).locator('#prSay')).toHaveClass(/\bok\b/);
      if (i < 8) await nextQuestion(page);
    }
    expect(got).toEqual(want);
    // Fewer than 10 answers: nothing saved yet, the climb was this session's
    expect((await progress(page)).ratings?.['skill:3-mult']).toBeUndefined();
  });
});

test.describe('Rating climbs in a session from a saved Skill Rating', () => {
  // Saved Rating 7: the top of level 1. One right answer (+1.5, 8.5, shown as 9) crosses into level 2.
  test.use({ seedMode: 'pro', seedProgress: { ratings: { 'skill:3-mult': 7 } } });

  test('the first question is level 1 and every following one after the crossing is level 2', async ({ page }) => {
    await open(page, '#/skill/3-mult');
    expect(await level(page)).toBe(1);
    await answer(page);
    await expect(box(page).locator('#prSay')).toHaveClass(/\bok\b/);
    await nextQuestion(page);
    for (let i = 0; i < 3; i++) {
      // 8.5, 10, 11.5: all in the level 2 band
      expect(await level(page)).toBe(2);
      await answer(page);
      await nextQuestion(page);
    }
  });
});

/* The mastery ring before Ratings: js/app.js ring(m, 36): r = 14, circumference 2*PI*14, dashoffset c * (1 - m), and
   the label Math.round(m * 100)% mastery. m moves by score 1 (first try), 0.5 (with help) or 0 at rate 0.35 for the
   first 5 answers, then 0.22, rounded to 3 places (js/store.js record). */
const C36 = 2 * Math.PI * 14;
const nextM = (m: number, n: number, score: number) => Math.round((m + (n < 5 ? 0.35 : 0.22) * (score - m)) * 1000) / 1000;

async function ringOf(page: Page) {
  const fg = box(page).locator('.pr-meter .ring .ring-fg');
  return { offset: Number(await fg.getAttribute('stroke-dashoffset')), label: (await box(page).locator('#prPct').textContent()) || '' };
}

/** Plays a fixed answer sequence and returns the ring (fill and label) after each answer. */
async function playSequence(page: Page) {
  const seq = ['right', 'miss', 'right', 'show', 'second', 'right', 'right'] as const;
  const seen: { offset: number; label: string }[] = [];
  let m = 0;
  const start = await ringOf(page);
  expect(start.offset).toBeCloseTo(C36, 3);
  expect(start.label).toBe('0% mastery');
  for (const [n, step] of seq.entries()) {
    if (step === 'show') await box(page).locator('#prShow').click();
    else if (step === 'second') { await answer(page, false); await answer(page); }
    else if (step === 'miss') { for (let k = 0; k < 3; k++) await answer(page, false); }
    else await answer(page);
    await expect(box(page).locator('#prCheck')).toHaveText('Next');
    m = nextM(m, n, step === 'right' ? 1 : step === 'second' ? 0.5 : 0);
    const r = await ringOf(page);
    expect(r.offset, `ring fill after answer ${n + 1} (${step})`).toBeCloseTo(C36 * (1 - m), 3);
    expect(r.label, `ring label after answer ${n + 1} (${step})`).toBe(`${Math.round(m * 100)}% mastery`);
    seen.push(r);
    // The next question opens with the same ring
    await nextQuestion(page);
    const again = await ringOf(page);
    expect(again.offset).toBeCloseTo(r.offset, 6);
    expect(again.label).toBe(r.label);
  }
  expect((await progress(page)).skills['3-mult'].m).toBe(m);
  return seen;
}

test.describe('Mastery unchanged: a Player at the starting Rating', () => {
  test.use({ seedMode: 'challenger' });

  test('the mastery ring moves by the pre-Ratings formula after every Practice answer', async ({ page }) => {
    await open(page, '#/skill/3-mult');
    await playSequence(page);
    // The Skill's ring on its grade page shows the same mastery
    await open(page, '#/grade/3');
    const fg = page.locator(`a.mq-skill${hrefTo('#/skill/3-mult')} .ring .ring-fg`);
    const m = (await progress(page)).skills['3-mult'].m as number;
    const r = 44 / 2 - 4;
    expect(Number(await fg.getAttribute('stroke-dashoffset'))).toBeCloseTo(2 * Math.PI * r * (1 - m), 3);
  });
});

test.describe('Mastery unchanged: a Player with a high Skill Rating', () => {
  // Rating 17 (level 3 questions): the Rating must not change how the ring moves
  test.use({ seedMode: 'challenger', seedProgress: { ratings: { 'skill:3-mult': 17 } } });

  test('the same answers move the ring by exactly the same amounts as at the starting Rating', async ({ page }) => {
    await open(page, '#/skill/3-mult');
    expect(await level(page)).toBe(3);
    await playSequence(page);
  });
});
