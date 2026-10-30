import { test, expect, open } from '../fixtures';

/* calm spec, Requirement "A Calm switch" as modified by openspec change play-nav-by-mode (the Calm switch in the header's
   Calm and sound panel too): the new scenario. */

test('Turning Calm on from the header: on the Dojo page the panel\'s Calm switch stops all motion, Me shows Calm on, and nothing else changed', async ({ page }) => {
  await open(page, '#/dojo');
  await page.locator('#vmMBtn').click();
  const before = await page.evaluate(() => ({ motion: document.documentElement.classList.contains('motion-paused'), bg: (document.getElementById('vmBg') as HTMLInputElement).checked }));
  await page.locator('#vmCalm').click();
  await expect(page.locator('#vmCalm')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('body')).toHaveClass(/\bcalm\b/);
  expect(await page.evaluate(async () => (await e2eMod('fx')).noMotion())).toBe(true); /* the one check every moving thing asks */
  expect(await page.evaluate(() => ({ motion: document.documentElement.classList.contains('motion-paused'), bg: (document.getElementById('vmBg') as HTMLInputElement).checked }))).toEqual(before);
  await expect(page.locator('#vmMBtn')).not.toHaveClass(/\bon\b/);
  await open(page, '#/me');
  await expect(page.locator('#setCalm')).toHaveAttribute('aria-checked', 'true');
});
