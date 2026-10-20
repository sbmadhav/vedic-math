import { test, expect, open, APP, type Page } from '../fixtures';

/* Records every toast message the page shows (toasts leave after about 3 seconds, so counting the DOM later misses them) */
async function recordToasts(page: Page) {
  await page.addInitScript(() => {
    const w = window as any; w.__toasts = [];
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
      if (n instanceof HTMLElement && n.classList.contains('fx-toast')) w.__toasts.push(n.textContent);
    }))).observe(document, { childList: true, subtree: true });
  });
}
const titleToasts = (page: Page) => page.evaluate(() => ((window as any).__toasts as string[]).filter(t => /New Title/.test(t)));

/* sparks spec, Requirement "Titles from total Sparks":
   - Scenario "Crossing a Title line": a Player at 3,590 Sparks earns 12 more, and one "New Title: Fraction Fighter"
     message is shown.
   - Scenario "Nav chip": on any page the Player chip shows the avatar and a progress bar to the next Title, and its
     accessible name says the Nickname and Title, with no level number. */

test.describe('a Player at 3,590 Sparks earns 12 more', () => {
  /* A right Practice answer pays 10 + the skill's streak (up to 5). With a streak of 1 already on 3-mult, the next
     right answer is streak 2: exactly 12 Sparks. */
  test.use({ seedProgress: { v: 3, sparks: 3590, weekSparks: {}, skills: { '3-mult': { n: 1, c: 1, m: 0.35, streak: 1, last: 1 } } } });

  test('one "New Title: Fraction Fighter" message is shown', async ({ page }) => {
    await recordToasts(page);
    await open(page, '#/skill/3-mult');
    const chip = page.locator('#mqChip a.mq-chip');
    await expect(chip).toHaveAccessibleName('Swift Tiger 42, Times Tamer');
    const box = page.locator('#practice');
    const q = (await box.locator('#prQ').textContent()) || '';
    const [a, b] = q.match(/\d+/g)!.map(Number);
    await box.locator('.ans-in').fill(String(a * b));
    await box.locator('#prCheck').click();
    await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
    await expect(box.locator('#prSay')).toContainText('+12 Sparks');

    const titles = page.locator('.fx-toasts .fx-toast', { hasText: 'New Title' });
    await expect(titles).toHaveCount(1);
    await expect(titles.first()).toHaveText('New Title: Fraction Fighter');
    // The toast box is a polite live region, so the message is announced too
    await expect(page.locator('.fx-toasts')).toHaveAttribute('role', 'status');
    // Still only one a moment later (no second message for the same crossing)
    await page.waitForTimeout(500);
    expect(await titleToasts(page)).toEqual(['New Title: Fraction Fighter']);

    const sparks = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!).sparks);
    expect(sparks).toBe(3602);
    await expect(chip).toHaveAccessibleName('Swift Tiger 42, Fraction Fighter');
  });

  test('earning more Sparks inside the same Title shows no New Title message', async ({ page }) => {
    await recordToasts(page);
    await open(page, '#/skill/3-mult');
    const box = page.locator('#practice');
    // First answer crosses the line (one message), then the next right answer stays inside Fraction Fighter
    for (let i = 0; i < 2; i++) {
      const q = (await box.locator('#prQ').textContent()) || '';
      const [a, b] = q.match(/\d+/g)!.map(Number);
      await box.locator('.ans-in').fill(String(a * b));
      await box.locator('#prCheck').click();
      await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
      await expect(page.locator('.pr-score')).toHaveText(`${i + 1}/${i + 1}`);
      if (i === 0) await box.locator('#prCheck').click(); // Next question
    }
    const sparks = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!).sparks);
    expect(sparks).toBe(3602 + 13);
    expect(await titleToasts(page)).toEqual(['New Title: Fraction Fighter']);
  });
});

test.describe('the nav chip on any page', () => {
  // Sum Sprinter runs 1000 to 2100, so 1200 Sparks is 200 of 1100: an 18% bar
  test.use({ seedProgress: { v: 3, sparks: 1200, weekSparks: {} } });

  const PAGES = ['#/', '#/learn', '#/dojo', '#/skill/3-mult', '#/sutras', '#/arena', '#/games', '#/watch', '#/me'];

  test('shows the avatar, a bar to the next Title, and names the Nickname and Title with no level number', async ({ page }) => {
    for (const h of PAGES) {
      await open(page, h);
      const chip = page.locator('#mqChip a.mq-chip');
      await expect(chip, h).toBeVisible();
      await expect(chip, h).toHaveAccessibleName('Swift Tiger 42, Sum Sprinter');
      await expect(chip, h).not.toHaveAttribute('aria-label'); // named by its own text, so the name holds what is on screen (WCAG 2.5.3)
      // The avatar: the Player's color and initials
      const av = chip.locator('.av');
      await expect(av, h).toBeVisible();
      await expect(av, h).toHaveClass(/\bav-teal\b/);
      await expect(av, h).toHaveText('ST');
      // The progress bar to the next Title
      const bar = chip.locator('.mq-sparkbar');
      await expect(bar, h).toBeVisible();
      await expect(bar.locator('i'), h).toHaveAttribute('style', /width:\s*18%/);
      // No level number anywhere in the chip
      expect(await chip.evaluate(e => [...e.children].filter(c => !c.classList.contains('md-sr-only')).map(c => c.textContent).join('')), h).not.toMatch(/\d|Lv|Level/i);
      const name = (await chip.locator('.md-sr-only').textContent())!.replace(/^Swift Tiger 42, /, '');
      expect(name, h).toBe('Sum Sprinter'); // the rest of the name is the Title alone: no level number
      await expect(chip, h).not.toHaveAccessibleName(/\bLv\b|Level/i);
    }
  });

  test('the bar follows the Sparks still needed for the next Title', async ({ page }) => {
    await open(page, '#/');
    const fill = page.locator('#mqChip a.mq-chip .mq-sparkbar i');
    await expect(fill).toHaveAttribute('style', /width:\s*18%/);
    // 1,550 Sparks: 550 of 1,100 to Times Tamer, half way
    await page.evaluate(() => localStorage.setItem('mathquest.v1.p1', JSON.stringify({ v: 3, sparks: 1550, weekSparks: {} })));
    await page.goto(`${APP}#/dojo`);
    await page.reload();
    await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
    await expect(fill).toHaveAttribute('style', /width:\s*50%/);
    await expect(page.locator('#mqChip a.mq-chip')).toHaveAccessibleName('Swift Tiger 42, Sum Sprinter');
  });
});
