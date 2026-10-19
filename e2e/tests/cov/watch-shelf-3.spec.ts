import { test, expect, open } from '../fixtures';
import type { Page } from '@playwright/test';

/* watch-shelf: "No links out for Explorer and Challenger / Pro shelf" and
   "Each Mode sees its own and the Mode below / Explorer". Checked against the data file (js/videos.js),
   not only the cards' own data attributes. YouTube is answered locally so no third-party player loads. */

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
  await page.route(/^https:\/\/i\.ytimg\.com\//, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
});

const cards = (page: Page) => page.locator('#view button.watch-card');
async function openShelf(page: Page) {
  await open(page, '#/watch');
  await expect(cards(page).first()).toBeVisible();
}
type Data = { videos: { yt: string; modes: string[] }[]; links: { title: string; url: string; kind: string }[] };
const data = (page: Page): Promise<Data> => page.evaluate(async () => {
  const { VIDEOS, LINKS } = await import('/vedic-math/js/videos.js' as string);
  return { videos: VIDEOS.map((v: any) => ({ yt: v.yt, modes: v.modes })), links: LINKS.map((l: any) => ({ title: l.title, url: l.url, kind: l.kind })) };
});

test.describe('Pro shelf', () => {
  test.use({ seedMode: 'pro' });
  test('lists every website and game, each marked as opening a new tab', async ({ page }) => {
    await openShelf(page);
    const { links } = await data(page);
    expect(links.some(l => l.kind === 'site')).toBe(true);
    expect(links.some(l => l.kind === 'game')).toBe(true);
    const section = page.locator('#view .watch-links');
    // Sites and games are under Links, shown on their own
    await page.getByRole('group', { name: 'Videos, Shorts or Links', exact: true }).getByRole('button', { name: 'Links', exact: true }).click();
    await expect(section).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
    const out = section.locator('a.watch-card');
    await expect(out).toHaveCount(links.length);
    for (const l of links) {
      const a = section.locator(`a.watch-card[href="${l.url}"]`);
      await expect(a, l.title).toHaveCount(1);
      await expect(a).toHaveAttribute('target', '_blank');
      await expect(a).toHaveAttribute('rel', /noopener/);
      await expect(a).toContainText(l.title);
      await expect(a.locator('.watch-ext')).toHaveText('Opens in a new tab');
      await expect(a.locator('.watch-type')).toHaveText(l.kind === 'game' ? 'Game' : 'Site');
    }
    // The shelf still lists videos, under Videos
    await page.getByRole('group', { name: 'Videos, Shorts or Links', exact: true }).getByRole('button', { name: 'Videos', exact: true }).click();
    await expect(section).toHaveCount(0);
    expect(await cards(page).count()).toBeGreaterThan(0);
  });
});

test.describe('Explorer shelf', () => {
  test.use({ seedMode: 'explorer' });
  test('every video shown is marked for Explorer in the data file, and every Explorer video is shown', async ({ page }) => {
    await openShelf(page);
    const { videos } = await data(page);
    // Videos and Shorts are shown apart: gather both
    const ids = () => cards(page).evaluateAll(els => els.map(e => (e as HTMLElement).dataset.watch || ''));
    const shown = await ids();
    await page.getByRole('group', { name: 'Videos or Shorts', exact: true }).getByRole('button', { name: 'Shorts', exact: true }).click();
    await expect(page.locator('#view button.watch-card--short').first()).toBeVisible();
    shown.push(...await ids());
    expect(shown.length).toBeGreaterThan(0);
    const byYt = new Map(videos.map(v => [v.yt, v.modes]));
    for (const yt of shown) {
      expect(byYt.has(yt), yt).toBe(true);
      expect(byYt.get(yt), yt).toContain('explorer');
    }
    const explorerVideos = videos.filter(v => v.modes.includes('explorer')).map(v => v.yt);
    expect(new Set(shown)).toEqual(new Set(explorerVideos));
    // Explorer has no Mode filter to widen the list, and no links that leave the site
    await expect(page.locator('#view').getByRole('group', { name: 'Mode', exact: true })).toHaveCount(0);
    await expect(page.locator('#view .watch-links')).toHaveCount(0);
    await expect(page.locator('#view a[target="_blank"]')).toHaveCount(0);
  });
});
