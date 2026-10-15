import { test, expect, APP, open, cloudLog } from './fixtures';

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

/* Duel helpers: a resettable Math.random, so a test can rebuild a duel's question set and know every answer */
async function seedable(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    let a = 1;
    (window as any).__seed = (s: number) => { a = s; };
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
}
/* Starts a duel at league with seed, and returns the answer to each question by its HTML. Seeding and building
   the set happen in one tick each (nothing else can draw a random number in between). */
async function startSeededDuel(page: import('@playwright/test').Page, league: string, seed = 4242) {
  const answers = new Map(await page.evaluate(async ([lg, sd]) => {
    const A = await import('/vedic-math/js/arena.js' as string);
    (window as any).__seed(sd);
    const set = A.makeSet(lg, null, 120);
    const html = (h: string) => { const d = document.createElement('div'); d.innerHTML = h; return d.innerHTML; };
    return set.map((q: { q: string; answer: number }) => [html(q.q), q.answer]);
  }, [league, seed] as const) as [string, number][]);
  await page.evaluate(sd => { (window as any).__seed(sd); (document.querySelector('#dGo') as HTMLElement).click(); }, seed);
  await expect(page.locator('.duel-side')).toHaveCount(2);
  return async () => { const q = await page.locator('#dQ0').innerHTML(); expect(answers.has(q), `question ${q} is in the rebuilt set`).toBe(true); return answers.get(q)!; };
}
const sideTexts = (page: import('@playwright/test').Page, p: number) => page.locator(`#dQ${p}, #dC${p}`).allTextContents();

test('duel: both sides race the same question; a miss freezes one side; two misses reveal the answer', async ({ page }) => {
  await seedable(page);
  await page.clock.install();
  await open(page, '#/duel');
  const answer = await startSeededDuel(page, 'challenger');
  const p1 = page.locator('.duel-p1'), p2 = page.locator('.duel-p2');
  // Same question and the same choices in the same order on both sides
  expect(await sideTexts(page, 0)).toEqual(await sideTexts(page, 1));
  const first = await page.locator('#dQ0').innerHTML();
  // Player 2 is right: 1 point, and both sides get the same next question
  await p2.locator(`.ar-choice[data-v="${await answer()}"]`).click();
  await expect(page.locator('#dS1')).toHaveText('1');
  await expect(page.locator('#dS0')).toHaveText('0');
  await expect(page.locator('#dQ0')).not.toHaveJSProperty('innerHTML', first);
  expect(await sideTexts(page, 0)).toEqual(await sideTexts(page, 1));
  // Player 1 misses: only that side freezes, and Player 2 can still win the question
  const a = await answer(), q2 = await page.locator('#dQ0').innerHTML();
  await p1.locator(`.ar-choice:not([data-v="${a}"])`).first().click();
  await expect(p1).toHaveClass(/\bfrozen\b/);
  await expect(p2).not.toHaveClass(/\bfrozen\b/);
  await p1.locator(`.ar-choice[data-v="${a}"]`).click(); // ignored while frozen
  await expect(page.locator('#dS0')).toHaveText('0');
  await p2.locator(`.ar-choice[data-v="${a}"]`).click();
  await expect(page.locator('#dS1')).toHaveText('2');
  await expect(page.locator('#dQ1')).not.toHaveJSProperty('innerHTML', q2);
  await page.clock.runFor(1300);
  await expect(p1).not.toHaveClass(/\bfrozen\b/);
  // Both miss: no points, the answer is shown on both sides, then a new shared question
  const b = await answer(), q3 = await page.locator('#dQ0').innerHTML();
  await p1.locator(`.ar-choice:not([data-v="${b}"])`).first().click();
  await p2.locator(`.ar-choice:not([data-v="${b}"])`).first().click();
  for (const p of [0, 1]) {
    await expect(page.locator(`#dA${p}`)).toHaveText(`Answer: ${b}`);
    await expect(page.locator(`#dC${p} .ar-choice.right`)).toHaveText(String(b));
  }
  await page.clock.runFor(1300);
  await expect(page.locator('#dQ0')).not.toHaveJSProperty('innerHTML', q3);
  await expect(page.locator('#dA0')).toHaveText('');
  expect(await sideTexts(page, 0)).toEqual(await sideTexts(page, 1));
  await expect(page.locator('#dS0')).toHaveText('0');
  await expect(page.locator('#dS1')).toHaveText('2');
});

test.describe('explorer duel', () => {
  test.use({ seedMode: 'explorer' });
  test('a question with a picture shows it on both sides', async ({ page }) => {
    await seedable(page);
    await open(page, '#/duel');
    await expect(page.locator('[data-l="explorer"]')).toHaveAttribute('aria-pressed', 'true');
    const answer = await startSeededDuel(page, 'explorer');
    for (let k = 0; k < 8 && !(await page.locator('#dV0 svg').count()); k++) { const n = k + 1; await page.locator(`.duel-p1 .ar-choice[data-v="${await answer()}"]`).click(); await expect(page.locator('#dS0')).toHaveText(String(n)); }
    await expect(page.locator('.duel-side').nth(0).locator('svg')).toHaveCount(1);
    await expect(page.locator('.duel-side').nth(1).locator('svg')).toHaveCount(1);
    expect(await page.locator('#dV0').innerHTML()).toBe(await page.locator('#dV1').innerHTML());
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`at 390 px (${scheme}), face to face: the picture fits each side and the top side is turned`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ colorScheme: scheme });
      await seedable(page);
      await open(page, '#/duel');
      await page.locator('#dFlip').check();
      const answer = await startSeededDuel(page, 'explorer');
      for (let k = 0; k < 8 && !(await page.locator('#dV0 svg').count()); k++) { const n = k + 1; await page.locator(`.duel-p1 .ar-choice[data-v="${await answer()}"]`).click(); await expect(page.locator('#dS0')).toHaveText(String(n)); }
      for (const p of [0, 1]) {
        const side = await page.locator(`.duel-p${p + 1}`).boundingBox(), pic = await page.locator(`#dV${p} svg`).boundingBox();
        expect(pic && side, `side ${p + 1} has a picture`).toBeTruthy();
        expect(pic!.x).toBeGreaterThanOrEqual(side!.x); expect(pic!.x + pic!.width).toBeLessThanOrEqual(side!.x + side!.width + 0.5);
        expect(pic!.y).toBeGreaterThanOrEqual(side!.y); expect(pic!.y + pic!.height).toBeLessThanOrEqual(side!.y + side!.height + 0.5);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('.duel-p1').evaluate(e => getComputedStyle(e).transform)).not.toBe('none');
      expect(await page.locator('.duel-p2').evaluate(e => getComputedStyle(e).transform)).toBe('none');
      await testInfo.attach(`duel-390-${scheme}`, { body: await page.locator('#dShell').screenshot(), contentType: 'image/png' });
    });
  }
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
  await page.clock.install();
  await open(page, '#/arena');
  await practiceRound(page);
  await endRound(page);
  await expect(page.locator('.ar-result')).toBeVisible();
  await practiceRound(page);
  await page.locator('.ar-key[data-k="1"]').click();
  await page.locator('.ar-key[data-k="2"]').click();
  await expect(page.locator('#arEntry')).toHaveText('12');
  expect((await cloudLog(page)).writes).toEqual([]);
  expect(issues.console, 'console errors').toEqual([]);
});

test.describe('explorer, second round', () => {
  test.use({ seedMode: 'explorer' });
  test('one tap answers exactly one question', async ({ page }) => {
    await page.clock.install();
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
  await page.clock.install();
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
  await seedable(page);
  await open(page, '#/duel');
  let answer = await startSeededDuel(page, 'challenger');
  for (let i = 0; i < 10; i++) { await page.locator(`.duel-p1 .ar-choice[data-v="${await answer()}"]`).click(); if (i < 9) await expect(page.locator('#dS0')).toHaveText(String(i + 1)); }
  await expect(page.locator('.ar-result')).toContainText('Player 1');
  answer = await startSeededDuel(page, 'challenger');
  await expect(page.locator('#dS0')).toHaveText('0');
  await page.locator(`.duel-p1 .ar-choice[data-v="${await answer()}"]`).click();
  await expect(page.locator('#dS0')).toHaveText('1');
  await expect(page.locator('#dS1')).toHaveText('0');
  expect(issues.console, 'console errors').toEqual([]);
});
