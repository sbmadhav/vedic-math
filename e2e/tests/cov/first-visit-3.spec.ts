import { test, expect, APP, open } from '../fixtures';

/* first-visit spec, Requirements "The trial Star teaches before it asks" and "The worked example card is reachable
   and still" (openspec try-trick-teaches): one test per scenario. */
type Page = import('@playwright/test').Page;
const diff = (text: string) => { const m = text.replace(/,/g, '').match(/(\d+)\s*[−-]\s*(\d+)/)!; return String(+m[1] - +m[2]); };
const plain = (s: string) => s.replace(/\s*=\s*\?$/, '').replace(/\s+/g, ' ').trim();
async function answer(page: Page) {
  const q = await page.locator('#stQ').innerText();
  for (const ch of diff(q)) await page.locator(`.star-key[data-k="${ch}"]`).click();
  await page.locator('.star-key[data-k="go"]').click();
  return plain(q);
}

test.describe('a new visitor', () => {
  test.use({ seedMode: null });

  test('The worked example: Star 1 of from9 opens on its title, the all from 9 rule and a 100 minus example ending in its result, with Start the Star and no number pad', async ({ page }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').click();
    await expect(page.locator('#stIntroH')).toHaveText('Subtract from 100, 1000, 10000');
    await expect(page.locator('.star-intro-idea')).toContainText('from 9');
    const ex = await page.locator('.star-intro-k').innerText();
    expect(ex).toMatch(/100 − \d\d$/);
    await expect(page.locator('.star-intro .star-step').last()).toContainText(`= ${diff(ex)}.`);
    await expect(page.locator('#stStart')).toHaveText('Start the Star');
    await expect(page.locator('#stPad')).toBeHidden();
  });

  test('The example is not one of the questions: none of the four questions or the Dare is the worked example', async ({ page }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').click();
    const ex = plain((await page.locator('.star-intro-k').innerText()).replace('Worked example: ', ''));
    await page.locator('#stStart').click();
    for (let i = 1; i <= 4; i++) {
      await expect(page.locator('#stMain .star-tag')).toHaveText(`Question ${i} of 4`);
      if (i > 1) expect(plain(await page.locator('#stDare b').innerText())).not.toBe(ex);
      expect(await answer(page)).not.toBe(ex);
    }
    await expect(page.locator('#stAgain')).toBeVisible();
  });

  test('Only from Try a trick: Play again opens the first question with no card', async ({ page }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').click();
    await page.locator('#stStart').click();
    await page.locator('#stSkip').click();
    await page.locator('#stAgain').click();
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await expect(page.locator('.star-intro')).toHaveCount(0);
  });

  test('Keyboard: Enter on the card opens the first question, which has focus', async ({ page }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').click();
    await expect(page.locator('#stStart')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await expect(page.locator('#stQ')).toBeFocused();
  });

  test('Screen reader: the live region says Learn the trick first with the title, and the focused button is Start the Star', async ({ page }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').click();
    await expect(page.locator('#vmLive')).toContainText('Learn the trick first: Subtract from 100, 1000, 10000.');
    await expect(page.locator('#stStart')).toBeFocused();
    await expect(page.locator('#stStart')).toHaveAccessibleName('Start the Star');
  });
});

test.describe('Calm', () => {
  test.use({ seedMode: null });
  test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('vm.calm', '1')); });
  test('Calm: every step is shown at once without animation, and the card stays until Start the Star', async ({ page }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').click();
    await expect(page.locator('.star-intro .star-step')).toHaveCount(3);
    expect(await page.locator('.star-intro .star-step').evaluateAll(es => es.map(e => getComputedStyle(e).animationName))).toEqual(['none', 'none', 'none']);
    await page.waitForTimeout(3000);
    await expect(page.locator('#stStart')).toBeVisible();
  });
});

test('Only from Try a trick: Play this Star on a Challenger Home opens the first question with no card', async ({ page }) => {
  await open(page);
  await page.locator('#view a.md-btn--primary', { hasText: 'Play this Star' }).click();
  await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
  await expect(page.locator('.star-intro')).toHaveCount(0);
});
