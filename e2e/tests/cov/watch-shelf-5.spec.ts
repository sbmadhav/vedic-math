import { test, expect, open, heldClock } from '../fixtures';
import type { Page } from '@playwright/test';

/* watch-shelf:
   - Critiques are for Pro only / Challenger on the Sutras page: no critique of the methods' origin is listed.
     tests/watch.spec.ts checks arXiv is absent; this checks every entry the data file marks `critique` (title and
     URL), with Pro as the control that the same entries do reach the page.
   - Shorts are tiles / A Short ends: nothing else starts on its own. tests/watch.spec.ts closes the player; this
     lets the Short run past its length (fake clock) and sends the YouTube "ended" state, then checks the same
     single Short is all that is playing. YouTube is answered with an empty page, so no real player loads. */

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
  await page.route(/^https:\/\/i\.ytimg\.com\//, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
});

type Critique = { title: string; url?: string; yt?: string };
const critiques = (page: Page) => page.evaluate(async () => {
  const { VIDEOS, LINKS } = await import('/js/videos.js' as string);
  return [...(VIDEOS || []), ...(LINKS || [])].filter((e: any) => e.critique).map((e: any) => ({ title: e.title, url: e.url, yt: e.yt }));
}) as Promise<Critique[]>;

test.describe('Critiques are for Pro only', () => {
  test.describe('challenger', () => {
    test.use({ seedMode: 'challenger' });
    test('a Challenger on the Sutras page sees no critique of the methods\' origin', async ({ page }) => {
      await open(page, '#/sutras');
      await expect(page.locator('#view h1')).toContainText('sutras');
      const list = await critiques(page);
      expect(list.length, 'the data file has critique entries').toBeGreaterThan(0);
      // the Pro-only reading line stays hidden and empty
      await expect(page.locator('[data-history-links]')).toBeHidden();
      await expect(page.locator('[data-history-links]')).toHaveText('');
      const text = await page.locator('#view').innerText();
      const hrefs = await page.locator('a[href]').evaluateAll(els => els.map(a => (a as HTMLAnchorElement).href));
      const watched = await page.locator('[data-watch]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.watch));
      for (const c of list) {
        expect(text, c.title).not.toContain(c.title);
        if (c.url) expect(hrefs, c.url).not.toContain(c.url);
        if (c.yt) expect(watched, c.yt).not.toContain(c.yt);
      }
    });
  });

  test.describe('pro (control)', () => {
    test.use({ seedMode: 'pro' });
    test('a Pro on the Sutras page does get the critiques', async ({ page }) => {
      await open(page, '#/sutras');
      const more = page.locator('[data-history-links]');
      await expect(more).toBeVisible();
      const list = await critiques(page);
      for (const c of list) if (c.url) await expect(more.locator(`a[href="${c.url}"]`), c.title).toHaveCount(1);
    });
  });
});

test('when a Short finishes playing, nothing else starts on its own', async ({ page, context }) => {
  await heldClock(page);
  await open(page, '#/watch');
  const cards = page.locator('#view button.watch-card');
  await expect(cards.first()).toBeVisible();
  // the shelf opens on Videos; Shorts are shown on their own
  await expect(page.locator('#view button.watch-card--short')).toHaveCount(0);
  await page.getByRole('group', { name: 'Videos or Shorts', exact: true }).getByRole('button', { name: 'Shorts', exact: true }).click();
  const short = page.locator('#view button.watch-card.watch-card--short').first();
  await expect(short).toBeVisible();
  const yt = await short.evaluate(el => (el as HTMLElement).dataset.watch || '');
  const len = await page.evaluate(async y => { const { VIDEOS } = await import('/js/videos.js' as string); return VIDEOS.find((v: any) => v.yt === y).duration as number; }, yt);
  await short.click();

  const dlg = page.locator('dialog.vm-player');
  await expect(dlg).toBeVisible();
  await expect(dlg).toHaveClass(/\btall\b/);
  const iframe = dlg.locator('iframe');
  await expect(iframe).toHaveAttribute('src', new RegExp(`/embed/${yt}\\?`));
  const src = (await iframe.getAttribute('src'))!;
  // the embed itself queues nothing after this Short: no playlist, no loop
  expect(src).not.toMatch(/[?&](playlist|list|loop)=/);
  const title = await dlg.locator('#vpTitle').textContent();
  const url = page.url();

  // the Short finishes: its length passes and YouTube reports the "ended" state (0)
  await page.clock.fastForward((len + 30) * 1000);
  await page.evaluate(() => {
    const msg = JSON.stringify({ event: 'onStateChange', info: 0 });
    window.postMessage(msg, '*');
    window.dispatchEvent(new MessageEvent('message', { data: msg, origin: 'https://www.youtube-nocookie.com' }));
  });
  await page.clock.fastForward(30_000);

  // still the same one Short in the same player; no other video, dialog, tab or page started
  await expect(page.locator('iframe')).toHaveCount(1);
  await expect(iframe).toHaveAttribute('src', src);
  await expect(dlg.locator('#vpTitle')).toHaveText(title || '');
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  expect(page.url()).toBe(url);
  expect(context.pages()).toHaveLength(1);

  // closing it leaves nothing playing
  await dlg.locator('.vp-x').click();
  await expect(dlg).toBeHidden();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.clock.fastForward(60_000);
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
});
