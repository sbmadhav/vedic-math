import { test, expect, APP, open } from './fixtures';

/* Dojo katas are seeded, so the test reads the expected answers from the app's own module
   (the same instance the page uses, through its import map). */

type P = { kind: string; answer: unknown; q: string };
const kataProblems = (page: import('@playwright/test').Page, trick: string, n: number) =>
  page.evaluate(async ([t, k]) => {
    const LV = await e2eMod('levels');
    return LV.kata(t, k).problems.map((p: P) => ({ kind: p.kind, answer: p.answer, q: p.q }));
  }, [trick, n] as const);

test('kata 1: a right answer and a wrong answer get the right feedback, and the kata finishes as done, with Sparks and no stars', async ({ page }) => {
  await open(page, '#/dojo');
  await page.locator('a.dojo-katas[href="#/katas/sq5"]').click();
  await expect(page.locator('#view h1')).toContainText('50 katas');
  // Kata 2 is locked until kata 1 is cleared
  await expect(page.locator('.lv-node').nth(1)).toHaveClass(/locked/);
  await page.locator('a.lv-node[href="#/kata/sq5/1"]').click();
  await expect(page.locator('#view h1')).toContainText('Kata 1');

  const probs = await kataProblems(page, 'sq5', 1);
  expect(probs.length).toBe(5);
  expect(probs.every(p => p.kind === 'num')).toBe(true);
  const say = page.locator('#kSay');

  for (let i = 0; i < probs.length; i++) {
    const wrong = i === 1;
    await page.locator('#kata .ans-in').fill(wrong ? '-12345' : String(probs[i].answer));
    await page.locator('#kGo').click();
    if (wrong) {
      await expect(say).toHaveClass(/\bno\b/);
      await expect(say).toContainText('Not this time. Answer:');
      await expect(say.locator('b').first()).toHaveText(String(probs[i].answer));
    } else {
      await expect(say).toHaveClass(/\bok\b/);
      await expect(say).toContainText(/Correct!|Clean!|Nailed it!|Yes!/);
    }
    await expect(page.locator('#kata .pr-score')).toHaveText(`${wrong || i > 1 ? i : i + 1}/5`);
    await expect(page.locator('#kGo')).toHaveText(i < probs.length - 1 ? 'Next' : 'Finish');
    await page.locator('#kGo').click();
  }
  // 4 of 5 right is 80%: the kata is done (no rating of its own), 4 x 5 + 10 = 30 Sparks, and kata 2 opens
  await expect(page.locator('.lv-result h2')).toHaveText('Kata done!');
  await expect(page.locator('.lv-result')).toContainText('4 of 5 right');
  await expect(page.locator('.lv-result')).toContainText('+30 Sparks');
  await expect(page.locator('#kata')).not.toContainText('★');
  await expect(page.locator('#kata .medal')).toHaveCount(0);
  await page.goto(`${APP}#/katas/sq5`);
  await expect(page.locator('a.lv-node[href="#/kata/sq5/1"]')).toHaveAttribute('aria-label', 'Kata 1, done');
  await expect(page.locator('a.lv-node[href="#/kata/sq5/2"]')).toBeVisible();
  await expect(page.locator('#view .mq-small').first()).toContainText('1 of 50 done');
  await page.goto(`${APP}#/dojo`);
  await expect(page.locator('a.dojo-katas[href="#/katas/sq5"]')).toContainText('Katas 1/50 done');
  await expect(page.locator('#view')).not.toContainText('★');
});

test('a skill practice question: wrong twice gives a hint, Show me reveals the steps', async ({ page }) => {
  await open(page, '#/skill/v-sq5');
  const box = page.locator('#practice');
  await box.locator('.ans-in').fill('-1');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toContainText('Not quite. Try once more.');
  await box.locator('.ans-in').fill('-2');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toContainText('Hint:');
  await box.locator('#prShow').click();
  await expect(box.locator('#prSol')).toBeVisible();
  await expect(box.locator('#prSol')).toContainText('Answer:');
  await expect(box.locator('#prCheck')).toHaveText('Next');
  await expect(box.locator('.pr-score')).toHaveText('0/1');
});

test('the trick animator steps through a worked example', async ({ page }) => {
  await open(page, '#/skill/v-sq5');
  await page.locator('#animRand').click();
  await expect(page.locator('#animNav')).toBeVisible();
  const pos = await page.locator('#animPos').textContent();
  const total = Number(pos!.split('/')[1]);
  expect(total).toBeGreaterThan(1);
  await page.locator('#animAll').click();
  await expect(page.locator('#animPos')).toHaveText(`${total} / ${total}`);
  await expect(page.locator('#animBoard .anim-step')).toHaveCount(total);
});

test('leaving a kata mid-question and coming back starts a fresh kata', async ({ page }) => {
  await open(page, '#/kata/sq5/1');
  const probs = await kataProblems(page, 'sq5', 1);
  await page.locator('#kata .ans-in').fill(String(probs[0].answer));
  await page.locator('#kGo').click();
  await expect(page.locator('#kata .pr-score')).toHaveText('1/5');
  await page.locator('#kGo').click();
  await expect(page.locator('.kata-prog i').nth(1)).toHaveClass('cur');
  await page.evaluate(() => { location.hash = '#/dojo'; });
  await expect(page.locator('#view h1')).toContainText('black belt');
  await page.evaluate(() => { location.hash = '#/kata/sq5/1'; });
  await expect(page.locator('#kata .pr-score')).toHaveText('0/5');
  await expect(page.locator('.kata-prog i').first()).toHaveClass('cur');
  await expect(page.locator('#kGo')).toHaveText('Check');
});

/* Explorer is not offered Stars (star-round spec), so its Dojo is an honest Trick library (openspec explorer-belts):
   the Tricks in their seven belt groups, no Star counts or belt progress, one line that says where belts live, and
   no Sutras button (Sutras are not in Explorer's menu). Challenger keeps the counts. */
test.describe('Dojo in Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('shows the seven groups of tricks, no Star or belt counts, and says belts and Stars come with Challenger and Pro', async ({ page }) => {
    await open(page, '#/dojo');
    await expect(page.locator('.dojo-belt')).toHaveCount(7);
    await expect(page.locator('.dojo-node')).toHaveCount(21);
    await expect(page.locator('.md-lede')).toContainText('Belts and Stars come with Challenger and Pro.');
    await expect(page.locator('#view')).not.toContainText(/belts earned/);
    await expect(page.locator('#view')).not.toContainText(/\d\/9 Stars/);
    await expect(page.locator('#view')).not.toContainText('Light all 9 Stars');
    await expect(page.locator('.dojo-star')).toHaveCount(0);
    await expect(page.locator('#view a[href="#/sutras"]')).toHaveCount(0);
    await expect(page.locator('#view a[href="#/arena"]')).toHaveCount(1);
  });
  test.describe('with a White belt kept from Challenger', () => {
    test.use({ seedProgress: { v: 3, skills: {}, sparks: 0, days: {}, best: {}, last: null, grade: null, badges: { 'belt-white': 1700000000000 }, counts: {}, seen: {}, belts: { white: 1700000000000 } } });
    test('still shows the belt as earned', async ({ page }) => {
      await open(page, '#/dojo');
      await expect(page.locator('.belt-chip.on')).toHaveCount(1);
      await expect(page.locator('.belt-chip.on')).toHaveText(/White belt/);
      await expect(page.locator('.dojo-belt.earned')).toHaveCount(1);
      await expect(page.locator('#view')).not.toContainText(/belts earned/);
    });
  });
});

test('Dojo in Challenger keeps the Star counts and the belts earned line', async ({ page }) => {
  await open(page, '#/dojo');
  await expect(page.locator('.md-lede')).toContainText('Light all 9 Stars');
  await expect(page.locator('#view')).toContainText('0 of 7 belts earned.');
  await expect(page.locator('.dojo-h small').first()).toHaveText('0/9 Stars');
  await expect(page.locator('#view a[href="#/sutras"]')).toHaveCount(1);
});
