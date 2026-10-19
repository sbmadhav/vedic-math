import { test, expect, APP, type Page } from '../fixtures';

/* sutra-deep-dive spec, Requirements "Pinned footer" and "Pinned close button and one-row footer links": one test per
   scenario. */
const dlg = (page: Page) => page.locator('dialog.sutra-modal');

async function openDeepDive(page: Page, id: string) {
  await page.goto(`${APP}#/sutras/${id}`);
  await expect(dlg(page)).toBeVisible();
  await expect(dlg(page).locator('.sd-ex > li').first()).toBeVisible();
}
async function footerPinned(page: Page) {
  const [d, f] = await Promise.all([dlg(page).boundingBox(), dlg(page).locator('.sd-foot').boundingBox()]);
  expect(d && f).toBeTruthy();
  expect(f!.y).toBeGreaterThanOrEqual(d!.y - 1);
  expect(Math.abs(f!.y + f!.height - (d!.y + d!.height))).toBeLessThanOrEqual(4);
}
const scrollTo = (d: ReturnType<typeof dlg>, where: 'middle' | 'bottom') => d.evaluate((el, w) => { el.scrollTop = w === 'bottom' ? el.scrollHeight : (el.scrollHeight - el.clientHeight) / 2; }, where);

test('Footer stays while scrolling: at 1280, 768, 375 and 320px the footer and close button stay in view and the text ends above the footer', async ({ page }) => {
  for (const width of [1280, 768, 375, 320]) {
    await page.setViewportSize({ width, height: width >= 768 ? 800 : 700 });
    await openDeepDive(page, 's2');
    const d = dlg(page);
    for (const where of ['middle', 'bottom'] as const) {
      await scrollTo(d, where);
      await footerPinned(page);
      await expect(d.locator('.sd-x'), `${width} ${where}`).toBeInViewport();
    }
    const [last, foot] = await Promise.all([d.locator('.sd-text > :last-child').boundingBox(), d.locator('.sd-foot').boundingBox()]);
    expect(last!.y + last!.height, `${width}`).toBeLessThanOrEqual(foot!.y + 1);
  }
});

test('Move on from anywhere: at the bottom of Nikhilaṃ, Next opens Ūrdhva-Tiryagbhyām scrolled to the top at #/sutras/s3', async ({ page }) => {
  await openDeepDive(page, 's2');
  const d = dlg(page);
  await scrollTo(d, 'bottom');
  await d.locator('.sd-foot a.sd-next').click();
  await expect(page).toHaveURL(/#\/sutras\/s3$/);
  await expect(d.locator('#sdTitle')).toHaveText('Ūrdhva-Tiryagbhyām');
  await expect.poll(() => d.evaluate(el => el.scrollTop)).toBe(0);
});

test('Deep Space and Calm: the footer is pinned with the dialog\'s opaque background and the close button closes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('vm.calm', '1'));
  await page.setViewportSize({ width: 375, height: 700 });
  await openDeepDive(page, 'u7');
  const d = dlg(page);
  await scrollTo(d, 'middle');
  await footerPinned(page);
  const bg = await d.locator('.sd-foot').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(bg).toBe(await d.evaluate(el => getComputedStyle(el).backgroundColor));
  await d.locator('.sd-x').click();
  await expect(d).toBeHidden();
});

test('Close from the middle: at 1280, 768, 375 and 320px the close button is in view mid-scroll and closes the dialog', async ({ page }) => {
  for (const width of [1280, 768, 375, 320]) {
    await page.setViewportSize({ width, height: width >= 768 ? 800 : 700 });
    await openDeepDive(page, 's2');
    const d = dlg(page);
    await scrollTo(d, 'middle');
    await expect(d.locator('.sd-x'), `${width}`).toBeInViewport();
    await d.locator('.sd-x').click();
    await expect(d, `${width}`).toBeHidden();
  }
});

test('Narrow footer: at 320px Previous and Next sit on one row and the dialog does not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await openDeepDive(page, 's2');
  const d = dlg(page);
  const prev = d.locator('.sd-foot a.sd-prev'), next = d.locator('.sd-foot a.sd-next');
  await expect(prev).toHaveAccessibleName('Previous: Ekādhikena Pūrveṇa');
  await expect(next).toHaveAccessibleName('Next: Ūrdhva-Tiryagbhyām');
  const [pb, nb] = await Promise.all([prev.boundingBox(), next.boundingBox()]);
  expect(Math.abs(pb!.y - nb!.y)).toBeLessThanOrEqual(1);
  expect(await d.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
});
