import { test, expect, APP, type Page } from './fixtures';

/* Sutra deep dive (openspec change sutra-examples, sutra-deep-dive spec): every sutra and sub-sutra teaches with at
   least three worked examples, easy to harder, the first open and the rest opened by the Player; the prev / next
   footer and the close button stay pinned while the dialog scrolls. */

const IDS = [...Array.from({ length: 16 }, (_, i) => 's' + (i + 1)), ...Array.from({ length: 13 }, (_, i) => 'u' + (i + 1))];
const dlg = (page: Page) => page.locator('dialog.sutra-modal');

async function openDeepDive(page: Page, id: string) {
  await page.goto(`${APP}#/sutras/${id}`);
  await expect(dlg(page)).toBeVisible();
  await expect(dlg(page).locator('.sd-ex > li').first()).toBeVisible();
}

/* The footer's box lies inside the dialog's visible box, at its bottom edge */
async function footerPinned(page: Page) {
  const [d, f] = await Promise.all([dlg(page).boundingBox(), dlg(page).locator('.sd-foot').boundingBox()]);
  expect(d && f).toBeTruthy();
  expect(f!.y).toBeGreaterThanOrEqual(d!.y - 1);
  expect(Math.abs(f!.y + f!.height - (d!.y + d!.height))).toBeLessThanOrEqual(4);
}

test('every sutra and sub-sutra shows at least three worked examples, the first one open', async ({ page }) => {
  await page.goto(`${APP}#/sutras/s1`);
  await expect(dlg(page)).toBeVisible();
  for (const id of IDS) {
    await page.evaluate(h => location.replace(h), `#/sutras/${id}`);
    const items = dlg(page).locator('.sd-ex > li');
    await expect.poll(() => items.count(), { message: id }).toBeGreaterThanOrEqual(3);
    await expect(items.nth(0).locator('details')).toHaveAttribute('open', '');
    for (let i = 1; i < await items.count(); i++) await expect(items.nth(i).locator('details')).not.toHaveAttribute('open', '');
    await expect(items.nth(0).locator('summary')).toContainText('Example 1 of');
    await expect(items.nth(0).locator('.hl')).not.toHaveCount(0);
  }
});

test('the examples open and close by keyboard, and each one has a named control', async ({ page }) => {
  await openDeepDive(page, 's1');
  const second = dlg(page).locator('.sd-ex > li').nth(1), sum = second.locator('summary'), steps = second.locator('details > p');
  await expect(sum).toHaveAccessibleName(/Example 2 of \d+.*65²/);
  await expect(steps).toBeHidden();
  await sum.focus();
  await page.keyboard.press('Enter');
  await expect(second.locator('details')).toHaveAttribute('open', '');
  await expect(steps).toContainText('4225');
  await page.keyboard.press('Space');
  await expect(steps).toBeHidden();
  // Tab moves from one example to the next
  await sum.focus();
  await page.keyboard.press('Tab');
  await expect(dlg(page).locator('.sd-ex > li').nth(2).locator('summary')).toBeFocused();
});

for (const width of [1280, 768, 375, 320]) {
  test(`the footer and the close button stay in view while the deep dive scrolls (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: width >= 768 ? 800 : 700 });
    await openDeepDive(page, 's2');
    const d = dlg(page);
    await footerPinned(page);
    // Both links on one row, named with the direction and the full Sutra name
    const prev = d.locator('.sd-foot a.sd-prev'), next = d.locator('.sd-foot a.sd-next');
    await expect(prev).toHaveAccessibleName('Previous: Ekādhikena Pūrveṇa');
    await expect(next).toHaveAccessibleName('Next: Ūrdhva-Tiryagbhyām');
    const [pb, nb] = await Promise.all([prev.boundingBox(), next.boundingBox()]);
    expect(Math.abs(pb!.y - nb!.y)).toBeLessThanOrEqual(1);
    for (const where of ['middle', 'bottom'] as const) {
      await d.evaluate((el, w) => { el.scrollTop = w === 'bottom' ? el.scrollHeight : (el.scrollHeight - el.clientHeight) / 2; }, where);
      await footerPinned(page);
      await expect(d.locator('.sd-x')).toBeInViewport();
      await expect(d.locator('.sd-foot a').first()).toBeInViewport();
    }
    // At the bottom the last text sits above the footer, not under it
    const [last, foot] = await Promise.all([d.locator('.sd-text > :last-child').boundingBox(), d.locator('.sd-foot').boundingBox()]);
    expect(last!.y + last!.height).toBeLessThanOrEqual(foot!.y + 1);
    // Nothing scrolls sideways
    expect(await d.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    // The footer still moves to the next sutra, from the bottom of the scroll
    await next.click();
    await expect(page).toHaveURL(/#\/sutras\/s3$/);
    await expect(d.locator('#sdTitle')).toHaveText('Ūrdhva-Tiryagbhyām');
    await expect.poll(() => d.evaluate(el => el.scrollTop)).toBe(0);
  });
}

test('the footer is opaque and pinned in Deep Space and with Calm on', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('vm.calm', '1'));
  await page.setViewportSize({ width: 375, height: 700 });
  await openDeepDive(page, 'u7');
  const d = dlg(page);
  await d.evaluate(el => { el.scrollTop = (el.scrollHeight - el.clientHeight) / 2; });
  await footerPinned(page);
  const [bg, pageBg] = await Promise.all([d.locator('.sd-foot').evaluate(el => getComputedStyle(el).backgroundColor), page.evaluate(() => getComputedStyle(document.body).backgroundColor)]);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(bg).toBe(await d.evaluate(el => getComputedStyle(el).backgroundColor));
  expect(pageBg).toBeTruthy();
  // The close button still closes from the middle of the scroll
  await d.locator('.sd-x').click();
  await expect(d).toBeHidden();
});
