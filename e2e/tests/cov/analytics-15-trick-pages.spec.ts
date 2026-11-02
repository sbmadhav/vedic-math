import { test, expect } from '../fixtures';
import { openTrick, showSteps, stubAnalytics, events } from '../trick-kit';

/* analytics spec (change trick-pages), Requirement "Trick page counts": one test per scenario. This site's
   /js/analytics.js is replaced by a stub that only records window.siteTrack paths. */

test('The calculator: Show steps three times with different numbers on Multiply by 11 sends math/tricks/calc/by11 once, with no typed number', async ({ page }) => {
  await stubAnalytics(page);
  await openTrick(page, 'multiply-by-11');
  for (const n of [234, 57, 8912]) {
    await showSteps(page, n);
    await expect(page.locator('#tkBoard .tk-step')).toHaveCount(1);
  }
  await page.locator('#tkRand').click(); // New numbers alone never counts
  await expect(page.locator('#tkBoard .tk-step')).toHaveCount(1);
  const sent = (await events(page)).filter(e => e.startsWith('math/tricks/'));
  expect(sent).toEqual(['math/tricks/calc/by11']);
  for (const e of await events(page)) expect(e).not.toMatch(/234|57|8912/);
});

test('Practice this trick: following the link sends math/tricks/practice/by11 once', async ({ page }) => {
  await stubAnalytics(page);
  await openTrick(page, 'multiply-by-11');
  // Keep the page: the event is recorded before the link would leave it
  await page.locator('#tkPractice').evaluate(a => a.addEventListener('click', e => e.preventDefault()));
  await page.locator('#tkPractice').click();
  expect((await events(page)).filter(e => e.startsWith('math/tricks/'))).toEqual(['math/tricks/practice/by11']);
  await page.locator('#tkPractice').click();
  expect((await events(page)).filter(e => e.startsWith('math/tricks/practice/'))).toHaveLength(2);
  await expect(page).toHaveURL(/\/tricks\/multiply-by-11\/$/);
});
