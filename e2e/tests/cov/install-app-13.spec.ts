import { test, expect, open, hrefTo } from '../fixtures';
import { UA, RETURNING } from '../install-helpers';

/* install-app spec (openspec change install-app), Requirement "One prompt at a time": one test per scenario. Safari on
   an iPhone, where the nudge is due without any offer from the browser. */
const nudge = (page: import('@playwright/test').Page) => page.locator('#installSlot .in-nudge');

test.use({ seedProgress: RETURNING, userAgent: UA.iphoneSafari });

test('A toast on Home: the nudge waits and shows after the toast has gone', async ({ page }) => {
  // A Quest complete toast already on screen as Home draws (a Quest finished in the round just played)
  await page.addInitScript(() => {
    // readyState becomes interactive once the page is parsed, before its module scripts run (and so before Home draws)
    document.addEventListener('readystatechange', () => {
      if (document.readyState !== 'interactive') return;
      const box = document.createElement('div'); box.className = 'fx-toasts';
      box.innerHTML = '<div class="fx-toast ok"><b>Quest complete</b></div>';
      document.body.append(box);
      setTimeout(() => box.remove(), 3000);
    });
  });
  await open(page);
  await expect(page.locator('.fx-toast')).toBeVisible();
  await expect(nudge(page)).toHaveCount(0);
  await expect(nudge(page)).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.fx-toast')).toHaveCount(0);
});

test('Another prompt: while another prompt holds the Prompt slot, the nudge does not show', async ({ page }) => {
  await open(page, '#/learn');
  await page.evaluate(async () => { const slot = await e2eMod('prompt-slot'); slot.claim('family', new AbortController().signal); });
  await page.locator(`nav.mq-nav a${hrefTo('#/')}`).click();
  await expect(page.locator('h1.home-h')).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(nudge(page)).toHaveCount(0);
});

test.describe('a Player with no Sparks who played on an earlier day', () => {
  test.use({ tourSeen: false, seedProgress: { days: { '2026-01-05': 1 }, sparks: 0 } });
  test('The tour: while the first-visit tour is due or open on Home, the nudge does not show', async ({ page }) => {
    await open(page);
    await expect(page.locator('dialog.vm-tour')).toBeVisible();
    await page.waitForTimeout(2500);
    await expect(nudge(page)).toHaveCount(0);
  });
});
