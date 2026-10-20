import AxeBuilder from '@axe-core/playwright';
import { test, expect, APP, open, appErrors } from './fixtures';

/* Try a trick teaches before it asks (openspec try-trick-teaches): the trial Star opens on its Trick worked once on
   a problem the round does not deal, with one Start the Star button; nowhere else does a Star open on that card. */
type Page = import('@playwright/test').Page;
/* "1,000 − 387 = ?" (or the worked example's "100 − 84"): the subtraction's result */
const diff = (text: string) => { const m = text.replace(/,/g, '').match(/(\d+)\s*[−-]\s*(\d+)/)!; return String(+m[1] - +m[2]); };
async function answer(page: Page) {
  const q = await page.locator('#stQ').innerText();
  for (const ch of diff(q)) await page.locator(`.star-key[data-k="${ch}"]`).click();
  await page.locator('.star-key[data-k="go"]').click();
  return q.replace(/\s+/g, ' ').trim();
}

test.describe('a new visitor', () => {
  test.use({ seedMode: null });

  for (const scheme of ['light', 'dark'] as const) {
    test(`the worked example: title, rule, steps ending in the result, Start focused, no pad, accessible, no sideways scroll at 390 px (${scheme})`, async ({ page, issues }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(APP);
      await page.locator('#tryBtn').click();
      await expect(page).toHaveURL(/#\/star\/from9\/1$/);
      const card = page.locator('.star-intro');
      await expect(card.locator('.star-tag')).toHaveText('Learn the trick');
      await expect(card.locator('#stIntroH')).toHaveText('Subtract from 100, 1000, 10000');
      await expect(card.locator('.star-intro-idea')).toContainText('Subtract every digit from 9, except the last one, which you subtract from 10');
      const ex = await card.locator('.star-intro-k').innerText();
      expect(ex).toMatch(/^Worked example: 100 − \d\d$/);
      await expect(card.locator('.star-step')).toHaveCount(3);
      await expect(card.locator('.star-step').last()).toContainText(`= ${diff(ex)}.`);
      expect(await card.locator('.star-step').first().evaluate(e => getComputedStyle(e).animationName)).toBe('none');
      await expect(page.locator('#stStart')).toBeFocused();
      await expect(page.locator('#stStart')).toBeInViewport();
      await expect(page.locator('#stPad')).toBeHidden();
      await expect(page.locator('#stDare')).toBeHidden();
      await expect(page.locator('#vmLive')).toContainText('Learn the trick first: Subtract from 100, 1000, 10000. A worked example, then Start the Star.');
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      expect(appErrors(issues)).toEqual([]);
    });
  }

  test('Start the Star deals four questions, none of them (nor the Dare) the worked example; Play again and a reload skip the card', async ({ page, issues }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').click();
    const ex = (await page.locator('.star-intro-k').innerText()).replace('Worked example: ', '');
    await page.locator('#stStart').click();
    await expect(page.locator('#stQ')).toBeFocused();
    await expect(page.locator('#stPad')).toBeVisible();
    const asked: string[] = [];
    for (let i = 1; i <= 4; i++) {
      await expect(page.locator('#stMain .star-tag')).toHaveText(`Question ${i} of 4`);
      if (i > 1) expect((await page.locator('#stDare b').innerText()).replace(/\s*=\s*\?$/, '')).not.toBe(ex);
      asked.push((await answer(page)).replace(/\s*=\s*\?$/, ''));
    }
    expect(asked).not.toContain(ex);
    await expect(page.locator('#stAgain')).toBeVisible();
    await page.locator('#stAgain').click();
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await expect(page.locator('.star-intro')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await expect(page.locator('.star-intro')).toHaveCount(0);
    expect(appErrors(issues)).toEqual([]);
  });

  test('keyboard: Enter on the focused Start opens the first question with focus', async ({ page }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#stStart')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await expect(page.locator('#stQ')).toBeFocused();
    await page.keyboard.press('7');
    await expect(page.locator('#stOut')).toContainText('7');
  });

  test('Escape on the card starts the round', async ({ page }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').click();
    await expect(page.locator('#stStart')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
  });
});

test.describe('Calm on', () => {
  test.use({ seedMode: null });
  test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('vm.calm', '1')); });
  test('every step is there at once, nothing animates, and the card waits for Start the Star', async ({ page }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').click();
    await expect(page.locator('.star-intro .star-step')).toHaveCount(3);
    expect(await page.locator('.star-intro .star-step').evaluateAll(es => es.map(e => getComputedStyle(e).animationName))).toEqual(['none', 'none', 'none']);
    await page.waitForTimeout(3000);
    await expect(page.locator('#stStart')).toBeVisible();
    await expect(page.locator('#stMain .star-ask')).toHaveCount(0);
  });
});

test('a Challenger who picked the card: Play this Star on Home opens the first question with no worked example', async ({ page }) => {
  await open(page);
  await page.locator('#view a.md-btn--primary', { hasText: 'Play this Star' }).click();
  await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
  await expect(page.locator('.star-intro')).toHaveCount(0);
});
