import { test, expect, open, APP, type Page } from './fixtures';

/* Narrow screens (openspec change muse-review-polish, design D6; accessibility spec "Small links have 24 pixel
   targets", WCAG 2.2 2.5.8): at 360 by 740 every breadcrumb link, the play pages' back link and Home's Quick tour have
   a target at least 24 px tall, and the sutra deep dive's Previous and Next show the whole sutra name. */

test.use({ viewport: { width: 360, height: 740 } });

const heights = (page: Page, sel: string) => page.locator(sel).evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height * 10) / 10));

test('breadcrumb links on a Star, a Kata list, a game and a tower chapter are at least 24 px tall', async ({ page }) => {
  for (const hash of ['#/star/sq5/1', '#/katas/sq5', '#/game/times-sprint', '#/tower/1', '#/me', '#/guide']) {
    await open(page, hash);
    const hs = await heights(page, '.mq-crumbs a');
    expect(hs.length, `${hash} has breadcrumbs`).toBeGreaterThan(0);
    for (const h of hs) expect(h, `${hash}: a breadcrumb link is ${h} px tall`).toBeGreaterThanOrEqual(24);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${hash} has no sideways scroll`).toBe(true);
  }
});

test('the play pages\' back link and Home\'s Quick tour are at least 24 px tall', async ({ page }) => {
  for (const hash of ['#/dojo/locks', '#/arena/daily-number', '#/games/tala']) {
    await open(page, hash);
    const [h] = await heights(page, '.px-back');
    expect(h, `${hash}: the back link is ${h} px tall`).toBeGreaterThanOrEqual(24);
    if (hash === '#/arena/daily-number') {
      // Daily Number's Archive link too (design D6)
      const links = await heights(page, '.dn-link');
      expect(links.length).toBeGreaterThan(0);
      for (const l of links) expect(l, `the Archive link is ${l} px tall`).toBeGreaterThanOrEqual(24);
    }
  }
  await open(page, '#/');
  const [tour] = await heights(page, '#tourAgain');
  expect(tour).toBeGreaterThanOrEqual(24);
});

test('the deep dive\'s Previous and Next show the full sutra names, wrapping instead of an ellipsis', async ({ page }) => {
  // s2 is Nikhilaṃ Navataścaramaṃ Daśataḥ, the longest name: Next from s1 and Previous from s3
  for (const id of ['s1', 's3', 'u8']) {
    await page.goto(`${APP}#/sutras/${id}`);
    const d = page.locator('dialog.sutra-modal');
    await expect(d).toBeVisible();
    const links = d.locator('.sd-foot a');
    expect(await links.count()).toBeGreaterThan(0);
    const seen = await links.evaluateAll(as => as.map(a => {
      const s = a.querySelector('span')!, cs = getComputedStyle(s);
      return { name: (a.getAttribute('aria-label') || '').replace(/^(Previous|Next): /, ''), text: s.textContent, fits: s.scrollWidth <= s.clientWidth + 1, nowrap: cs.whiteSpace === 'nowrap', inside: a.getBoundingClientRect().right <= innerWidth && a.getBoundingClientRect().left >= 0 };
    }));
    for (const l of seen) {
      expect(l.text, `${id}: the button holds the whole name`).toBe(l.name);
      expect(l.nowrap, `${id}: ${l.name} may wrap`).toBe(false);
      expect(l.fits, `${id}: ${l.name} is not cut`).toBe(true);
      expect(l.inside, `${id}: the button is on screen`).toBe(true);
    }
  }
});
