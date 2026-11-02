import { test, expect, APP, open, type Mode } from './fixtures';
import type { Page, Locator } from '@playwright/test';

/* The Watch shelf (openspec watch-shelf): the list loads on demand, every video plays in the page, a Mode sees
   its own videos and the Mode below, and only Pro gets links that leave the site. The player opens on a facade (this
   site's thumbnail behind a play button) and writes the YouTube frame only when play is pressed (change learnvedicmath,
   design D10). YouTube itself is answered with an empty page here, so no test loads a third-party player
   (tests/videos.live.spec.ts checks the real embeds). */

async function noYouTube(page: Page) {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
}
test.beforeEach(async ({ page }) => { await noYouTube(page); });
/** Presses play on the open player's facade, which writes the YouTube frame */
const play = (page: Page) => page.locator('dialog.vm-player .vp-play').click();

/* The facade (change learnvedicmath, watch-shelf "Before play", task 7.2): opening a video's player creates no frame
   and reaches no YouTube host; the press on play does both. Google hosts are counted too, so a thumbnail or a script
   from one would show here. */
const GOOGLE_OR_YOUTUBE = /(^|\.)(youtube(-nocookie)?\.com|ytimg\.com|googlevideo\.com|google\.com|gstatic\.com|googleapis\.com)$/;
async function expectFacadeThenPlay(page: Page, opener: Locator) {
  const yt: string[] = [];
  page.on('request', r => { if (GOOGLE_OR_YOUTUBE.test(new URL(r.url()).host)) yt.push(r.url()); });
  const framesBefore = page.frames().length;
  await opener.click();
  const dlg = page.locator('dialog.vm-player');
  await expect(dlg).toBeVisible();
  const facade = dlg.locator('.vp-play');
  await expect(facade).toBeFocused();
  await expect(facade.locator('img')).toHaveAttribute('src', /^\/thumbs\/yt-[\w-]{11}\.webp$/);
  await expect.poll(() => facade.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0), 'the thumbnail loaded from this site').toBe(true);
  await expect(dlg.locator('iframe')).toHaveCount(0);
  expect(page.frames().length, 'no frame before play').toBe(framesBefore);
  expect(yt, 'no YouTube or Google request before play').toEqual([]);
  await facade.click();
  await expect(dlg.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?autoplay=1&/);
  await expect.poll(() => page.frames().length, 'one frame after play').toBe(framesBefore + 1);
  await expect.poll(() => yt.length, 'the frame reaches youtube-nocookie.com after play').toBeGreaterThan(0);
  for (const u of yt) expect(new URL(u).host, u).toBe('www.youtube-nocookie.com');
  await dlg.locator('.vp-x').click();
  await expect(dlg).toBeHidden();
  await expect(dlg.locator('iframe')).toHaveCount(0);
}

test('the shelf: opening a video creates no frame and reaches no YouTube host until play is pressed', async ({ page }) => {
  await openShelf(page);
  await expectFacadeThenPlay(page, cards(page).first());
});

test("a Skill's Watch section: its Watch it explained buttons open the same facade", async ({ page }) => {
  await open(page, '#/skill/v-sq5');
  const btn = page.locator('[data-watch-for] button[data-watch]').first();
  await expect(btn).toBeVisible();
  await expectFacadeThenPlay(page, btn);
});

/* Thumbnails come from this site (openspec change learnvedicmath, third-party-requests "Self-hosted thumbnails") */
test('the shelf shows every thumbnail from /thumbs/ and reaches no YouTube or ytimg host', async ({ page, baseURL }) => {
  const outside: string[] = [];
  page.on('request', r => { if (/ytimg\.com|youtube(-nocookie)?\.com|googlevideo/.test(new URL(r.url()).host)) outside.push(r.url()); });
  await openShelf(page);
  const imgs = cards(page).locator('img');
  await expect.poll(() => imgs.evaluateAll(is => is.slice(0, 6).every(i => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0))).toBe(true);
  for (const src of await imgs.evaluateAll(is => is.map(i => (i as HTMLImageElement).src))) expect(src.startsWith(`${new URL(baseURL!).origin}/thumbs/yt-`), src).toBe(true);
  expect(outside).toEqual([]);
});

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
    test(`the shelf opens on every Mode ${mode} may see, and shows only that`, async ({ page }) => {
      await openShelf(page);
      for (const m of await modesOf(page)) expect(m.split(' ').some(x => sees.includes(x as Mode)), m).toBe(true);
      if (mode === 'pro') for (const m of await modesOf(page)) expect(m, 'no Explorer-only video for Pro').not.toBe('explorer');
      if (sees.length > 1) {
        await expect(chip(page, 'Mode', 'Both')).toHaveAttribute('aria-pressed', 'true');
        const own = chip(page, 'Mode', mode[0].toUpperCase() + mode.slice(1));
        await expect(own).toHaveAttribute('aria-pressed', 'false');
        await own.click();
        await expect(own).toHaveAttribute('aria-pressed', 'true');
        await expect(chip(page, 'Mode', 'Both')).toHaveAttribute('aria-pressed', 'false');
        await expect(cards(page).first()).toBeVisible();
        for (const m of await modesOf(page)) expect(m.split(' '), m).toContain(mode);
      } else {
        await expect(page.locator('#view').getByRole('group', { name: 'Mode', exact: true })).toHaveCount(0);
        for (const m of await modesOf(page)) expect(m.split(' '), m).toContain(mode);
      }
    });
    test(`${mode}: the shelf opens on Videos, and Shorts are shown only on their own`, async ({ page }) => {
      await openShelf(page);
      // Pro's kind chips include Links, and their group says so
      const KIND = mode === 'pro' ? 'Videos, Shorts or Links' : 'Videos or Shorts';
      const kinds = page.getByRole('group', { name: KIND, exact: true }).getByRole('button');
      await expect(kinds).toHaveText(mode === 'pro' ? ['Videos', 'Shorts', 'Links'] : ['Videos', 'Shorts']);
      await expect(chip(page, KIND, 'Videos')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#view .watch-card--short')).toHaveCount(0);
      for (const k of await cards(page).evaluateAll(els => els.map(e => (e as HTMLElement).dataset.kind))) expect(k).toBe('video');
      await expect(page.locator('#view .watch-links')).toHaveCount(0);
      await chip(page, KIND, 'Shorts').click();
      await expect(chip(page, KIND, 'Shorts')).toHaveAttribute('aria-pressed', 'true');
      await expect(chip(page, KIND, 'Videos')).toHaveAttribute('aria-pressed', 'false');
      await expect(cards(page).first()).toBeVisible();
      const n = await cards(page).count();
      await expect(page.locator('#view button.watch-card--short')).toHaveCount(n);
      for (const k of await cards(page).evaluateAll(els => els.map(e => (e as HTMLElement).dataset.kind))) expect(k).toBe('short');
      await expect(page.locator('#view .watch-links')).toHaveCount(0);
    });
  });
}

test.describe('explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Explorer has a full shelf, and a kindergarten Skill shows its own made-for-kids videos', async ({ page }) => {
    await openShelf(page);
    expect(await cards(page).count(), 'Explorer videos (Shorts are their own chip)').toBeGreaterThanOrEqual(40);
    await open(page, '#/skill/k-bonds');
    const box = page.locator('[data-watch-for]');
    await expect(box).toHaveAttribute('data-how', 'hand');
    const yts = await box.locator('button[data-watch]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.watch));
    expect(yts.length).toBeGreaterThanOrEqual(2);
    const picked = await page.evaluate(async ys => { const { VIDEOS } = await e2eMod('videos'); return ys.map((y: string) => VIDEOS.find((v: any) => v.yt === y)); }, yts);
    for (const v of picked) {
      expect(v.skills).toContain('k-bonds');
      expect(v.madeForKids).toBe(true);
      expect(v.modes).toEqual(['explorer']);
    }
  });
});

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
  await expect(chip(page, 'Mode', 'Both')).toHaveAttribute('aria-pressed', 'true');
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
  await expect(chip(page, 'Mode', 'Both')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#view .watch-links')).toHaveCount(0);
  await expect(page.locator('#view a[target="_blank"]')).toHaveCount(0);
  await cards(page).first().click();
  const dlg = page.locator('dialog.vm-player');
  await expect(dlg).toBeVisible();
  await play(page);
  await expect(dlg.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
  await expect(dlg.locator('.vp-yt')).toHaveCount(0);
  await expect(dlg.locator('a[target="_blank"]')).toHaveCount(0);
});

test.describe('pro', () => {
  test.use({ seedMode: 'pro' });
  test('Pro sees sites and games marked as opening a new tab, and Open on YouTube in the player', async ({ page }) => {
    await openShelf(page);
    const links = page.locator('#view .watch-links');
    await expect(links, 'sites and games only under Links').toHaveCount(0);
    await chip(page, 'Videos, Shorts or Links', 'Links').click();
    await expect(cards(page)).toHaveCount(0);
    await expect(links).toBeVisible();
    await expect(links).toContainText('Opens in a new tab');
    expect(await links.locator('a[target="_blank"]').count()).toBeGreaterThan(5);
    await chip(page, 'Videos, Shorts or Links', 'Videos').click();
    await expect(links).toHaveCount(0);
    await cards(page).first().click();
    await expect(page.locator('dialog.vm-player .vp-yt')).toHaveAttribute('href', /^https:\/\/www\.youtube\.com\/watch\?v=/);
  });

  test('Pro on a hand-matched Trick sees its videos and no keyword extras', async ({ page }) => {
    await open(page, '#/skill/v-sq5');
    const box = page.locator('[data-watch-for]');
    await expect(box).toHaveAttribute('data-how', 'hand');
    const n = await box.locator('button[data-watch]').count();
    expect(n).toBeGreaterThanOrEqual(2); expect(n).toBeLessThanOrEqual(3);
    const tricks = await page.evaluate(async yts => { const { VIDEOS } = await e2eMod('videos'); return yts.map((y: string) => VIDEOS.find((v: any) => v.yt === y).tricks); },
      await box.locator('button[data-watch]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.watch)));
    for (const t of tricks) expect(t).toContain('sq5');
  });

  test('the Sutras page lists outside reading and critiques for Pro', async ({ page }) => {
    await open(page, '#/sutras');
    const more = page.locator('[data-history-links]');
    await expect(more).toBeVisible();
    await expect(more.getByRole('link', { name: 'Vedic Mathematics (Wikipedia)' })).toHaveAttribute('target', '_blank');
    await expect(more).toContainText('arXiv');
    await expect(page.locator('#verse-tirtha-gopi-pi .verse-refs')).toContainText("sūtras' origin");
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
  return page.evaluate(async ys => { const { VIDEOS } = await e2eMod('videos'); return ys.map((y: string) => VIDEOS.find((v: any) => v.yt === y)); }, yts);
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
  await open(page, '#/skill/9-radicals');
  await expect(page.locator('[data-watch-for]')).toHaveAttribute('data-how', 'keyword');
  await open(page, '#/skill/11-logs');
  await expect(page.locator('#practice')).toBeVisible();
  await page.waitForFunction(() => e2eMod('videos'));
  await expect(page.locator('[data-watch-for] button')).toHaveCount(0);
  await expect(page.locator('#view')).not.toContainText('Watch it explained');
});

test('the Sutras page and a deep dive have no outside link and no critique for Challenger; the deep dive video plays here', async ({ page }) => {
  await open(page, '#/sutras');
  await page.waitForFunction(() => e2eMod('videos'));
  await expect(page.locator('[data-history-links]')).toBeHidden();
  await expect(page.locator('#view a[target="_blank"]')).toHaveCount(0);
  // The history card lists no critique; the verse cards' sources leave out the one that questions the Sutras' origin
  await expect(page.locator('#view .history').first()).not.toContainText('arXiv');
  await expect(page.locator('#view')).not.toContainText("sūtras' origin");
  await page.goto(`${APP}#/sutras/s1`);
  const dd = page.locator('dialog.sutra-modal');
  await expect(dd).toBeVisible();
  await expect(dd.locator('a[target="_blank"]')).toHaveCount(0);
  await expect(dd).not.toContainText('(Wikipedia)');
  await dd.locator('button[data-watch]').first().click();
  await expect(page.locator('dialog.vm-player .vp-play img')).toHaveAttribute('src', '/thumbs/yt-oV7Kxm3Zr_c.webp');
  await play(page);
  await expect(page.locator('dialog.vm-player iframe')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/oV7Kxm3Zr_c/);
});

test('a Short plays tall in the page, and closing it starts nothing else', async ({ page }) => {
  await openShelf(page);
  await chip(page, 'Videos or Shorts', 'Shorts').click();
  await cards(page).first().click();
  const dlg = page.locator('dialog.vm-player');
  await expect(dlg).toHaveClass(/\btall\b/);
  await expect(dlg.locator('iframe')).toHaveCount(0);
  await play(page);
  await expect(dlg.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?autoplay=1&rel=0/);
  await dlg.locator('.vp-x').click();
  await expect(dlg).toBeHidden();
  await expect(dlg.locator('iframe')).toHaveCount(0);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('the video list is not part of first loads, and the shelf requests it once', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', r => { if (/\/js\/videos\.js/.test(r.url())) asked.push(r.url()); });
  await open(page);
  await open(page, '#/game/times-sprint');
  await page.waitForLoadState('networkidle');
  expect(asked, 'home and a game do not load the video list').toEqual([]);
  await page.locator('.mq-nav').getByRole('link', { name: 'Watch', exact: true }).click();
  await expect(cards(page).first()).toBeVisible();
  await page.locator('.mq-nav').getByRole('link', { name: 'Arcade', exact: true }).click(); /* away and back without a reload (Games is in the Arcade: openspec change play-nav-by-mode) */
  await page.locator('.mq-nav').getByRole('link', { name: 'Watch', exact: true }).click();
  await expect(cards(page).first()).toBeVisible();
  expect(asked).toHaveLength(1);
});

/* The Video learner badge (Muse review round 2): a minute in the player earns it, and its toast shows inside the open
   player dialog, which sits in the top layer above the page (fx.toast puts the toasts in the open dialog). */
test.describe('the Video learner badge toast', () => {
  test.use({ seedMode: 'challenger' });

  test('after a minute in the player, the badge toast shows inside the dialog', async ({ page }) => {
    await page.addInitScript(() => { (window as any).goatcounter ||= { count() {} }; });
    await open(page, '#/watch');
    await expect(cards(page).first()).toBeVisible();
    await page.clock.install();
    await cards(page).first().click();
    const dlg = page.locator('dialog.vm-player');
    await expect(dlg).toBeVisible();
    await play(page); // the minute starts with play, not with the facade
    await expect(dlg.locator('iframe')).toHaveCount(1);
    await expect(page.locator('.fx-toast')).toHaveCount(0);
    await page.clock.fastForward(61_000);
    const toast = dlg.locator('.fx-toasts .fx-toast');
    await expect(toast).toContainText('Badge earned: Video learner');
    await expect(toast).toBeVisible();
    expect(await page.evaluate(() => (JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}').badges || {}).watch ? 1 : 0)).toBe(1);
  });
});
