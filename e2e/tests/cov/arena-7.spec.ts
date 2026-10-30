import { test, expect, open, cloudLog, appErrors } from '../fixtures';
import { roundAnswer, startWordRound, watchRoundStories } from '../word-kit';

/* arena spec (change word-problems-more), Requirement "A Word problems round in the Arena": one test per scenario.
   It is Practice: nothing goes to Firestore or a Board, and the Arena Rating stays. The fixtures' fake SDK records
   any write; nothing here reaches a live backend. */

const boardWrites = (writes: { path: string }[]) => writes.filter(w => /^boards\//.test(w.path));

test('A Challenger Word problems round: no clock, a Word problem each time, 10 questions, and nothing posted', async ({ page, issues }) => {
  await open(page, '#/arena');
  await startWordRound(page);
  await expect(page.locator('#arTime')).toHaveCount(0);
  await expect(page.locator('.ar-bar')).toHaveCount(0);
  for (let k = 1; k <= 10; k++) {
    await expect(page.locator('#arNum')).toHaveText(`${k}/10`);
    await expect(page.locator('#arStory'), `question ${k}`).toHaveText('Word problem');
    await expect(page.locator('#arQ')).toHaveClass(/ar-q--story/);
    await page.keyboard.press('1');
    await expect(page.locator('#arEntry')).toHaveText('1');
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('.play-shell .ar-result')).toContainText('Practice rounds do not count for the leaderboard.');
  await expect(page.locator('#arFinish')).toHaveCount(0);
  expect(boardWrites((await cloudLog(page)).writes)).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.board') || '[]'))).toEqual([]);
  expect(appErrors(issues), 'console errors').toEqual([]);
});

test.describe('Arena Rating 12', () => {
  test.use({ seedProgress: { v: 3, ratings: { 'arena:challenger': 12 } } });
  test('The Arena Rating stays: every question right, and the Rating is still 12', async ({ page }) => {
    await open(page, '#/arena');
    await expect(page.locator('#arRating')).toHaveAttribute('data-rating', '12');
    await watchRoundStories(page);
    await startWordRound(page);
    for (let k = 1; k <= 10; k++) {
      await expect(page.locator('#arNum')).toHaveText(`${k}/10`);
      await page.keyboard.type(await roundAnswer(page));
      await page.keyboard.press('Enter');
    }
    await expect(page.locator('.play-shell .ar-result')).toContainText('10 right · 0 missed');
    await expect(page.locator('.play-shell .ar-result')).not.toContainText('Arena Rating');
    await page.locator('#arDone').click();
    await expect(page.locator('#arRating')).toHaveAttribute('data-rating', '12');
    expect(await page.evaluate(async () => (await e2eMod('store')).rating('arena:challenger'))).toBe(12);
  });
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Story time for an Explorer: a picture story each time, with answer buttons to tap', async ({ page }) => {
    await open(page, '#/arena');
    await startWordRound(page, 'Story time');
    for (let k = 1; k <= 3; k++) {
      await expect(page.locator('#arNum')).toHaveText(`${k}/10`);
      await expect(page.locator('#arStory')).toHaveText('Story time');
      const pic = await page.locator('#arViz svg').first().boundingBox(); // a picture that is drawn, not 0 px wide
      expect(pic && pic.width > 20 && pic.height > 20, `question ${k}: a picture`).toBe(true);
      await expect(page.locator('.ar-choice')).toHaveCount(4);
      await expect(page.locator('.ar-pad')).toHaveCount(0);
      await page.locator('.ar-choice').first().click();
    }
  });
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });
  test('A Pro Word problems round: multi-step stories with whole-number answers typed on the keypad', async ({ page }) => {
    await open(page, '#/arena');
    await watchRoundStories(page);
    await startWordRound(page);
    for (let k = 1; k <= 4; k++) {
      await expect(page.locator('#arNum')).toHaveText(`${k}/10`);
      await expect(page.locator('#arStory')).toHaveText('Word problem');
      const answer = await roundAnswer(page);
      expect(answer).toMatch(/^\d+$/);
      for (const d of answer) await page.locator(`.ar-key[data-k="${d}"]`).click();
      await expect(page.locator('#arEntry')).toHaveText(answer);
      await page.locator('#arForm button').click();
      await expect(page.locator('#arScore')).not.toHaveText('0');
    }
    // Many more Pro deals: every one works out in two or more steps and has a whole-number answer
    const deals = await page.evaluate(async () => {
      const S = (await e2eMod('story-plan')).storiesNow();
      return Array.from({ length: 300 }, () => S.roundStory('pro')).map((p: any) => ({ id: p.story.id, steps: p.steps.length, answer: p.answer }));
    });
    for (const d of deals) {
      expect(d.steps, d.id).toBeGreaterThanOrEqual(2);
      expect(Number.isInteger(d.answer), d.id).toBe(true);
    }
  });
});
