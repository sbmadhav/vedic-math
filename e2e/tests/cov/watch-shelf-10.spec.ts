import { test, expect, open } from '../fixtures';
import type { Page } from '@playwright/test';

/* watch-shelf spec, Requirements "Filters on the Watch shelf / Longer videos" and "Every video meets the length bar":
   one test per scenario. The node tests (test/videos.test.mjs) fail the build on an entry of 12 minutes or more;
   here the shipped list is checked for what that rule guarantees. */
const cards = (page: Page) => page.locator('#view button.watch-card');
const chip = (page: Page, group: string, name: string) => page.getByRole('group', { name: group, exact: true }).getByRole('button', { name, exact: true });

test('Longer videos: "8 to 12 min" shows only videos from 8 up to 12 minutes, or a note that none match', async ({ page }) => {
  await open(page, '#/watch');
  await expect(cards(page).first()).toBeVisible();
  await chip(page, 'Mode', 'Both').click();
  await chip(page, 'Length', '8 to 12 min').click();
  await expect(chip(page, 'Length', '8 to 12 min')).toHaveAttribute('aria-pressed', 'true');
  const secs = await cards(page).evaluateAll(els => els.map(e => Number((e as HTMLElement).dataset.secs)));
  if (secs.length === 0) await expect(page.locator('#view')).toContainText(/none|no videos/i);
  for (const s of secs) { expect(s).toBeGreaterThanOrEqual(480); expect(s).toBeLessThan(720); }
});

test('A long video: the shipped list has no entry of 12 minutes or more (the node tests fail the build on one)', async ({ page }) => {
  await open(page, '#/watch');
  const durations: number[] = await page.evaluate(async () => { const m: any = await import('/vedic-math/js/videos.js' as string); return m.VIDEOS.map((v: any) => v.duration); });
  expect(durations.length).toBeGreaterThan(50);
  for (const d of durations) expect(d).toBeLessThan(720);
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Explorer: the shelf may list videos up to 12 minutes, made for kids first and shortest first', async ({ page }) => {
    await open(page, '#/watch');
    await expect(cards(page).first()).toBeVisible();
    const yts = await cards(page).evaluateAll(els => els.map(e => (e as HTMLElement).dataset.watch!));
    const kinds: Record<string, { kids: boolean; duration: number }> = await page.evaluate(async () => { const m: any = await import('/vedic-math/js/videos.js' as string); return Object.fromEntries(m.VIDEOS.map((v: any) => [v.yt, { kids: !!v.madeForKids, duration: v.duration }])); });
    const seq = yts.map(y => kinds[y]).filter(Boolean);
    expect(seq.length).toBeGreaterThan(0);
    for (const v of seq) expect(v.duration).toBeLessThan(720);
    // Made for kids first, then shortest first within each group
    let seenNonKids = false;
    for (let i = 0; i < seq.length; i++) {
      const v = seq[i];
      if (!v.kids) seenNonKids = true; else expect(seenNonKids, 'a kids video after a non-kids one').toBe(false);
      if (i > 0 && seq[i - 1].kids === v.kids) expect(v.duration).toBeGreaterThanOrEqual(seq[i - 1].duration);
    }
  });
});
