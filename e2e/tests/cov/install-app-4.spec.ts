import { test, expect, open } from '../fixtures';
import { asInstalledApp } from '../install-helpers';

/* install-app spec (openspec change install-app), Requirement "Links that leave the Installed app open in the browser":
   one test per scenario. The Installed app is (display-mode: standalone) matching, by an init script. */

test('For grown-ups from the app: /parents/ opens in a new browsing context and the app stays on its route', async ({ page, context }) => {
  await asInstalledApp(page);
  await open(page, '#/learn');
  await expect(page.locator('html')).toHaveClass(/\blv-installed\b/); /* the install module is here (it loads after the first paint) */
  const popup = context.waitForEvent('page');
  await page.locator('footer a.mq-grownups').click();
  const other = await popup;
  expect(new URL(other.url()).pathname).toBe('/parents/');
  await expect(page).toHaveURL(/\/play\/#\/learn$/);
  await other.close();
});

test('The brand in the app: the game\'s Home opens, not the landing page', async ({ page }) => {
  await asInstalledApp(page);
  await open(page, '#/learn');
  await expect(page.locator('header .md-brand')).toHaveAttribute('href', '#/'); /* set once the install module is here */
  await page.locator('header .md-brand').click();
  await expect(page).toHaveURL(/\/play\/#\/$/);
  await expect(page.locator('h1.home-h')).toBeVisible();
});

test('In a browser tab: the brand links to /?home and the footer links have no target', async ({ page }) => {
  await open(page);
  await expect(page.locator('header .md-brand')).toHaveAttribute('href', '/?home');
  for (const a of await page.locator('footer a').all()) expect(await a.getAttribute('target')).toBeNull();
  await page.locator('footer a.mq-privacy').click();
  await expect(page).toHaveURL(/\/privacy\//);
});
