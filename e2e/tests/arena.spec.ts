import { test, expect, APP, open, cloudLog, heldClock, appErrors } from './fixtures';

/* Arena rounds start and take answers. Every test leaves before the 60 second round ends,
   so no score is ever submitted (and the fake SDK would record it if one were). */

test('daily round: countdown, keypad answer, then leaving stops the round with nothing posted', async ({ page }) => {
  await open(page, '#/arena');
  await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.g-best')).toContainText('League: Challenger');
  await page.locator('#arGo').click();
  await expect(page.locator('.ar-count')).toBeVisible();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
  await expect(page.locator('#arTime')).toHaveText(/^(60|59|58|57)$/);
  // Type on the on-screen keypad, then Go: the question moves on
  await page.locator('.ar-key[data-k="1"]').click();
  await page.locator('.ar-key[data-k="2"]').click();
  await expect(page.locator('#arEntry')).toHaveText('12');
  await page.locator('#arForm button').click();
  // A right answer pops "+10", a wrong one pops the correct answer
  await expect(page.locator('#arPop')).toHaveText(/^(\+\d+|-?\d+)$/);
  // Leave mid-round: the timer stops and nothing reaches any board
  await page.goto(`${APP}#/learn`);
  await expect(page.locator('#view h1')).toHaveText('Pick a level');
  await page.waitForTimeout(500);
  const log = await cloudLog(page);
  expect(log.writes).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.board') || '[]'))).toEqual([]);
});

test.describe('explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('practice round uses big tap choices', async ({ page }) => {
    await open(page, '#/arena');
    await page.locator('[data-t="practice"]').click();
    await expect(page.locator('[data-t="practice"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#arGo').click();
    const choices = page.locator('.ar-choice');
    await expect(choices.first()).toBeVisible({ timeout: 6000 });
    expect(await choices.count()).toBeGreaterThanOrEqual(2);
    await choices.first().click();
    await expect(page.locator('#arPop')).toHaveText(/^(\+\d+|-?\d+)$/);
    await page.goto(`${APP}#/`);
    expect((await cloudLog(page)).writes).toEqual([]);
  });
});

test('the lobby shows today, this week and weekly XP boards with World and This device tabs', async ({ page }) => {
  await open(page, '#/arena');
  for (const id of ['#lbDay', '#lbWeek', '#lbXp']) {
    await expect(page.locator(`${id} [data-src="world"]`)).toBeVisible();
    await page.locator(`${id} [data-src="device"]`).click();
    await expect(page.locator(`${id} [data-src="device"]`)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(`${id} .lb-body`)).toContainText('No scores yet');
  }
});

test('challenge tower: challenge 1 starts and takes an answer', async ({ page }) => {
  await open(page, '#/challenge/1');
  await page.locator('#chGo').click();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
  const choice = page.locator('.ar-choice').first();
  if (await choice.count()) await choice.click();
  else { await page.locator('.ar-key[data-k="7"]').click(); await page.locator('#arForm button').click(); }
  // Right pops "+N"; wrong shows the answer underneath
  await expect.poll(async () => `${await page.locator('#arPop').textContent()}${await page.locator('#arFix').textContent()}`).toMatch(/^\+\d+$|Answer:/);
  await page.goto(`${APP}#/tower`);
  expect((await cloudLog(page)).writes).toEqual([]);
});

test('duel: two players answer on one screen', async ({ page }) => {
  await open(page, '#/duel');
  await page.locator('#dGo').click();
  await expect(page.locator('.duel-side')).toHaveCount(2);
  await page.locator('.duel-p1 .ar-choice').first().click();
  // A right answer scores a point; a wrong one freezes that player for a moment
  await expect.poll(async () => (await page.locator('#dS0').textContent()) === '1' || await page.locator('.duel-p1').evaluate(e => e.classList.contains('frozen'))).toBe(true);
  await expect(page.locator('#dS1')).toHaveText('0');
});

test('Duelist: starting a duel and leaving earns nothing, finishing one earns it', async ({ page }) => {
  // A resettable Math.random, so the test can rebuild the duel's question set and pick right answers
  await page.addInitScript(() => {
    let a = 1;
    (window as any).__seed = (s: number) => { a = s; };
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
  const duelist = page.locator('.badge-grid .badge').filter({ has: page.locator('b', { hasText: /^Duelist$/ }) });
  await open(page, '#/duel');
  await page.locator('#dGo').click();
  await expect(page.locator('.duel-side')).toHaveCount(2);
  await page.goto(`${APP}#/me`);
  await expect(duelist).not.toHaveClass(/\bgot\b/);
  await expect(duelist).toContainText('Finish a two-player duel.');

  await page.goto(`${APP}#/duel`);
  await page.evaluate(() => (window as any).__seed(4242));
  await page.locator('#dGo').click();
  const answers = await page.evaluate(async () => {
    (window as any).__seed(4242);
    const A = await import('/vedic-math/js/arena.js' as string);
    const html = (h: string) => { const d = document.createElement('div'); d.innerHTML = h; return d.innerHTML; };
    return A.makeSet('challenger', null, 120).map((q: { q: string; answer: number }) => [html(q.q), q.answer]);
  });
  const byQ = new Map(answers as [string, number][]);
  for (let i = 0; i < 10; i++) {
    const q = await page.locator('#dQ0').innerHTML();
    const a = byQ.get(q);
    expect(a, `question ${q} is in the rebuilt set`).not.toBeUndefined();
    await page.locator(`.duel-p1 .ar-choice[data-v="${a}"]`).first().click();
    if (i < 9) await expect(page.locator('#dS0')).toHaveText(String(i + 1));
  }
  await expect(page.locator('.ar-result')).toContainText('Player 1');
  await page.goto(`${APP}#/me`);
  await expect(duelist).toHaveClass(/\bgot\b/);
});

/* view-lifecycle spec: rounds run under their own signal, so a second round on the same page handles each
   tap once. page.clock runs the 60 second rounds in milliseconds; Practice rounds never post a score. */
/* Jumps past the end of a 60 second round, then lets a frame or two run so the round clock sees it */
async function endRound(page: import('@playwright/test').Page) {
  await page.clock.fastForward(61_000);
  await page.clock.runFor(100);
}
async function practiceRound(page: import('@playwright/test').Page) {
  await page.locator('[data-t="practice"]').click();
  await page.locator('#arGo').click();
  await page.clock.runFor(2200); // the 3, 2, 1 countdown
  await expect(page.locator('#arQ')).not.toBeEmpty();
}

test('second Arena round: keypad taps 1 then 2 enter 12', async ({ page, issues }) => {
  await heldClock(page);
  await open(page, '#/arena');
  await practiceRound(page);
  await endRound(page);
  await expect(page.locator('.ar-result')).toBeVisible();
  await practiceRound(page);
  await page.locator('.ar-key[data-k="1"]').click();
  await page.locator('.ar-key[data-k="2"]').click();
  await expect(page.locator('#arEntry')).toHaveText('12');
  expect((await cloudLog(page)).writes).toEqual([]);
  expect(appErrors(issues), 'console errors').toEqual([]);
});

test.describe('explorer, second round', () => {
  test.use({ seedMode: 'explorer' });
  test('one tap answers exactly one question', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/arena');
    await practiceRound(page);
    await endRound(page);
    await expect(page.locator('.ar-result')).toBeVisible();
    await practiceRound(page);
    await page.locator('.ar-choice').first().click();
    await expect(page.locator('#arPop')).toHaveText(/^(\+\d+|-?\d+)$/);
    await endRound(page);
    await expect(page.locator('.ar-result p').first()).toHaveText(/^(1 right · 0 missed|0 right · 1 missed)/);
    expect((await cloudLog(page)).writes).toEqual([]);
  });
});

test('challenge tower: Play again, then one keypad tap enters one digit', async ({ page }) => {
  await heldClock(page);
  await open(page, '#/challenge/1');
  await page.locator('#chGo').click();
  await page.clock.runFor(2000);
  await expect(page.locator('#arQ')).not.toBeEmpty();
  await endRound(page); // challenge 1 is a 60 second Sprint
  await page.locator('.lv-result [data-retry]').click();
  await page.locator('#chGo').click();
  await page.clock.runFor(2000);
  await expect(page.locator('#arQ')).not.toBeEmpty();
  for (let k = 0; k < 30 && !(await page.locator('.ar-key').count()); k++) await page.locator('.ar-choice').first().click();
  await page.locator('.ar-key[data-k="7"]').click();
  await expect(page.locator('#arEntry')).toHaveText('7');
  expect((await cloudLog(page)).writes).toEqual([]);
});

test('duel rematch: one right tap scores exactly 1', async ({ page, issues }) => {
  await page.addInitScript(() => {
    let a = 1;
    (window as any).__seed = (s: number) => { a = s; };
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
  await open(page, '#/duel');
  // Seeding and building the set happen in one tick each, so nothing else draws a random number in between
  const answers = new Map(await page.evaluate(async () => {
    const A = await import('/vedic-math/js/arena.js' as string);
    (window as any).__seed(4242);
    const set = A.makeSet('challenger', null, 120);
    const html = (h: string) => { const d = document.createElement('div'); d.innerHTML = h; return d.innerHTML; };
    return set.map((q: { q: string; answer: number }) => [html(q.q), q.answer]);
  }) as [string, number][]);
  const start = () => page.evaluate(() => { (window as any).__seed(4242); (document.querySelector('#dGo') as HTMLElement).click(); });
  const tapRight = async () => {
    const q = await page.locator('#dQ0').innerHTML();
    expect(answers.has(q), `question ${q} is in the rebuilt set`).toBe(true);
    await page.locator(`.duel-p1 .ar-choice[data-v="${answers.get(q)}"]`).first().click();
  };
  await start();
  for (let i = 0; i < 10; i++) { await tapRight(); if (i < 9) await expect(page.locator('#dS0')).toHaveText(String(i + 1)); }
  await expect(page.locator('.ar-result')).toContainText('Player 1');
  await start();
  await expect(page.locator('#dS0')).toHaveText('0');
  await tapRight();
  await expect(page.locator('#dS0')).toHaveText('1');
  await expect(page.locator('#dS1')).toHaveText('0');
  expect(appErrors(issues), 'console errors').toEqual([]);
});
