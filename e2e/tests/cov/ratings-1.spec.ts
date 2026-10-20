import { test, expect, open, heldClock, cloudLog, chromiumOnly, APP } from '../fixtures';
import type { Page } from '@playwright/test';

/* ratings spec, "A Rating per game, Arena League and Skill":
   - Separate Ratings: WHEN a Player raises their Times sprint Rating THEN their Arena Rating and their Skill Ratings
     are unchanged.
   - Ratings stay on the device: WHEN a Player's Ratings change THEN no request leaving the device contains a Rating.
     (privacy.spec.ts covers Arena and Skill Ratings; this adds the game Rating, raised by a Ranked round.) */

const SEEDED = { 'game:times-sprint': 5, 'arena:challenger': 7, 'arena:pro': 12, 'skill:3-mult': 11, 'skill:v-sq5': 6 };
const ratings = (page: Page) => page.evaluate(async () => ((await import('/js/store.js' as string)).load().ratings) as Record<string, number>);

/** Answers n Times sprint questions right, reading each question from the page. */
async function rightAnswers(page: Page, n: number) {
  const area = page.locator('#gArea'), q = area.locator('.g-q'), inp = area.locator('.ans-in');
  for (let i = 1; i <= n; i++) {
    const text = (await q.textContent())!.replace(/,/g, '');
    const [x, y] = text.split('×').map(s => Number(s.trim()));
    await inp.fill(String(x * y));
    await inp.press('Enter');
    await expect(page.locator('#gSay')).toHaveText(`Right! ${i} so far.`);
  }
}

test.describe('Separate Ratings', () => {
  test.use({ seedMode: 'challenger', seedProgress: { ratings: { ...SEEDED } } });

  test('raising the Times sprint Rating leaves the Arena Rating and the Skill Ratings unchanged', async ({ page }) => {
    await open(page, '#/game/times-sprint');
    await expect(page.locator('#gShell .dial')).toHaveAttribute('aria-label', 'Difficulty 5 of 20');
    await page.locator('#gShell [data-m="endless"]').click();
    await page.locator('#gStart').click();
    await rightAnswers(page, 8);
    await page.locator('#gQuit').click(); // Finish: an endless round ends and saves the Rating
    await expect(page.locator('.g-result')).toContainText(/Your skill rose to \d+\./);

    const after = await ratings(page);
    expect(after['game:times-sprint']).toBeGreaterThan(5);
    const { 'game:times-sprint': _, ...rest } = after;
    const { 'game:times-sprint': __, ...seededRest } = SEEDED;
    expect(rest).toEqual(seededRest); // Arena (both Leagues) and every Skill Rating as they were, none added

    // What the Player sees: the game Rating moved, the Arena Rating did not
    await page.locator('#gDone').click(); // Back from the result in the play shell to the game's lobby
    await expect(page.locator('#gShell .dial')).toHaveAttribute('aria-label', `Difficulty ${Math.round(after['game:times-sprint'])} of 20`);
    await open(page, '#/arena');
    await expect(page.locator('#arRating')).toHaveAttribute('data-rating', '7');
    await expect(page.locator('#arRating')).toContainText('Your Arena Rating: 7 of 20');
  });
});

test.describe('Ratings stay on the device', () => {
  test.use({ seedMode: 'challenger', seedConsent: { age: 'adult' }, seedProgress: { ratings: { ...SEEDED } } });

  test('a Ranked Times sprint round raises the game Rating and no request leaving the device contains it', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'app logic, the same in every engine');
    const out: string[] = [];
    page.on('request', r => out.push(`${r.method()} ${r.url()}\n${r.postData() || ''}`));
    await heldClock(page);
    await open(page, '#/game/times-sprint');
    await expect(page.locator('#gShell [data-m="ranked"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#gStart').click();
    await rightAnswers(page, 8);
    await page.clock.fastForward(61_000); // the 60 second round ends and posts
    await expect(page.locator('.g-result')).toContainText(/Your skill rose to \d+\./);
    await page.clock.runFor(70_000); // past the weekly Sparks post's wait
    const after = await ratings(page);
    expect(after['game:times-sprint']).toBeGreaterThan(5);

    // The score was posted (so requests did leave), but with no Rating in them. The post loads the SDK over the
    // network after the round ends, so wait for it: read once, it could still be on its way
    await expect.poll(async () => (await cloudLog(page)).writes.length).toBeGreaterThan(0);
    const writes = (await cloudLog(page)).writes;
    for (const w of writes) {
      expect(JSON.stringify(w)).not.toMatch(/rating|game:|arena:|skill:/i);
      expect(Object.keys(w.data).sort()).toEqual(['avatar', 'exp', 'name', 'score', 'ts']);
    }
    for (const r of out) {
      expect(r).not.toMatch(/rating/i);
      expect(r).not.toMatch(/game:times-sprint|arena:|skill:/);
    }
  });
});
