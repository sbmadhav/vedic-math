import { test, expect, open } from '../fixtures';
import { partsOf, questionVals } from '../split-kit';

/* split-answer spec, Requirement "The parts in the Star round's boxes" (openspec working-memory-scaffolds):
   - Scenario "Boxes in two parts": in a Challenger Star round a bar separates the left part's boxes from the right
     part's, and the left part's boxes are marked held once all filled. Typing and checking are unchanged; a Pro
     Player's Star round is unchanged. */

test('a Challenger Star round of squares ending in 5: a bar between the parts, the left part held once typed', async ({ page }) => {
  await open(page, '#/star/sq5/1');
  await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
  const [l, r] = await partsOf(page, 'sq5', await questionVals(page.locator('#stQ')));
  const boxes = page.locator('#stBoxes span');
  await expect(boxes).toHaveCount(l.length + r.length);
  // The bar sits on the first box of the right part
  await expect(page.locator('#stBoxes span.cut')).toHaveCount(1);
  expect(await boxes.evaluateAll(bs => bs.findIndex(b => b.classList.contains('cut')))).toBe(l.length);
  await expect(page.locator('#stBoxes span.held')).toHaveCount(0);
  await page.keyboard.type(l);
  await expect(page.locator('#stBoxes span.held')).toHaveCount(l.length);
  await page.keyboard.type(r);
  await page.keyboard.press('Enter');
  await expect(page.locator('#stSay')).toContainText('+10 Sparks');
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });
  test('a Pro Star round keeps its plain answer, with no boxes', async ({ page }) => {
    await open(page, '#/star/sq5/1');
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await expect(page.locator('#stBoxes')).toHaveCount(0);
    await expect(page.locator('#stOut.star-plain')).toBeAttached();
  });
});
