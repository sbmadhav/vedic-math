import { test, expect, open, type Page } from '../fixtures';

/* quests spec, Requirement: Completing a quest (scenarios "Goal reached" and "Message wording").
   The date is fixed with page.clock. Each day's first Challenger quest is the answer quest ("Answer 15
   questions" or "Get 10 right"), so the saved progress starts one short of both goals: one right answer
   completes whichever is drawn. Questions are random: the times-table question is read from the page. */

const DAY = '2026-03-11';
const quests = (page: Page) => page.locator('.quest-card ul.quests > li');
const questToasts = (page: Page) => page.locator('.fx-toasts .fx-toast').filter({ hasText: 'Quest complete' });

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
async function next(page: Page) {
  await page.locator('#practice #prCheck').click();
  await expect(page.locator('#practice #prCheck')).toHaveText('Check');
}

/* Records every Sparks change the store emits (same module instance the app uses) */
async function watchSparks(page: Page) {
  await page.evaluate(async () => {
    const store = await e2eMod('store');
    const w = window as any; w.__sparks = [];
    store.on((type: string, d: any) => { if (type === 'sparks') w.__sparks.push({ n: d.n, why: d.why }); });
  });
}
const questSparks = (page: Page) => page.evaluate(() => ((window as any).__sparks || []).filter((s: any) => s.why === 'quest'));
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}'));

test.use({
  seedMode: 'challenger',
  seedProgress: {
    v: 3, skills: {}, sparks: 100, days: { [DAY]: 14 }, best: {}, last: null, grade: null, badges: {},
    counts: { answers: 14, right: 9 }, seen: {}, medals: {}, katasDone: {}, ratings: {}, weekSparks: {},
    questDay: { day: DAY, base: { answers: 0, right: 0 }, done: {} },
  },
});

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 2, 11, 10, 0, 0) });
});

test('Goal reached: the quest is marked done, 25 Sparks are added once, and more of the goal later that day adds nothing', async ({ page }) => {
  await open(page, '#/');
  const first = quests(page).first();
  await expect(first).toContainText(/Answer 15 questions|Get 10 right/);
  const label = ((await first.locator('.q-t').textContent()) || '').match(/Answer 15 questions|Get 10 right/)![0];
  const goal = label.startsWith('Answer') ? 15 : 10;
  const id = label.startsWith('Answer') ? 'answers-15' : 'right-10';
  await expect(first.locator('.q-n')).toHaveText(`${goal - 1}/${goal}`);
  await expect(first).not.toHaveClass(/\bdone\b/);

  await open(page, '#/skill/3-mult');
  await watchSparks(page);
  await answerOne(page);

  // Reached: one "Quest complete", 25 quest Sparks, the quest recorded as done
  await expect(questToasts(page)).toHaveCount(1);
  expect(await questSparks(page)).toEqual([{ n: 25, why: 'quest' }]);
  let s = await saved(page);
  expect(s.questDay.day).toBe(DAY);
  expect(Object.keys(s.questDay.done)).toEqual([id]);
  const doneAt = s.questDay.done[id];

  // More of the goal later the same day: nothing more
  for (let i = 0; i < 3; i++) { await next(page); await answerOne(page); }
  await page.clock.runFor(5 * 60 * 1000); // later the same day
  await next(page); await answerOne(page);
  expect(await questSparks(page)).toEqual([{ n: 25, why: 'quest' }]);
  s = await saved(page);
  expect(s.counts.answers).toBe(19);
  expect(s.questDay.done).toEqual({ [id]: doneAt });

  // Home shows it done, at its goal (not past it)
  await open(page, '#/');
  const done = quests(page).filter({ hasText: label });
  await expect(done).toHaveClass(/\bdone\b/);
  await expect(done.locator('.q-check')).toHaveText('✓');
  await expect(done.locator('.q-n')).toHaveText(`${goal}/${goal}`);

  // A reload the same day and another answer still add no quest Sparks
  await page.reload();
  await open(page, '#/skill/3-mult');
  await watchSparks(page);
  await answerOne(page);
  expect(await questSparks(page)).toEqual([]);
  await expect(questToasts(page)).toHaveCount(0);
  s = await saved(page);
  expect(s.questDay.done).toEqual({ [id]: doneAt });
});

test('Message wording: the quest message says "+25 Sparks" and does not say XP', async ({ page }) => {
  await open(page, '#/skill/3-mult');
  await answerOne(page);
  const msg = questToasts(page);
  await expect(msg).toHaveCount(1);
  await expect(msg).toBeVisible();
  await expect(msg).toContainText('+25 Sparks');
  const text = (await msg.textContent()) || '';
  expect(text).not.toMatch(/xp/i);
  expect(await msg.innerHTML()).not.toMatch(/xp/i);
});
