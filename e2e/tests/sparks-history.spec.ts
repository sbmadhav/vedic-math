import { test, expect, open, APP, type Page } from './fixtures';

/* The Sparks history and the messages for every award (openspec change muse-review-polish, design D4; sparks spec
   "A Sparks history on the device" and "Every Sparks award is shown"): Recent Sparks on Me lists the last awards
   newest first with what for and when; watching a trick to its last step and finishing an experience each toast
   their Sparks; the award that reaches the day's 150 play Sparks says so, once. Nothing here is posted anywhere. */

const rows = (page: Page) => page.locator('.me-log .sparks-log li');
const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('a new Player sees an empty Recent Sparks card on Me', async ({ page }) => {
  await open(page, '#/me');
  await expect(page.locator('.me-log h2')).toHaveText('Recent Sparks');
  await expect(page.locator('.me-log')).toContainText('Nothing yet');
  await expect(rows(page)).toHaveCount(0);
});

test('after a kata and a watched trick, Recent Sparks lists them newest first with what for and when', async ({ page }) => {
  // The kata, answered in one box (the answer slots are the default for a two-part answer)
  await page.addInitScript(() => { try { localStorage.setItem('vm.split', 'one'); } catch (e) { /* blocked */ } });
  await open(page, '#/kata/sq5/1');
  const answers: number[] = await page.evaluate(async () => (await e2eMod('levels')).kata('sq5', 1).problems.map((p: { answer: number }) => p.answer));
  expect(answers.length).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < answers.length; i++) {
    await expect(page.locator('#kGo')).toHaveText('Check');
    await page.locator('#kata .ans-in').fill(String(answers[i]));
    await page.locator('#kGo').click();
    await expect(page.locator('#kSay')).toHaveClass(/\bok\b/);
    await page.locator('#kGo').click();
  }
  await expect(page.locator('#kata .fx-sparks')).toHaveText(/^\+\d+ Sparks$/);
  const kata = Number((await page.locator('#kata .fx-sparks').textContent())!.match(/\d+/)![0]);
  expect(kata).toBeGreaterThan(0);

  // The trick, watched to its last step: the award is said once
  await open(page, '#/skill/v-sq5');
  await page.locator('#animRand').click();
  await expect(page.locator('#animNav')).toBeVisible();
  await page.locator('#animAll').click();
  const toast = page.locator('.fx-toast', { hasText: '+5 Sparks' });
  await expect(toast).toHaveCount(1);
  await expect(toast).toContainText('Trick watched');
  await page.locator('#animRand').click();
  await page.locator('#animAll').click();
  await expect(page.locator('.fx-toast', { hasText: '+5 Sparks' })).toHaveCount(1, { timeout: 1000 }); // once per Trick

  await open(page, '#/me');
  await expect(rows(page)).toHaveCount(2);
  await expect(rows(page).nth(0)).toHaveText('Watched a speed trick +5 just now');
  await expect(rows(page).nth(1)).toHaveText(`Kata +${kata} just now`);
  await expect(rows(page).nth(0).locator('time')).toHaveAttribute('datetime', /^\d{4}-\d\d-\d\dT/);
  await expect(page.locator('.me-log')).toContainText('never sent anywhere');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}'));
  expect(saved.sparksLog.map((e: { why: string; n: number }) => [e.why, e.n])).toEqual([['trick', 5], ['kata', kata]]);
});

test.describe('fifty kept', () => {
  const log = Array.from({ length: 60 }, (_, i) => ({ n: 10 + i, why: 'kata', at: 1_760_000_000_000 + i * 60_000 })).reverse();
  test.use({ seedProgress: { v: 3, skills: {}, sparks: 3000, sparksLog: log } });
  test('a Player who earned Sparks 60 times sees the newest 50, the first eight open and the rest behind Show all', async ({ page }) => {
    await open(page, '#/me');
    await expect(rows(page)).toHaveCount(50);
    await expect(rows(page).first()).toContainText('Kata +69');
    await expect(rows(page).last()).toContainText('Kata +20');
    const more = page.locator('.me-log-more');
    await expect(more.locator('summary')).toHaveText('Show all 50');
    await expect(more.locator('li')).toHaveCount(42);
    await expect(more.locator('li').first()).toBeHidden();
    await more.locator('summary').click();
    await expect(more.locator('li').first()).toBeVisible();
  });
});

/* Twin Wall level 1: feed three numbers, then predict until the level clears (each answer is the number times 11) */
async function clearLevel(page: Page, feeds: number) {
  for (let i = 0; i < feeds; i++) {
    const offer = page.locator('.lk-offer:not([disabled])').first();
    await expect(offer).toBeVisible();
    await expect(page.locator('.lk-machine')).not.toHaveClass(/is-running/);
    await offer.click();
    await expect(page.locator('.lk-tape-list li')).toHaveCount(i + 1);
  }
  const clear = page.locator('.lk-clear');
  for (let n = 0; n < 8 && !(await clear.isVisible()); n++) {
    const ask = page.locator('.lk-q-ask');
    await expect(ask.or(clear).first()).toBeVisible();
    if (await clear.isVisible()) break;
    await expect(page.locator('.lk-result')).toHaveText('');
    const x = parseInt((await ask.textContent()) || '', 10);
    await page.keyboard.type(String(x * 11));
    await page.keyboard.press('Enter');
    await expect(page.locator('.lk-result .lk-ok').or(clear).first()).toBeVisible();
    await expect(page.locator('.lk-result .lk-ok')).toHaveCount(0);
  }
  await expect(clear).toBeVisible();
}

test.describe('the daily play cap', () => {
  test.use({ seedProgress: { v: 3, skills: {}, sparks: 500, counts: { ['playSparks:' + ymd()]: 145 } } });
  test('with 145 play Sparks today, clearing a lock level says +5 Sparks and the cap, once; the next clear says nothing', async ({ page }) => {
    await open(page, '#/dojo/locks/eleven');
    await clearLevel(page, 3);
    const sparks = page.locator('.fx-toast', { hasText: 'Sparks' });
    await expect(sparks).toHaveCount(2);
    await expect(sparks.nth(0)).toHaveText('Discovery Locks +5 Sparks');
    await expect(sparks.nth(1)).toHaveText("That is today's 150 play Sparks. More tomorrow.");
    await expect(page.locator('.fx-toast')).toHaveCount(0, { timeout: 8000 });
    // Level 2: another clear, nothing more today and the cap is not said again
    await page.locator('.lk-next').click();
    await expect(page.locator('.lk-say')).toContainText('Guess each answer');
    await clearLevel(page, 0);
    await page.waitForTimeout(600);
    await expect(page.locator('.fx-toast')).toHaveCount(0);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}'));
    const key = Object.keys(saved.counts).find((k: string) => k.startsWith('playSparks:'))!;
    expect(saved.counts[key], 'the day stays at its cap').toBe(150);
    expect(saved.sparks).toBe(505);
    expect(saved.sparksLog[0]).toMatchObject({ why: 'play:locks', n: 5 });
    await page.goto(`${APP}#/me`);
    await expect(rows(page).first()).toHaveText('Discovery Locks +5 just now');
  });
});
