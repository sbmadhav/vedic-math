import { test, expect, open, heldClock } from './fixtures';
import type { Page } from '@playwright/test';

/* The wait indicator (openspec change muse-review-polish, feedback-wait spec, design D1; js/hold.js): while a round
   holds input for feedback or a teaching moment for more than 1.2 s, a thin bar under the held keypad shows the time
   passing, the live region says once that the next question is coming, and in an untimed round a hold of 2 s or more
   offers Next, which Enter also presses. Shorter holds (a right answer's pause) show nothing. Time is held by the test
   (heldClock), so every threshold is checked to the millisecond. The suite runs with reduced motion, so the bar is
   still and the time left shows as text; one test turns motion on and sees the bar fill. */

const tag = (page: Page) => page.locator('#stMain .star-tag');
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const sq = async (page: Page) => { const n = await base(page); return String(n * n); };
const hold = (page: Page) => page.locator('.fx-hold');

/** Misses the first question of Star 1 on Square numbers ending in 5 and lands in the replay: its 900 ms pause is a beat
    with no bar, and the hold has run for 100 ms when this returns */
async function missIntoReplay(page: Page) {
  await open(page, '#/star/sq5/1');
  await expect(tag(page)).toHaveText('Question 1 of 4');
  const n = await base(page);
  await page.keyboard.type('1'); await page.keyboard.press('Enter');
  await expect(page.locator('#stSay')).toContainText('Not quite');
  await page.clock.runFor(1000);
  await expect(page.locator('.star-replay')).toBeVisible();
  await expect(page.locator('.star-step')).toHaveCount(1);
  await expect(hold(page)).toHaveCount(0);
  return n;
}

test.describe('a Star', () => {
  test('a miss: the worked method holds the pad, the bar and Next show after 1.2 s, and Enter asks the rematch at once', async ({ page }) => {
    await heldClock(page);
    const n = await missIntoReplay(page);
    await page.clock.runFor(1000);
    await expect(hold(page)).toHaveCount(0); // 1.1 s into the hold: still nothing, a beat
    await page.clock.runFor(200);
    await expect(hold(page)).toHaveCount(1); // 1.3 s: the indicator, right under the number pad
    expect(await hold(page).evaluate(el => el.previousElementSibling?.id)).toBe('stPad');
    await expect(hold(page).locator('.fx-hold-next')).toHaveText('Next');
    await expect(hold(page).locator('.fx-hold-left')).toHaveText(/^Next question in \d s$/); // reduced motion: words, not a moving bar
    await expect(page.locator('#vmLive')).toContainText('Next question in a moment.');
    await expect(page.locator('.star-step')).toHaveCount(1); // the steps are still coming (every 2.5 s): the hold is real
    await page.keyboard.press('Enter');
    await expect(tag(page)).toHaveText('Rematch');
    await expect(page.locator('.star-replay')).toHaveCount(0);
    await expect(hold(page)).toHaveCount(0);
    expect(await base(page)).not.toBe(n);
    // Time passing later brings neither the replay nor the indicator back
    await page.clock.runFor(10_000);
    await expect(tag(page)).toHaveText('Rematch');
    await expect(hold(page)).toHaveCount(0);
  });

  test('the live region hears the wait once per hold, never per tick', async ({ page }) => {
    await heldClock(page);
    await missIntoReplay(page);
    await page.clock.runFor(1300);
    await expect(page.locator('#vmLive')).toHaveText('Next question in a moment.');
    await page.clock.runFor(1000); // a second passes: the text counts down, the live region is not written again
    await expect(hold(page).locator('.fx-hold-left')).toHaveText(/^Next question in \d s$/);
    await expect(page.locator('#vmLive')).toHaveText('Next question in a moment.');
    // The next step arrives and is announced instead, as before
    await page.clock.runFor(300);
    await expect(page.locator('.star-step')).toHaveCount(2);
    await expect(page.locator('#vmLive')).not.toHaveText('Next question in a moment.');
  });

  test('once the last step shows its own button, the indicator goes and the Player moves on themselves', async ({ page }) => {
    await heldClock(page);
    await missIntoReplay(page);
    await page.clock.runFor(1300);
    await expect(hold(page)).toHaveCount(1);
    await page.clock.runFor(5000); // every step is on screen: Try one like it takes over
    await expect(page.locator('#stRGo')).toHaveText('Try one like it');
    await expect(hold(page)).toHaveCount(0);
    await page.clock.runFor(5000);
    await expect(page.locator('.star-replay')).toBeVisible(); // nothing moves on by itself
  });

  test('a right answer: the pause before the next question shows no bar', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/star/sq5/1');
    await expect(tag(page)).toHaveText('Question 1 of 4');
    await page.keyboard.type(await sq(page)); await page.keyboard.press('Enter');
    await expect(page.locator('#stSay')).toContainText('+10 Sparks');
    await page.clock.runFor(1050);
    await expect(hold(page)).toHaveCount(0);
    await page.clock.runFor(200);
    await expect(tag(page)).toHaveText('Question 2 of 4');
    await expect(hold(page)).toHaveCount(0);
  });

  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' });
    test('the bar fills with one animation and the time is not written out', async ({ page }) => {
      await heldClock(page);
      await missIntoReplay(page);
      await page.clock.runFor(1300);
      await expect(hold(page)).toHaveCount(1);
      await expect(hold(page)).not.toHaveClass(/\bstill\b/);
      await expect(hold(page).locator('.fx-hold-left')).toBeHidden();
      expect(await page.evaluate(() => document.getAnimations().filter(a => (a.effect as KeyframeEffect | null)?.target?.matches('.fx-hold-bar i')).length)).toBe(1);
    });
  });

  test.describe('Calm', () => {
    test.use({ reducedMotion: 'no-preference' });
    test('with Calm on the bar holds still and the time left shows as text', async ({ page }) => {
      await page.addInitScript(() => { try { localStorage.setItem('vm.calm', '1'); } catch (e) { /* blocked */ } });
      await heldClock(page);
      await missIntoReplay(page);
      await page.clock.runFor(1300);
      await expect(hold(page)).toHaveClass(/\bstill\b/);
      await expect(hold(page).locator('.fx-hold-left')).toHaveText('Next question in 4 s');
      await expect(hold(page).locator('.fx-hold-bar')).toBeHidden();
      expect(await page.evaluate(() => document.getAnimations().filter(a => (a.effect as KeyframeEffect | null)?.target?.matches('.fx-hold-bar i')).length)).toBe(0);
      await page.clock.runFor(1000);
      await expect(hold(page).locator('.fx-hold-left')).toHaveText('Next question in 3 s');
    });
  });
});

test.describe('Discovery Locks', () => {
  // Level 2 (Predict) of the Twin Wall, with level 1 done: each question is a number times 11
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('vm.play.p1.locks', JSON.stringify({ eleven: { done: 1, hints: 0 } })); } catch (e) { /* blocked */ } });
  });
  const ask = async (page: Page) => parseInt((await page.locator('.lk-q-ask').textContent()) || '', 10);

  test('a miss holds the keys for 2.3 s: the bar and Next after 1.2 s, Next asks the next number at once, and a right answer shows no bar', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/dojo/locks/eleven/1');
    await expect(page.locator('.lk-say')).toContainText('Guess each answer');
    const x = await ask(page);
    await page.keyboard.type(String(x * 11 + 1)); await page.keyboard.press('Enter');
    await page.clock.runFor(200); // the machine runs (120 ms under reduced motion)
    await expect(page.locator('.lk-result .lk-cmp')).toBeVisible(); // the miss: your digits against the lock's
    await page.clock.runFor(1100);
    await expect(hold(page)).toHaveCount(0);
    await page.clock.runFor(200);
    await expect(hold(page)).toHaveCount(1);
    expect(await hold(page).evaluate(el => el.previousElementSibling?.className)).toBe('lk-pad');
    await expect(hold(page).locator('.fx-hold-next')).toHaveText('Next');
    await expect(page.locator('#vmLive')).toContainText('Next question in a moment.');
    await hold(page).locator('.fx-hold-next').click();
    await expect(page.locator('.lk-result')).toHaveText('');
    await expect(hold(page)).toHaveCount(0);
    expect(await ask(page)).not.toBe(x);
    // A right answer: 0.9 s, no indicator, then the next number
    const y = await ask(page);
    await page.keyboard.type(String(y * 11)); await page.keyboard.press('Enter');
    await page.clock.runFor(200);
    await expect(page.locator('.lk-result .lk-ok')).toBeVisible();
    await page.clock.runFor(850);
    await expect(hold(page)).toHaveCount(0);
    await page.clock.runFor(100);
    await expect(page.locator('.lk-result')).toHaveText('');
    await expect(hold(page)).toHaveCount(0);
  });
});

/* No round is timed and holds input for over 1.2 s today (the Arena and the tower show the next question at once), so
   the rule "timed rounds offer no Next" is checked on the helper itself, in the page, with skippable off */
test('a hold a round may not skip shows the bar and never Next, and Enter does nothing', async ({ page }) => {
  await heldClock(page);
  await open(page, '#/dojo');
  await page.evaluate(async () => {
    const { hold } = await e2eMod('hold');
    const el = document.createElement('div'); el.id = 'e2eHeld'; document.querySelector('#view')!.append(el);
    (window as any).__held = 'holding';
    hold(el, 3000, (early: boolean) => { (window as any).__held = early ? 'early' : 'time'; }, { signal: new AbortController().signal });
  });
  await page.clock.runFor(1300);
  await expect(page.locator('.fx-hold')).toHaveCount(1);
  await expect(page.locator('.fx-hold .fx-hold-next')).toHaveCount(0);
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => (window as any).__held)).toBe('holding');
  await page.clock.runFor(1800);
  await expect(page.locator('.fx-hold')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__held)).toBe('time');
});
