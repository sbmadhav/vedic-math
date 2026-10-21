import { test, expect, open, blockAnalytics, installModules, mod, cloudLog, type Page } from '../fixtures';

/* openspec star-round:
   - Requirement: Stars are Practice / Scenario: Quest progress
       WHEN a Player answers 4 questions in a Star THEN the "Answer 15 questions" quest moves by 4
   - Requirement: Answer boxes by Mode / Scenario: Challenger on 85 squared
       WHEN a Challenger Player is asked 85² THEN four empty digit boxes are shown
   Questions are dealt at random, so each answer is worked out from the question on screen. */

const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const tag = (page: Page) => page.locator('#stMain .star-tag');
const question = (page: Page, i: number) => expect(tag(page)).toHaveText(`Question ${i} of 4`);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test.describe('Quest progress', () => {
  test.use({ seedMode: 'challenger', seedProgress: null });

  test('answering 4 questions in a Star moves "Answer 15 questions" by 4', async ({ page, browser }, testInfo) => {
    // The day's quests are a seeded draw on the local date: find a date whose Challenger draw has "Answer 15 questions"
    const ctx = await browser.newContext({ baseURL: testInfo.project.use.baseURL, serviceWorkers: 'block' });
    await blockAnalytics(ctx);
    await installModules(ctx, testInfo.project.use.baseURL);
    const probe = await ctx.newPage();
    await probe.goto(await mod(probe, 'gamify')).catch(() => {});
    const day = await probe.evaluate(async () => {
      const gm = await e2eMod('gamify');
      for (let i = 0; i < 90; i++) {
        const d = new Date(2026, 2, 1 + i);
        const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (gm.pickQuests(s, 'challenger').some((q: { id: string }) => q.id === 'answers-15')) return s;
      }
      return null;
    });
    await ctx.close();
    expect(day, 'a date with "Answer 15 questions" in the Challenger draw').not.toBeNull();
    const [y, m, d] = day!.split('-').map(Number);
    await page.clock.install({ time: new Date(y, m - 1, d, 10, 0, 0) });

    const quest = page.locator('.quest-card ul.quests > li').filter({ hasText: 'Answer 15 questions' }).locator('.q-n');
    await open(page, '#/');
    expect(await page.evaluate(() => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; })).toBe(ymd(new Date(y, m - 1, d)));
    await expect(quest).toHaveText('0/15');

    await open(page, '#/star/sq5/1');
    for (let i = 1; i <= 4; i++) {
      await question(page, i);
      const n = await base(page);
      await page.keyboard.type(String(n * n));
      await page.keyboard.press('Enter');
      await expect(page.locator('#stSay')).toContainText('+10 Sparks');
    }
    await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');

    await open(page, '#/');
    await expect(quest).toHaveText('4/15');
    // A Star is Practice: nothing was sent to any board
    expect((await cloudLog(page)).writes).toEqual([]);
  });
});

test.describe('Challenger on 85 squared', () => {
  test.use({ seedMode: 'challenger' });

  test('asked 85², a Challenger sees four empty digit boxes', async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, '#/star/sq5/1');
    let found = false;
    // Play rounds of Star 1 (15² to 95²), answering right, until 85² is asked
    for (let round = 0; round < 12 && !found; round++) {
      for (let i = 1; i <= 4; i++) {
        await question(page, i);
        const n = await base(page);
        if (n === 85) { found = true; break; }
        await page.keyboard.type(String(n * n));
        await page.keyboard.press('Enter');
        await expect(page.locator('#stSay')).toContainText('+10 Sparks');
      }
      if (!found) {
        await expect(page.locator('.star-end-h')).toBeVisible();
        await page.locator('#stAgain').click();
      }
    }
    expect(found, '85² was asked within 12 rounds').toBe(true);
    await expect(page.locator('#stQ')).toContainText('85');
    const boxes = page.locator('#stBoxes span');
    await expect(boxes).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(boxes.nth(i)).toBeVisible();
      await expect(boxes.nth(i)).toHaveText('');
      await expect(boxes.nth(i)).not.toHaveClass(/\bf\b/);
    }
    await expect(page.locator('.star-plain')).toHaveCount(0);
  });
});
