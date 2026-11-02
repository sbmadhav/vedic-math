import { test, expect, APP, open, heldClock, cloudLog, type Page, atRoute } from './fixtures';

/* The Hook (openspec hook, from hook-first-star): a new Challenger or Pro Player's first Star opens with a dare to beat
   the calculator (one key every 0.45 s), a reveal of the Trick within 20 s, then the round dealt easiest first. Returning
   Players, Explorer and Tricks without a dare get none; once seen or skipped it never plays again. Under a held clock
   the calculator's keys arrive only as the test runs time forward (page.clock.runFor: an interval fires every tick it is
   due, where fastForward fires it once). Analytics is stubbed so events can be read back. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}'));
const dare = (page: Page) => page.locator('#stMain .hook');
const screen = (page: Page) => page.locator('#hkScreen');
const tag = (page: Page) => page.locator('#stMain .star-tag');
/** The right answer of the from9 question on screen: 1,000 − 357 */
async function from9Answer(page: Page) {
  const [a, b] = (await page.locator('#stQ').innerText()).match(/[\d,]+/g)!.map(x => Number(x.replace(/,/g, '')));
  return String(a - b);
}
/** The live region's history: every text it is given, captured as it changes */
async function watchLive(page: Page) {
  await page.evaluate(() => {
    const w = window as any; w.__live = [];
    const el = document.getElementById('vmLive')!;
    new MutationObserver(() => { if (el.textContent) w.__live.push(el.textContent); }).observe(el, { childList: true, characterData: true, subtree: true });
  });
}
const live = (page: Page): Promise<string[]> => page.evaluate(() => (window as any).__live || []);

test.use({ hookSeen: false }); /* the seeded Player has not seen the Hook (the suite's other specs seed it as seen) */
test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test.describe('a new Challenger', () => {
  test('Star 1 of from9: the dare appears, the calculator types 9 keys in 4.05 s and wins with 643; the reveal ends by 20 s and the round follows in Kata order', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/star/from9/1');
    await expect(dare(page)).toBeVisible();
    await expect(page.locator('#stMain .star-tag--dare')).toHaveText('Beat the calculator');
    await expect(page.locator('#stQ')).toHaveText('1,000 − 357 = ?');
    expect((await saved(page)).hookSeen).toBeGreaterThan(0);
    await page.clock.runFor(4050);
    await expect(screen(page)).toHaveText('643');
    await expect(page.locator('#hkKeys')).toHaveText('1 0 0 0 − 3 5 7 =');
    await expect(page.locator('#stSay')).toContainText('The calculator won this time');
    await page.locator('#hkShow').click();
    await expect(page.locator('.hook-reveal')).toBeVisible();
    await expect(page.locator('.star-step').first()).toContainText('write the digits of 357');
    await page.clock.runFor(20_000);
    await expect(tag(page)).toHaveText('Question 1 of 4');
    // Nothing was sent during the Hook but the Star's route view (placement task 4.6)
    expect((await events(page)).filter(e => !e.startsWith('math/view/'))).toEqual([]);
    expect((await cloudLog(page)).writes).toEqual([]);
    const katas: number[] = [];
    for (let i = 1; i <= 4; i++) {
      await expect(tag(page)).toHaveText(`Question ${i} of 4`);
      katas.push(Number(await page.locator('#stQ').getAttribute('data-kata')));
      await page.keyboard.type(await from9Answer(page)); await page.keyboard.press('Enter');
      await expect(page.locator('#stSay')).toContainText('+10 Sparks');
      await page.clock.runFor(1200);
    }
    expect(katas).toEqual(katas.slice().sort((a, b) => a - b));
    expect(katas.every(k => k >= 1)).toBe(true);
    // The round's own events follow (its answers, the first win, the lit Star), none from the Hook
    const ev = (await events(page)).filter(e => !e.startsWith('math/view/'));
    expect(ev.filter(e => e.startsWith('math/q_answered/star/right'))).toHaveLength(4);
    expect(ev.filter(e => !/^math\/(q_answered\/star\/right|first_win\/|star\/lit\/from9)/.test(e))).toEqual([]);
    expect((await cloudLog(page)).writes).toEqual([]);
  });

  test('typing the answer at 2 s beats the calculator; a wrong answer only clears the entry', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/star/from9/1');
    await expect(dare(page)).toBeVisible();
    await page.clock.runFor(900);
    await page.keyboard.type('1'); await page.keyboard.press('Enter');
    await expect(page.locator('#stSay')).toContainText('Not yet');
    await expect(page.locator('#stOut')).toHaveText('');
    await page.clock.runFor(1100);
    await page.keyboard.type('643'); await page.keyboard.press('Enter');
    await expect(page.locator('#stSay')).toContainText('You beat the calculator');
    await page.clock.runFor(3000);
    await expect(page.locator('.hook-reveal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tag(page)).toHaveText('Question 1 of 4');
  });

  test('Skip on the dare starts the round, and reopening a Star shows no Hook', async ({ page }) => {
    await open(page, '#/star/from9/1');
    await expect(dare(page)).toBeVisible();
    await page.locator('#hkSkip').click();
    await expect(tag(page)).toHaveText('Question 1 of 4');
    await open(page, '#/star/sq5/1');
    await expect(tag(page)).toHaveText('Question 1 of 4');
    await expect(dare(page)).toHaveCount(0);
  });

  test('Skip on the reveal (after the race) starts the round, and reopening the Star shows no Hook', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/star/from9/1');
    await expect(dare(page)).toBeVisible();
    await page.clock.runFor(4050);
    await expect(screen(page)).toHaveText('643');
    await page.clock.runFor(3000);
    await expect(page.locator('.hook-reveal')).toBeVisible();
    await page.locator('#stRSkip').click();
    await expect(tag(page)).toHaveText('Question 1 of 4');
    await page.goto(`${APP}#/star/from9/1`);
    await expect(tag(page)).toHaveText('Question 1 of 4');
    await expect(dare(page)).toHaveCount(0);
  });

  test('leaving the Star mid-race stops the calculator, hookSeen stays, and the Star reopens without the Hook', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/star/from9/1');
    await expect(dare(page)).toBeVisible();
    await page.clock.runFor(900);
    await page.locator('#stExit').click(); /* Back to the Dojo: the Star was opened by link */
    await expect(page.locator('#view h1')).toHaveText(/black belt/);
    await page.clock.runFor(5000);
    await expect(page.locator('#hkKeys')).toHaveCount(0);
    expect((await saved(page)).hookSeen).toBeGreaterThan(0);
    await open(page, '#/star/from9/1');
    await expect(tag(page)).toHaveText('Question 1 of 4');
  });

  test('a first Star on zero-sum (no dare) starts the round and marks the Hook seen, so from9 then gets none either', async ({ page }) => {
    await open(page, '#/star/zero-sum/1');
    await expect(tag(page)).toHaveText('Question 1 of 4');
    expect((await saved(page)).hookSeen).toBeGreaterThan(0);
    await open(page, '#/star/from9/1');
    await expect(tag(page)).toHaveText('Question 1 of 4');
    await expect(dare(page)).toHaveCount(0);
  });
});

test.describe('a Challenger with one answered question', () => {
  test.use({ seedProgress: { v: 3, skills: { '3-mult': { n: 1, c: 1, m: .35, streak: 1, last: 1 } }, counts: { answers: 1 } } });
  test('gets no Hook', async ({ page }) => {
    await open(page, '#/star/from9/1');
    await expect(tag(page)).toHaveText('Question 1 of 4');
    await expect(dare(page)).toHaveCount(0);
  });
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('a new Explorer Player opening a Star by link gets no Hook', async ({ page }) => {
    await open(page, '#/star/from9/1');
    await expect(tag(page)).toHaveText('Question 1 of 4');
    await expect(dare(page)).toHaveCount(0);
  });
});

test.describe('after Placement', () => {
  test.describe('a new Challenger placed at grade 5', () => {
    test.use({ seedPlayer: { placedBelt: 'yellow' }, seedProgress: { v: 3, skills: {}, placement: { grade: '5', steps: 3, at: 1_700_000_000_000 }, placementCard: 'done' } });
    test('opening the suggested Star (sq5 Star 1) gets the dare 85²; the calculator needs 6 keys', async ({ page }) => {
      await heldClock(page);
      await open(page);
      await page.locator('.dojo-card a.md-btn--primary').click();
      await expect(page).toHaveURL(atRoute('#/star/sq5/1'));
      await expect(dare(page)).toBeVisible();
      await expect(page.locator('#stQ')).toHaveText('852 = ?');
      await page.clock.runFor(2700);
      await expect(screen(page)).toHaveText('7225');
      await expect(page.locator('#hkKeys')).toHaveText('8 5 × 8 5 =');
    });
  });
  test.describe('a new Pro placed at grade 8', () => {
    test.use({ seedMode: 'pro', seedPlayer: { placedBelt: 'purple' }, seedProgress: { v: 3, skills: {}, placement: { grade: '8', steps: 1, at: 1_700_000_000_000 }, placementCard: 'done' } });
    test('the suggested purple belt Star has no dare, and from9 then gets none either', async ({ page }) => {
      await open(page);
      await page.locator('.sutra-door a.md-btn--primary').click();
      await expect(page).toHaveURL(atRoute('#/star/sqroot/1'));
      await expect(tag(page)).toHaveText('Question 1 of 4');
      await expect(dare(page)).toHaveCount(0);
      await open(page, '#/star/from9/1');
      await expect(tag(page)).toHaveText('Question 1 of 4');
      await expect(dare(page)).toHaveCount(0);
    });
  });
});

test('after a finished Try a trick, Play this Star on Home still opens with the Hook (a Try a trick records no answer)', async ({ page }) => {
  await open(page, '#/try');
  await page.locator('#tyStart').click();
  for (const a of [625, 2025, 4225]) { await page.locator('#tyIn').fill(String(a)); await page.keyboard.press('Enter'); await page.locator('#tyNext').click(); }
  await page.locator('#tyHome').click();
  await expect(page.locator('h1.home-h')).toBeVisible();
  expect((await saved(page)).sparks).toBeGreaterThan(0);
  await page.locator('.dojo-card a.md-btn--primary').click();
  await expect(dare(page)).toBeVisible();
});

/* Calm, motion and screen readers (placement task 4.4) */
test.describe('Calm', () => {
  test.use({ seedPlayer: { placedBelt: 'yellow' } });
  test('with Calm on the dare says the calculator needs 2.7 seconds for 85², no key appears after 5 s, and the reveal follows the answer', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('vm.calm', '1'); });
    await heldClock(page);
    await open(page, '#/star/sq5/1');
    await expect(dare(page)).toBeVisible();
    await expect(page.locator('#hkNote')).toContainText('2.7 seconds');
    await page.clock.runFor(5000);
    await expect(page.locator('#hkKeys')).toHaveText('');
    await expect(page.locator('#stSay')).not.toContainText('calculator won');
    await page.keyboard.type('7225'); await page.keyboard.press('Enter');
    await expect(page.locator('#stSay')).toContainText('You beat the calculator');
    await page.clock.runFor(3000);
    await expect(page.locator('.hook-reveal')).toBeVisible();
  });
});

test.describe('reduced motion and the live region', () => {
  test.use({ reducedMotion: 'reduce' });
  test('nothing animates during the race; the live region hears the dare and the outcome, never a key', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/star/from9/1');
    await expect(dare(page)).toBeVisible();
    await watchLive(page);
    await page.clock.runFor(1350);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.clock.runFor(2700);
    await expect(page.locator('#stSay')).toContainText('The calculator won this time');
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.clock.runFor(100); /* the live region speaks 50 ms after an announcement */
    const heard = (await live(page)).join(' | ');
    expect(heard).toContain('The calculator won this time');
    expect(heard).toContain('Beat the calculator: 1,000 - 357 = ?');
    expect(heard).not.toMatch(/\b1 0 0 0\b|\b3 5 7\b/);
  });
});
