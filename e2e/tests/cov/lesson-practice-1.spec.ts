import { test, expect, open, atRoute } from '../fixtures';

/* lesson-practice spec (openspec change play-nav-by-mode), Requirements "A lesson ends in its practice", "Try it yourself
   starts a round on the Trick" and "A Star from a Deep dive goes back to it": one test per scenario. */

test.describe('a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('On a phone: Practice it now brings the Skill\'s practice card on screen with its answer box focused', async ({ page }) => {
    await open(page, '#/skill/3-mult');
    await expect(page.locator('#practice')).not.toBeInViewport();
    await page.locator('#practiceNow').click();
    await expect(page.locator('#practice')).toBeInViewport();
    await expect(page.locator('#practice .ans-in').first()).toBeFocused();
  });
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Explorer: a Skill\'s lesson ends with Now you try', async ({ page }) => {
    await open(page, '#/skill/k-add10');
    await expect(page.locator('.mq-lesson #practiceNow')).toHaveText(/Now you try/);
  });
  test('Explorer: a Trick under Try it yourself opens the Trick page with its practice, and no Star starts', async ({ page }) => {
    await open(page, '#/sutras/s1');
    await page.locator('dialog.sutra-modal .sd-try li a.md-btn--primary').first().click();
    await expect(page).toHaveURL(atRoute('#/skill/v-sq5'));
    await expect(page.locator('#practice .pr-q')).toBeVisible();
    await expect(page.locator('.play-shell')).toHaveCount(0);
  });
});

test('Challenger: with no Stars lit, the first Trick of Ekādhikena Pūrveṇa starts Star 1 of squares ending in 5', async ({ page }) => {
  await open(page, '#/sutras/s1');
  await page.locator('dialog.sutra-modal .sd-try li a.md-btn--primary').first().click();
  await expect(page).toHaveURL(atRoute('#/star/sq5/1'));
  await expect(page.locator('.play-shell')).toBeVisible();
});

test('Back to the sutra: leaving that Star with Back opens the Deep dive again, and closing it shows the Sutras page', async ({ page }) => {
  await open(page, '#/sutras/s1');
  await page.locator('dialog.sutra-modal .sd-try li a.md-btn--primary').first().click();
  await expect(page.locator('.play-shell')).toBeVisible();
  await page.locator('#stExit').click();
  const dlg = page.locator('dialog.sutra-modal');
  await expect(dlg.locator('#sdTitle')).toHaveText('Ekādhikena Pūrveṇa');
  await dlg.locator('.sd-x').click();
  await expect(dlg).toBeHidden();
  await expect(page).toHaveURL(atRoute('#/sutras'));
  await expect(page.locator('.play-shell')).toHaveCount(0);
});
