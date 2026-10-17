import { test, expect, open } from '../fixtures';

/* openspec star-round
   - Requirement: Sparks in a Star light it / Scenario: Not enough
     WHEN a Player ends a round with 30 Sparks earned in it
     THEN the Star is not lit and the end screen says how many more Sparks it needed
   - Requirement: A miss replays the Trick on the Player's number / Scenario: Miss on 85 squared
     WHEN a Player answers 7215 to 85²
     THEN the Trick's steps are shown for 85, then a rematch asks another 2-digit number ending in 5
   Questions are dealt at random, so every answer is worked out from the question on screen. */

type Page = import('@playwright/test').Page;
const tag = (page: Page) => page.locator('#stMain .star-tag');
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}'));
const question = (page: Page, i: number) => expect(tag(page)).toHaveText(`Question ${i} of 4`);
async function enter(page: Page, v: string) { await page.keyboard.type(v); await page.keyboard.press('Enter'); }

/** The n of each n² this round deals, from the round's saved keys (<kata>:<index>) and the app's seeded Katas */
const roundBases = (page: Page) => page.evaluate(async () => {
  const L = await import('/vedic-math/js/levels.js' as string);
  const keys: string[] = JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}').sky.last['sq5:1'];
  return keys.map(k => { const [n, i] = k.split(':').map(Number); return L.kata('sq5', n).problems[i].vals[0] as number; });
});

test.describe('Sparks in a Star light it: Not enough', () => {
  test('a round ending with 30 Sparks leaves the Star unlit and says 10 more Sparks were needed', async ({ page }) => {
    await open(page, '#/star/sq5/1');
    // Question 1: a miss, the replay skipped, the rematch missed too (0 Sparks)
    await question(page, 1);
    await enter(page, '1');
    await expect(page.locator('.star-replay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tag(page)).toHaveText('Rematch');
    await enter(page, '1');
    await expect(page.locator('#stSay')).toContainText('Close! It is');
    // The Next button can appear under the spot just tapped; move the pointer off so its hover lift does not jitter
    await page.mouse.move(0, 0);
    await page.locator('#stNext').click();
    // Questions 2 to 4 right first time: 10 Sparks each
    for (let i = 2; i <= 4; i++) {
      await question(page, i);
      const n = await base(page);
      await enter(page, String(n * n));
      await expect(page.locator('#stSay')).toContainText('+10 Sparks');
    }
    await expect(page.locator('.star-end-h')).toHaveText('Round done');
    await expect(page.locator('.star-end')).toContainText('+30 Sparks');
    await expect(page.locator('.star-end')).toContainText('10 more Sparks to light it.');
    await expect(page.locator('.star-end')).not.toContainText('is lit');
    await expect(page.locator('#stMeter')).toHaveAttribute('aria-valuenow', '30');
    const d = await saved(page);
    expect(d.sky?.lit?.['sq5:1']).toBeFalsy();
  });
});

test.describe('A miss replays the Trick on the Player\'s number: Miss on 85 squared', () => {
  test('7215 to 85 squared shows the Trick\'s steps for 85, then a rematch on another 2-digit number ending in 5', async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, '#/star/sq5/1');
    // 85 squared is a question of this Star (at a new Player's Rating)
    const pool = await page.evaluate(async () => (await import('/vedic-math/js/levels.js' as string)).starPool('sq5', 1, 5).map((p: { vals: number[] }) => p.vals[0]));
    expect(pool).toContain(85);
    // Deal rounds (skipping them, so nothing is answered) until one deals 85 squared
    let dealt: number[] = [];
    for (let r = 0; r < 60; r++) {
      await question(page, 1);
      dealt = await roundBases(page);
      if (dealt.includes(85)) break;
      await page.locator('#stSkip').click();
      await page.locator('#stAgain').click();
    }
    expect(dealt, 'a round dealt 85 squared').toContain(85);
    // Answer the questions before it right, then 7215 to 85 squared
    const at = dealt.indexOf(85) + 1;
    for (let i = 1; i < at; i++) {
      await question(page, i);
      const n = await base(page);
      await enter(page, String(n * n));
      await expect(page.locator('#stSay')).toContainText('+10 Sparks');
    }
    await question(page, at);
    expect(await base(page)).toBe(85);
    await enter(page, '7215');
    await expect(page.locator('#stSay')).toContainText('Not quite');

    // The Trick's steps, worked on 85
    const replay = page.locator('.star-replay');
    await expect(replay).toBeVisible();
    await expect(replay.locator('#stQ')).toHaveText('852 = ?');
    const expected = await page.evaluate(async () => {
      const V = await import('/vedic-math/js/vedic.js' as string);
      const t = V.TRICKS.find((x: { id: string }) => x.id === 'sq5');
      return t.steps([85]).map((s: { say: string }) => { const d = document.createElement('div'); d.innerHTML = s.say; return d.textContent || ''; });
    });
    expect(expected.length).toBeGreaterThan(0);
    const steps = replay.locator('.star-step');
    await expect(steps).toHaveCount(expected.length, { timeout: expected.length * 2500 + 10_000 });
    for (let i = 0; i < expected.length; i++) await expect(steps.nth(i).locator('p')).toHaveText(expected[i]);
    await expect(steps.first()).toContainText('8');
    await expect(steps.first()).toContainText('85');
    await expect(replay).toContainText('7225');

    // Then the rematch: another 2-digit number ending in 5, not one already dealt in the round
    await page.locator('#stRGo').click();
    await expect(tag(page)).toHaveText('Rematch');
    const m = await base(page);
    expect(m).not.toBe(85);
    expect(String(m)).toMatch(/^\d5$/);
    expect(dealt).not.toContain(m);
  });
});
