import { test, expect, APP, open, type Mode } from './fixtures';
import type { Page } from '@playwright/test';

/* The Watch shelf (openspec watch-shelf): the list loads on demand, every video plays in the page, a Mode sees
   its own videos and the Mode below, and only Pro gets links that leave the site. YouTube itself is answered with
   an empty page here, so no test loads a third-party player (tests/videos.live.spec.ts checks the real embeds). */

async function noYouTube(page: Page) {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
  await page.route(/^https:\/\/i\.ytimg\.com\//, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
}
test.beforeEach(async ({ page }) => { await noYouTube(page); });

const cards = (page: Page) => page.locator('#view button.watch-card');
async function openShelf(page: Page) {
  await open(page, '#/watch');
  await expect(cards(page).first()).toBeVisible();
}
const chip = (page: Page, group: string, name: string) => page.getByRole('group', { name: group, exact: true }).getByRole('button', { name, exact: true });
const modesOf = (page: Page) => cards(page).evaluateAll(els => els.map(e => (e as HTMLElement).dataset.modes || ''));

for (const [mode, sees] of [['explorer', ['explorer']], ['challenger', ['challenger', 'explorer']], ['pro', ['pro', 'challenger']]] as [Mode, Mode[]][]) {
  test.describe(mode, () => {
    test.use({ seedMode: mode });
    test(`the shelf opens on ${mode} videos and shows only what ${mode} may see`, async ({ page }) => {
      await openShelf(page);
      for (const m of await modesOf(page)) expect(m.split(' '), m).toContain(mode);
      if (sees.length > 1) {
        await chip(page, 'Mode', 'Both').click();
        await expect(chip(page, 'Mode', 'Both')).toHaveAttribute('aria-pressed', 'true');
      } else await expect(page.locator('#view').getByRole('group', { name: 'Mode', exact: true })).toHaveCount(0);
      for (const m of await modesOf(page)) expect(m.split(' ').some(x => sees.includes(x as Mode)), m).toBe(true);
      if (mode === 'pro') for (const m of await modesOf(page)) expect(m, 'no Explorer-only video for Pro').not.toBe('explorer');
    });
  });
}

test('Shorts plus Tricks shows only Short tiles matched to a Trick', async ({ page }) => {
  await openShelf(page);
  await chip(page, 'Videos or Shorts', 'Shorts').click();
  await chip(page, 'Tricks', 'Tricks only').click();
  const n = await cards(page).count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    await expect(cards(page).nth(i)).toHaveClass(/watch-card--short/);
    await expect(cards(page).nth(i)).not.toHaveAttribute('data-tricks', '');
  }
});

test('the shelf promises 12 minutes at most, and each length chip keeps only videos of that length', async ({ page }) => {
  await openShelf(page);
  await expect(page.locator('#view .md-lede')).toContainText('none is longer than 12 minutes');
  await chip(page, 'Mode', 'Both').click();
  const group = page.getByRole('group', { name: 'Length', exact: true });
  await expect(group.getByRole('button')).toHaveText(['Any length', 'Under 2 min', '2 to 5 min', '5 to 8 min', '8 to 12 min']);
  const all = await cards(page).evaluateAll(els => els.map(e => Number((e as HTMLElement).dataset.secs)));
  for (const s of all) expect(s).toBeLessThan(720);
  for (const [name, lo, hi] of [['Under 2 min', 0, 120], ['2 to 5 min', 120, 300], ['5 to 8 min', 300, 480], ['8 to 12 min', 480, 720]] as const) {
    await chip(page, 'Length', name).click();
    await expect(chip(page, 'Length', name)).toHaveAttribute('aria-pressed', 'true');
    const secs = await cards(page).evaluateAll(els => els.map(e => Number((e as HTMLElement).dataset.secs)));
    expect(secs.length, name).toBe(all.filter(s => s >= lo && s < hi).length);
    for (const s of secs) { expect(s, name).toBeGreaterThanOrEqual(lo); expect(s, name).toBeLessThan(hi); }
    if (!secs.length) await expect(page.locator('#view')).toContainText('No videos match these filters yet.');
  }
});

test('Challenger gets no link that leaves the site; the player has no Open on YouTube', async ({ page }) => {
  await openShelf(page);
  await chip(page, 'Mode', 'Both').click();
  await expect(page.locator('#view .watch-links')).toHaveCount(0);
  await expect(page.locator('#view a[target="_blank"]')).toHaveCount(0);
  await cards(page).first().click();
  const dlg = page.locator('dialog.vm-player');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
  await expect(dlg.locator('.vp-yt')).toHaveCount(0);
  await expect(dlg.locator('a[target="_blank"]')).toHaveCount(0);
});

test.describe('pro', () => {
  test.use({ seedMode: 'pro' });
  test('Pro sees sites and games marked as opening a new tab, and Open on YouTube in the player', async ({ page }) => {
    await openShelf(page);
    const links = page.locator('#view .watch-links');
    await expect(links).toContainText('Opens in a new tab');
    expect(await links.locator('a[target="_blank"]').count()).toBeGreaterThan(5);
    await chip(page, 'Videos or Shorts', 'Links').click();
    await expect(cards(page)).toHaveCount(0);
    await expect(links).toBeVisible();
    await chip(page, 'Videos or Shorts', 'Everything').click();
    await cards(page).first().click();
    await expect(page.locator('dialog.vm-player .vp-yt')).toHaveAttribute('href', /^https:\/\/www\.youtube\.com\/watch\?v=/);
  });

  test('Pro on a hand-matched Trick sees its videos and no keyword extras', async ({ page }) => {
    await open(page, '#/skill/v-sq5');
    const box = page.locator('[data-watch-for]');
    await expect(box).toHaveAttribute('data-how', 'hand');
    const n = await box.locator('button[data-watch]').count();
    expect(n).toBeGreaterThanOrEqual(2); expect(n).toBeLessThanOrEqual(3);
    const tricks = await page.evaluate(async yts => { const { VIDEOS } = await import('/vedic-math/js/videos.js' as string); return yts.map((y: string) => VIDEOS.find((v: any) => v.yt === y).tricks); },
      await box.locator('button[data-watch]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.watch)));
    for (const t of tricks) expect(t).toContain('sq5');
  });

  test('the Sutras page lists outside reading and critiques for Pro', async ({ page }) => {
    await open(page, '#/sutras');
    const more = page.locator('[data-history-links]');
    await expect(more).toBeVisible();
    await expect(more.getByRole('link', { name: 'Vedic Mathematics (Wikipedia)' })).toHaveAttribute('target', '_blank');
    await expect(more).toContainText('arXiv');
  });
});

test('Challenger on a Trick with a made-for-kids video sees only that one', async ({ page }) => {
  await open(page, '#/skill/v-near-base');
  const box = page.locator('[data-watch-for]');
  await expect(box).toHaveAttribute('data-how', 'hand');
  await expect(box.locator('button[data-watch]')).toHaveCount(1);
  await expect(box.locator('button[data-watch]')).toHaveAttribute('data-watch', 'f0W32SwhAwM');
});

/* The videos behind a Skill or Trick page's "Watch it explained" buttons, from js/videos.js */
const watchPicks = async (page: Page) => {
  const box = page.locator('[data-watch-for]');
  await expect(box).toHaveAttribute('data-how', 'hand');
  const yts = await box.locator('button[data-watch]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.watch));
  return page.evaluate(async ys => { const { VIDEOS } = await import('/vedic-math/js/videos.js' as string); return ys.map((y: string) => VIDEOS.find((v: any) => v.yt === y)); }, yts);
};

test('a grade 6 to 8 Skill shows its own hand-matched videos, made for kids first for Challenger', async ({ page }) => {
  await open(page, '#/skill/7-pctchange');
  let picks = await watchPicks(page);
  expect(picks.length).toBeGreaterThanOrEqual(2);
  for (const v of picks) { expect(v.skills).toContain('7-pctchange'); expect(v.modes).toContain('challenger'); }
  await open(page, '#/skill/7-circle');
  picks = await watchPicks(page);
  expect(picks.length).toBeGreaterThanOrEqual(2);
  for (const v of picks) { expect(v.skills).toContain('7-circle'); expect(v.madeForKids).toBe(true); }
});

test.describe('pro', () => {
  test.use({ seedMode: 'pro' });
  test('Pro on a grade 8 Skill sees hand-matched videos, Pro-only ones included', async ({ page }) => {
    await open(page, '#/skill/8-lineq');
    const picks = await watchPicks(page);
    expect(picks.length).toBe(3);
    for (const v of picks) { expect(v.skills).toContain('8-lineq'); expect(v.modes).toContain('pro'); }
    expect(picks.some((v: any) => v.modes.join() === 'pro')).toBe(true);
  });
});

test('a Skill with no hand-matched video gets keyword matches or no Watch section', async ({ page }) => {
  await open(page, '#/skill/3-multtens');
  await expect(page.locator('[data-watch-for]')).toHaveAttribute('data-how', 'keyword');
  await open(page, '#/skill/11-logs');
  await expect(page.locator('#practice')).toBeVisible();
  await page.waitForFunction(() => import('/vedic-math/js/videos.js' as string));
  await expect(page.locator('[data-watch-for] button')).toHaveCount(0);
  await expect(page.locator('#view')).not.toContainText('Watch it explained');
});

test('the Sutras page and a deep dive have no outside link and no critique for Challenger; the deep dive video plays here', async ({ page }) => {
  await open(page, '#/sutras');
  await page.waitForFunction(() => import('/vedic-math/js/videos.js' as string));
  await expect(page.locator('[data-history-links]')).toBeHidden();
  await expect(page.locator('#view a[target="_blank"]')).toHaveCount(0);
  await expect(page.locator('#view')).not.toContainText('arXiv');
  await page.goto(`${APP}#/sutras/s1`);
  const dd = page.locator('dialog.sutra-modal');
  await expect(dd).toBeVisible();
  await expect(dd.locator('a[target="_blank"]')).toHaveCount(0);
  await expect(dd).not.toContainText('(Wikipedia)');
  await dd.locator('button[data-watch]').first().click();
  await expect(page.locator('dialog.vm-player iframe')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/oV7Kxm3Zr_c/);
});

test('a Short plays tall in the page, and closing it starts nothing else', async ({ page }) => {
  await openShelf(page);
  await chip(page, 'Videos or Shorts', 'Shorts').click();
  await cards(page).first().click();
  const dlg = page.locator('dialog.vm-player');
  await expect(dlg).toHaveClass(/\btall\b/);
  await expect(dlg.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?autoplay=1&rel=0/);
  await dlg.locator('.vp-x').click();
  await expect(dlg).toBeHidden();
  await expect(dlg.locator('iframe')).toHaveCount(0);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('the video list is not part of first loads, and the shelf requests it once', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', r => { if (/\/vedic-math\/js\/videos\.js/.test(r.url())) asked.push(r.url()); });
  await open(page);
  await open(page, '#/game/times-sprint');
  await page.waitForLoadState('networkidle');
  expect(asked, 'home and a game do not load the video list').toEqual([]);
  await page.locator('.mq-nav').getByRole('link', { name: 'Watch', exact: true }).click();
  await expect(cards(page).first()).toBeVisible();
  await page.locator('.mq-nav').getByRole('link', { name: 'Games', exact: true }).click();
  await page.locator('.mq-nav').getByRole('link', { name: 'Watch', exact: true }).click();
  await expect(cards(page).first()).toBeVisible();
  expect(asked).toHaveLength(1);
});
