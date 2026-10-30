import { test, expect, open, heldClock, cloudLog } from '../fixtures';

/* openspec star-round:
   - Answer boxes by Mode / Pro on 85 squared: a Pro Player asked 85² gets no hint of how many digits the answer has.
   - Back by button only / Waiting on the end screen: after lighting a Star and doing nothing for a minute, the end
     screen is still shown.
   Star 1 of Square numbers ending in 5 deals from the nine 2-digit squares (15² to 95²), so 85² comes within a few
   rounds; questions are random, so each answer is worked out from the question on screen. */

type Page = import('@playwright/test').Page;
/* n of n² on screen; after the Player's 20th answer one question a round is a Word problem on the same n (openspec
   word-problems), "A square garden is n m long on each side" */
const base = async (page: Page) => { const h = await page.locator('#stQ').innerHTML(); return Number((h.match(/^(\d+)<sup>2<\/sup>/) || h.match(/is (\d+) m long on each side/))![1]); };
const tag = (page: Page) => page.locator('#stMain .star-tag');

async function answer(page: Page, v: string) { await page.keyboard.type(v); await page.keyboard.press('Enter'); }

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });

  test('Pro on 85 squared: the entry gives no hint of how many digits the answer has', async ({ page }) => {
    test.setTimeout(180_000); // a round misses 85² with chance 5/9, so it may take several rounds to come up
    await open(page, '#/star/sq5/1');
    let found = false;
    let otherEntry: string | null = null;
    for (let round = 0; round < 12 && !found; round++) {
      for (let i = 1; i <= 4; i++) {
        await expect(tag(page)).toHaveText(`Question ${i} of 4`);
        const n = await base(page);
        if (n === 85) { found = true; break; }
        // Remember the entry markup of a question whose answer has a different digit count (15² = 225)
        if (n === 15) otherEntry = await page.locator('#stOut').evaluate(e => e.outerHTML);
        await answer(page, String(n * n));
        await expect(page.locator('#stSay')).toContainText('+10 Sparks');
      }
      if (!found) { await expect(page.locator('#stAgain')).toBeVisible(); await page.locator('#stAgain').click(); }
    }
    expect(found, '85² was dealt within twelve rounds of Star 1').toBe(true);

    // No digit boxes, and the plain entry is empty with nothing in it or on it that counts digits
    await expect(page.locator('#stBoxes')).toHaveCount(0);
    await expect(page.locator('.star-boxes span')).toHaveCount(0);
    const plain = page.locator('.star-plain');
    await expect(plain).toBeVisible();
    await expect(plain).toHaveText('');
    const entry = await page.locator('#stOut').evaluate(e => ({
      html: e.outerHTML,
      attrs: [...e.attributes].map(a => `${a.name}=${a.value}`).join(' '),
      kids: e.children.length
    }));
    expect(entry.kids).toBe(0);
    expect(entry.attrs).not.toMatch(/\b4\b|digit|maxlength|size|pattern/i);
    // Nothing on the stage says four digits either
    await expect(page.locator('#stMain')).not.toContainText(/4 digits|four digits|digit/i);
    if (otherEntry !== null) expect(entry.html).toBe(otherEntry); // identical to a 3-digit answer's entry

    // The entry takes more than four digits: no cap that would give the length away
    await page.keyboard.type('72250');
    await expect(plain).toHaveText('72250');
    await page.keyboard.press('Backspace');
    await expect(plain).toHaveText('7225');
    await page.keyboard.press('Enter');
    await expect(page.locator('#stSay')).toContainText('+10 Sparks');
    expect((await cloudLog(page)).writes).toEqual([]);
  });
});

test('Waiting on the end screen: after lighting a Star and a minute of nothing, the end screen is still shown', async ({ page }) => {
  await heldClock(page);
  await open(page, '#/star/sq5/1');
  for (let i = 1; i <= 4; i++) {
    await expect(tag(page)).toHaveText(`Question ${i} of 4`);
    const n = await base(page);
    await answer(page, String(n * n));
    await expect(page.locator('#stSay')).toContainText('+10 Sparks');
    await page.clock.runFor(3000); // the pause before the next question
  }
  await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
  const url = page.url();
  await page.clock.runFor(61_000);
  await page.clock.fastForward(60_000);
  await expect(page).toHaveURL(url);
  await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
  await expect(page.locator('#stAgain')).toBeVisible();
  await expect(page.locator('#stBack')).toBeVisible();
});
