import { test, expect, open } from '../fixtures';
import { READY, starTag, starStory, sq5Answer, enter } from '../word-kit';

/* word-problems spec (change word-problems), Requirement "Word problems in Star rounds". */

test.use({ seedMode: 'challenger', seedProgress: READY });

test('A Challenger\'s Star: question 3 of 4 is a Word problem about a square, questions 1, 2 and 4 are bare', async ({ page }) => {
  await open(page, '#/star/sq5/1');
  for (let i = 1; i <= 4; i++) {
    await expect(starTag(page)).toHaveText(`Question ${i} of 4`);
    if (i === 3) { await expect(starStory(page)).toHaveText('Word problem'); await expect(page.locator('#stQ')).toContainText('A square garden'); }
    else { await expect(starStory(page)).toHaveCount(0); await expect(page.locator('#stQ sup')).toHaveText('2'); }
    await enter(page, await sq5Answer(page));
    await expect(page.locator('#stSay')).toContainText('+10 Sparks');
  }
  await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
});

test('A Trick with no story: all four questions of Divide by 9 with running sums are bare', async ({ page }) => {
  await open(page, '#/star/div9/1');
  for (let i = 1; i <= 4; i++) {
    await expect(starTag(page)).toHaveText(`Question ${i} of 4`);
    await expect(starStory(page)).toHaveCount(0);
    const n = Number(((await page.locator('#stQ').textContent()) || '').match(/^(\d+)/)![1]);
    await page.keyboard.type(String(Math.floor(n / 9)));
    await page.locator('.star-field[data-f="1"]').click();
    await page.keyboard.type(String(n % 9));
    await page.locator('#stPad [data-k="go"]').click();
    await expect(page.locator('#stSay')).toContainText('+10 Sparks');
  }
});
