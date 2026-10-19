import { test, expect, open, type Page } from '../fixtures';

/* quests spec: "Quests have stable ids" (Mode change after completing a quest) and
   "Changing Mode starts the new quests at zero" (Challenger to Explorer mid-day).

   Today's three quests per Mode come from a seeded draw on the local date (js/gamify.js pickQuests), so each test
   fixes the date with page.clock. Draws used here:
     2026-03-11  Challenger: answers-15, tricksWatched-1, runs-1  Pro: answers-20, arena-1, katas-2  Explorer: right-5, gamesPlayed-1, arena-1
     2026-03-13  Challenger: answers-15, runs-1, arena-1          Pro: answers-20, arena-1, gamesPlayed-2
   Answers go through store.record (the same path every Practice answer takes), on the app's own module instance. */

const at = (day: string) => new Date(`${day}T12:00:00`);

/** The quest card on Home: label, "n/goal" and done, in order */
async function card(page: Page) {
  const rows = page.locator('.quest-card .quests li');
  await expect(rows).toHaveCount(3);
  return rows.evaluateAll(lis => lis.map(li => ({
    label: (li.querySelector('.q-t')?.firstChild?.textContent || '').trim(),
    n: li.querySelector('.q-n')?.textContent || '',
    done: li.classList.contains('done'),
  })));
}

/** Answers n questions on a Skill, right or wrong, the way Practice records them */
const answer = (page: Page, n: number, correct = true) => page.evaluate(async ([n, correct]) => {
  const store: any = await import('/js/store.js');
  for (let i = 0; i < (n as number); i++) store.record('k-add10', correct, 0);
}, [n, correct] as const);

const sparks = (page: Page) => page.evaluate(async () => ((await import('/js/store.js')) as any).sparks());
const questDay = (page: Page) => page.evaluate(async () => ((await import('/js/store.js')) as any).questDay());

/** Changes Mode on the Me page, then goes Home */
async function switchMode(page: Page, m: 'explorer' | 'challenger' | 'pro') {
  await open(page, '#/me');
  await page.locator(`.mode-pick--sm .mode-card[data-mode="${m}"]`).click();
  await expect(page.locator(`.mode-pick--sm .mode-card[data-mode="${m}"]`)).toHaveAttribute('aria-pressed', 'true');
  await open(page, '#/');
}

test.describe('Quests have stable ids: Mode change after completing a quest', () => {
  test.use({ seedMode: 'challenger' });

  test('Challenger completes "Answer 15 questions", switches to Pro: no Pro quest is shown as done', async ({ page }) => {
    await page.clock.install({ time: at('2026-03-11') });
    await open(page, '#/');
    expect(await card(page)).toEqual([
      { label: 'Answer 15 questions', n: '0/15', done: false },
      { label: 'Watch a speed trick', n: '0/1', done: false },
      { label: 'Finish an Endless run', n: '0/1', done: false },
    ]);

    // The first quest completes
    await answer(page, 15);
    await expect(page.locator('.fx-toast', { hasText: 'Quest complete' })).toContainText('Answer 15 questions');
    expect(Object.keys((await questDay(page)).done)).toEqual(['answers-15']);
    await open(page, '#/');
    expect((await card(page))[0]).toEqual({ label: 'Answer 15 questions', n: '15/15', done: true });

    await switchMode(page, 'pro');
    await expect(page.locator('h1.home-h')).toHaveText('Train your mental math');
    const pro = await card(page);
    expect(pro.map(q => q.label)).toEqual(['Answer 20 questions', 'Finish an Arena round', 'Finish 2 Dojo katas']);
    expect(pro.filter(q => q.done), 'no Pro quest is done: none of them was completed').toEqual([]);
    expect(await page.locator('.quest-card .quests li.done').count()).toBe(0);
    expect(await page.locator('.quest-card .q-check').allTextContents()).toEqual(['', '', '']);
    // The answer quest is a different quest (answers-20): today's 15 answers count, but it is not done
    expect(pro[0]).toEqual({ label: 'Answer 20 questions', n: '15/20', done: false });
    expect(Object.keys((await questDay(page)).done)).toEqual(['answers-15']);
  });

  test('a quest both Modes share (Finish an Arena round) is shown as done in Pro only because it was completed', async ({ page }) => {
    await page.clock.install({ time: at('2026-03-13') });
    await open(page, '#/');
    expect((await card(page)).map(q => q.label)).toEqual(['Answer 15 questions', 'Finish an Endless run', 'Finish an Arena round']);

    // Finishing an Arena round bumps the arena counter (js/arena.js); done here directly on the store
    await page.evaluate(async () => ((await import('/js/store.js')) as any).bump('arena'));
    await expect(page.locator('.fx-toast', { hasText: 'Quest complete' })).toContainText('Finish an Arena round');
    expect(Object.keys((await questDay(page)).done)).toEqual(['arena-1']);

    await switchMode(page, 'pro');
    expect(await card(page)).toEqual([
      { label: 'Answer 20 questions', n: '0/20', done: false },
      { label: 'Finish an Arena round', n: '1/1', done: true },
      { label: 'Play 2 games', n: '0/2', done: false },
    ]);
  });
});

test.describe('Changing Mode starts the new quests at zero: Challenger to Explorer mid-day', () => {
  test.use({ seedMode: 'challenger', seedProgress: { v: 3, sparks: 5000, counts: { answers: 420, right: 350, bestStreak: 20 }, badges: { first: 1, right25: 1, right100: 1, streak5: 1, streak15: 1, level5: 1, level10: 1 } } });

  test('the Explorer "Get 5 right" quest counts only today\'s right answers and the switch completes nothing', async ({ page }) => {
    await page.clock.install({ time: at('2026-03-11') });
    await open(page, '#/');
    // Two right answers today, as a Challenger
    await answer(page, 2);
    const before = await sparks(page);

    await switchMode(page, 'explorer');
    await expect(page.locator('h1.home-h')).toHaveText('What do you want to play?');
    await page.waitForTimeout(300);
    await expect(page.locator('.fx-toast', { hasText: 'Quest complete' })).toHaveCount(0);
    expect(await sparks(page), 'no quest Sparks from the switch').toBe(before);

    const qs = await page.evaluate(async () => ((await import('/js/gamify.js')) as any).quests());
    const right5 = qs.find((q: any) => q.label === 'Get 5 right');
    expect(right5, 'Get 5 right is one of today\'s Explorer quests').toBeTruthy();
    expect(right5).toMatchObject({ id: 'right-5', prog: 2, goal: 5, done: false });
    expect(qs.filter((q: any) => q.done)).toEqual([]);
    expect((await questDay(page)).done).toEqual({});

    // Three more right answers today complete it, once
    await answer(page, 3);
    await expect(page.locator('.fx-toast', { hasText: 'Quest complete' })).toContainText('Get 5 right');
    const after = await page.evaluate(async () => ((await import('/js/gamify.js')) as any).quests());
    expect(after.find((q: any) => q.id === 'right-5')).toMatchObject({ prog: 5, done: true });
  });
});
