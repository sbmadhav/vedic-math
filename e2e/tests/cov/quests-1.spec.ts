import { test, expect, open, blockAnalytics, installModules, mod, type Page } from '../fixtures';

/* quests spec, Requirement: Progress counts from zero each day.
   Quests are drawn per local date, so each test fixes the date with page.clock. Questions are random:
   the times-table question is read from the page and answered from it. */

const quests = (page: Page) => page.locator('.quest-card ul.quests > li');
const questCount = (page: Page, label: string) => quests(page).filter({ hasText: label }).locator('.q-n');

/* Answers the times-table question on screen (Skill 3-mult) right, then waits for Next */
async function answerOne(page: Page) {
  const box = page.locator('#practice');
  await expect(box.locator('#prCheck')).toHaveText('Check');
  const [a, b] = ((await box.locator('#prQ').textContent()) || '').match(/\d+/g)!.map(Number);
  await box.locator('.ans-in').fill(String(a * b));
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
  await expect(box.locator('#prCheck')).toHaveText('Next');
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test.describe('First day, first action', () => {
  test.use({ seedMode: 'challenger', seedProgress: null });

  test('a new Challenger answers one question: "Answer 15 questions" shows 1/15 and no quest shows a decimal', async ({ page, browser }, testInfo) => {
    // Find a local date whose Challenger draw includes "Answer 15 questions" (the draw is seeded on the date)
    const ctx = await browser.newContext({ baseURL: testInfo.project.use.baseURL, serviceWorkers: 'block' });
    await blockAnalytics(ctx);
    await installModules(ctx, testInfo.project.use.baseURL);
    const probe = await ctx.newPage();
    await probe.goto(await mod(probe, 'gamify')).catch(() => {});
    const day = await probe.evaluate(async () => {
      const gm = await e2eMod('gamify');
      for (let i = 0; i < 60; i++) {
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

    // Before any action: today's quests start at 0
    await open(page, '#/');
    await expect(questCount(page, 'Answer 15 questions')).toHaveText('0/15');

    await open(page, '#/skill/3-mult');
    await answerOne(page);
    await open(page, '#/');

    await expect(questCount(page, 'Answer 15 questions')).toHaveText('1/15');
    const counts = await quests(page).locator('.q-n').allTextContents();
    expect(counts.length).toBe(3);
    for (const c of counts) expect(c, `quest count "${c}" is whole numbers from 0 to the goal`).toMatch(/^\d+\/\d+$/);
    for (const c of counts) { const [p, g] = c.split('/').map(Number); expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(g); }
    expect((await page.locator('.quest-card').textContent()) || '').not.toMatch(/\d\.\d/);
  });
});

test.describe('Next day', () => {
  // Yesterday (2026-03-10): 38 answers already, with that day's quest record taken from 0
  const YESTERDAY = '2026-03-10';
  test.use({
    seedMode: 'challenger',
    seedProgress: {
      v: 3, skills: {}, sparks: 0, days: { [YESTERDAY]: 38 }, best: {}, last: null, grade: null, badges: {},
      counts: { answers: 38, right: 38 }, seen: {}, medals: {}, katasDone: {}, ratings: {}, weekSparks: {},
      questDay: { day: YESTERDAY, base: { answers: 0, right: 0 }, done: {} },
    },
  });

  test('a Player who answered 40 questions yesterday sees today\'s answer quest at 0 of its goal', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 2, 10, 21, 0, 0) });
    // Two more answers yesterday: 40 in all
    await open(page, '#/skill/3-mult');
    await answerOne(page);
    await page.locator('#practice #prCheck').click();
    await answerOne(page);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}'));
    expect(saved.counts.answers).toBe(40);
    expect(saved.days[YESTERDAY]).toBe(40);

    // The app is opened again the next day
    await page.clock.setSystemTime(new Date(2026, 2, 11, 9, 0, 0));
    await page.goto('/play/');
    await open(page, '#/');
    expect(await page.evaluate(() => { const d = new Date(); return d.getDate(); })).toBe(11);

    // The answer quest is drawn first in each day's three
    const first = quests(page).first();
    await expect(first).toContainText(/Answer \d+ questions|Get \d+ right/);
    const label = (await first.locator('.q-t').textContent()) || '';
    const goal = Number(label.match(/\d+/)![0]);
    await expect(first.locator('.q-n')).toHaveText(`0/${goal}`);
    await expect(first).not.toHaveClass(/\bdone\b/);
    // Nothing else carried over from yesterday either
    for (const c of await quests(page).locator('.q-n').allTextContents()) expect(c).toMatch(/^0\/\d+$/);
  });
});
