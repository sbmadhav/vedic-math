import { test, expect, open, type Mode } from '../fixtures';
import type { Page } from '@playwright/test';

/* openspec watch-shelf, Requirement "The existing shelf is migrated", Scenario "A kids' games site": sites marked
   for Explorer or Challenger only, such as PBS KIDS Math Games, are no longer listed. (Scenario "A playlist" is in
   watch-shelf-8.spec.ts.)
   YouTube is answered with an empty page so no third-party player loads. */

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
  await page.route(/^https:\/\/i\.ytimg\.com\//, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
});

const cards = (page: Page) => page.locator('#view button.watch-card');
const chip = (page: Page, group: string, name: string) => page.getByRole('group', { name: group, exact: true }).getByRole('button', { name, exact: true });

async function openEverything(page: Page, mode: Mode) {
  await open(page, '#/watch');
  await expect(cards(page).first()).toBeVisible();
  // The shelf opens on Both; Pro's sites and games are under Links
  if (mode !== 'explorer') await expect(chip(page, 'Mode', 'Both')).toHaveAttribute('aria-pressed', 'true');
  if (mode === 'pro') {
    await chip(page, 'Videos, Shorts or Links', 'Links').click();
    await expect(page.locator('#view .watch-links')).toBeVisible();
  }
}

const shelfData = (page: Page) => page.evaluate(async () => {
  const { VIDEOS, LINKS } = await import('/vedic-math/js/videos.js' as string);
  return { VIDEOS, LINKS } as { VIDEOS: any[]; LINKS: any[] };
});

for (const mode of ['explorer', 'challenger', 'pro'] as Mode[]) {
  test.describe(mode, () => {
    test.use({ seedMode: mode });

    test(`A kids' games site: PBS KIDS Math Games is not listed for ${mode}`, async ({ page }) => {
      await openEverything(page, mode);
      await expect(page.locator('#view')).not.toContainText(/PBS KIDS/i);
      await expect(page.locator('#view a[href*="pbskids"]')).toHaveCount(0);
      if (mode !== 'pro') await expect(page.locator('#view .watch-links')).toHaveCount(0);
    });
  });
}

test("A kids' games site: no link is marked for Explorer or Challenger only, and none is a kids' games site", async ({ page }) => {
  await open(page, '#/watch');
  const { LINKS } = await shelfData(page);
  expect(LINKS.length).toBeGreaterThan(0);
  for (const l of LINKS) {
    expect(l.modes, `${l.id}: links are Pro only and carry no modes`).toBeUndefined();
    expect(`${l.title} ${l.url}`, l.id).not.toMatch(/pbs ?kids/i);
  }
});
