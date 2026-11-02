import { test, expect, open } from '../fixtures';

/* watch-shelf / Every video plays in the page / Choosing a video: a Player chooses a video and presses play; it plays
   in the page's own player from youtube-nocookie.com and the page stays open (no navigation, no new tab).
   tests/watch.spec.ts checks the embed origin and the facade before play; this adds "the page stays open". YouTube is
   answered with an empty page, so no real player loads. */

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
  await page.route(/^https:\/\/i\.ytimg\.com\//, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
});

test('choosing a video on the Watch shelf plays it in the page from youtube-nocookie.com and the page stays open', async ({ page, context }) => {
  await open(page, '#/watch');
  const card = page.locator('#view button.watch-card').first();
  await expect(card).toBeVisible();
  const yt = await card.evaluate(el => (el as HTMLElement).dataset.watch || el.getAttribute('data-yt') || '');
  const before = page.url();
  const popups: string[] = [];
  context.on('page', p => popups.push(p.url()));
  const navs: string[] = [];
  page.on('framenavigated', f => { if (f === page.mainFrame()) navs.push(f.url()); });

  await card.click();
  const dlg = page.locator('dialog.vm-player');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('iframe'), 'the facade: no frame until play is pressed').toHaveCount(0);
  await dlg.locator('.vp-play').click();
  const iframe = dlg.locator('iframe');
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?/);
  if (/^[\w-]{11}$/.test(yt)) await expect(iframe).toHaveAttribute('src', new RegExp(`/embed/${yt}\\?`));

  // the page stays open: same URL, no main-frame navigation, no new tab, the shelf still behind the player
  expect(page.url()).toBe(before);
  expect(navs).toEqual([]);
  expect(popups).toEqual([]);
  expect(context.pages()).toHaveLength(1);
  await expect(page.locator('#view button.watch-card').first()).toBeAttached();
  expect(await page.evaluate(() => location.pathname)).toBe(new URL(before).pathname);
});
