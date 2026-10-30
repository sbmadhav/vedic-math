import { test, expect, open } from '../fixtures';

/* site-header spec, Requirement "Learn and the Arcade hold the places" (openspec change play-nav-by-mode): one test per
   scenario. */
const current = (page: import('@playwright/test').Page) => page.locator('header .mq-nav a[aria-current="true"]');

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });
  test('The Arcade: the Dojo, the Arena and Games as cards, each with one line, and the Dojo card opens #/dojo', async ({ page }) => {
    await open(page);
    await page.locator('header .mq-nav a[href="#/arcade"]').click();
    const doors = page.locator('.arcade-doors a.door');
    expect(await doors.evaluateAll(as => as.map(a => a.getAttribute('href')))).toEqual(['#/dojo', '#/arena', '#/games']);
    for (const d of await doors.all()) expect((await d.locator('.door-line').innerText()).length).toBeGreaterThan(20);
    await doors.first().click();
    await expect(page).toHaveURL(/#\/dojo$/);
  });
});

test('Old links still work: #/dojo, #/arena/party, #/sutras/s1 and #/guide/arena open as before, with Arcade, Arcade, Learn and Find current', async ({ page }) => {
  await open(page, '#/dojo');
  await expect(page.locator('#view h1')).toHaveText('From white belt to black belt');
  await expect(current(page)).toHaveText('Arcade');
  await open(page, '#/arena/party');
  await expect(page.locator('#view h1').first()).toHaveText('Party Mode');
  await expect(current(page)).toHaveText('Arcade');
  await open(page, '#/sutras/s1');
  await expect(page.locator('dialog.sutra-modal #sdTitle')).toHaveText('Ekādhikena Pūrveṇa');
  await expect(current(page)).toHaveText('Learn');
  await open(page, '#/guide/arena');
  await expect(page.locator('#gdh-arena')).toBeFocused();
  await expect(current(page)).toContainText('Find');
});

test('Learn holds the Sutras: the first card on Learn opens the Sutras page and says how many cards are collected', async ({ page }) => {
  await open(page, '#/learn');
  const card = page.locator('#view a.learn-sutras');
  await expect(card).toContainText('0 of 29 cards collected');
  expect(await page.locator('#view a.door').first().getAttribute('href')).toBe('#/sutras');
  await card.click();
  await expect(page.locator('#view h1')).toHaveText('The 16 sutras and 13 sub-sutras');
});
