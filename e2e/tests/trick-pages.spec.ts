import { test, expect, appErrors } from './fixtures';
import { TRICK_PAGES, INDEX, trickUrl, openTrick, showSteps } from './trick-kit';

/* The Trick pages (openspec change trick-pages, tasks 2.2 and 4.4): every page opens with one h1, its Practice link
   and its calculator module loaded, with no console error, page error or failed request (the module-load check: the
   page's import map pins /tricks/calculator.js and what it imports, so a 404 or a pageerror fails here). The index
   lists the 15 pages. Runs against a local build (node e2e/local-server.mjs <port> _site) or the live site. */

test('the index lists the 15 Trick pages by their titles, with the header and footer', async ({ page, issues }) => {
  await page.goto(INDEX);
  await expect(page.locator('main h1')).toHaveText('Speed tricks');
  await expect(page.locator('body > header .md-brand')).toBeVisible();
  const links = page.locator('main .tk-list a');
  await expect(links).toHaveCount(15);
  for (const [k, t] of TRICK_PAGES.entries()) {
    await expect(links.nth(k)).toHaveText(t.title);
    await expect(links.nth(k)).toHaveAttribute('href', trickUrl(t.slug));
  }
  await expect(page.locator('footer a[href="/tricks/"]')).toHaveText('Speed tricks');
  expect(appErrors(issues)).toEqual([]);
  expect(issues.failed).toEqual([]);
});

for (const t of TRICK_PAGES) {
  test(`${trickUrl(t.slug)} opens: one h1, the Practice link, the calculator loaded, no error`, async ({ page, issues }) => {
    await openTrick(page, t.slug);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main h1')).toHaveText(t.title);
    await expect(page.locator('#tkCalc')).toHaveAttribute('data-trick', t.trick);
    await expect(page.locator('#tkPractice')).toHaveAttribute('href', `/play/#/skill/v-${t.trick}`);
    await expect(page.locator('#tkPractice')).toHaveText('Practice this trick');
    await expect(page.locator('.tk-sutra a')).toHaveAttribute('href', /^\/play\/#\/sutras\/[su]\d+$/);
    // The worked example is written out, and the calculator starts on its numbers: Show steps draws the first step
    await expect(page.locator('.tk-steps li')).toHaveCount(await page.locator('.tk-steps li').count());
    expect(await page.locator('.tk-steps li').count()).toBeGreaterThanOrEqual(3);
    await page.locator('#tkShow').click();
    await expect(page.locator('#tkBoard .tk-step')).toHaveCount(1);
    await expect(page.locator('#tkErr')).toBeEmpty();
    await page.locator('#tkAll').click();
    expect(await page.locator('#tkBoard .tk-step').count()).toBeGreaterThanOrEqual(3);
    expect(appErrors(issues)).toEqual([]);
    expect(issues.failed).toEqual([]);
  });
}

test('New numbers fills in numbers the Trick takes and shows their first step; Back, Next and Show all walk the steps', async ({ page }) => {
  await openTrick(page, 'multiply-numbers-near-100');
  await page.locator('#tkRand').click();
  const inputs = page.locator('#tkForm input[data-i]');
  for (const k of [0, 1]) expect(Number(await inputs.nth(k).inputValue())).toBeGreaterThan(5);
  await expect(page.locator('#tkErr')).toBeEmpty();
  await expect(page.locator('#tkBoard .tk-step')).toHaveCount(1);
  await expect(page.locator('#tkAt')).toContainText('Step 1 of');
  await page.locator('#tkNext').click();
  await expect(page.locator('#tkBoard .tk-step')).toHaveCount(2);
  await expect(page.locator('#tkBoard .tk-step').first()).not.toHaveClass(/cur/);
  await expect(page.locator('#tkBoard .tk-step').nth(1)).toHaveClass(/cur/);
  await page.locator('#tkBack').click();
  await expect(page.locator('#tkBoard .tk-step')).toHaveCount(1);
  await expect(page.locator('#tkBack')).toHaveAttribute('aria-disabled', 'true');
  await page.locator('#tkAll').click();
  const n = await page.locator('#tkBoard .tk-step').count();
  expect(n).toBeGreaterThanOrEqual(4);
  await expect(page.locator('#tkAt')).toContainText(`Step ${n} of ${n}`);
  await expect(page.locator('#tkNext')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#tkAll')).toHaveAttribute('aria-disabled', 'true');
});

test('the typed example and the Trick\'s limits: an empty field and a number outside the limits each show a message and no steps', async ({ page }) => {
  await openTrick(page, 'square-numbers-ending-in-5');
  await showSteps(page, '');
  await expect(page.locator('#tkErr')).toHaveText('Fill in every number.');
  await expect(page.locator('#tkBoard .tk-step')).toHaveCount(0);
  await showSteps(page, 5);
  await expect(page.locator('#tkErr')).toHaveText('Pick a number from 15 to 995.');
  await expect(page.locator('#tkBoard .tk-step')).toHaveCount(0);
  await expect(page.locator('#tkNav')).toBeHidden();
});
