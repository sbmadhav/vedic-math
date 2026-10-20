import { test, expect, open } from '../fixtures';
import type { Page } from '@playwright/test';

/* watch-shelf scenarios:
   - Filters on the Watch shelf / Shorts about tricks: a Challenger who picks Shorts and the Tricks filter sees only
     Shorts matched to a Trick and visible to Challenger.
   - Hand-picked videos first, keywords as a fallback / Hand-matched Trick: a Pro on Square numbers ending in 5
     (three hand-matched videos) sees those videos and no keyword match is added.
   tests/watch.spec.ts covers part of each (Short class and a non-empty Trick list; data-how=hand and every pick
   has sq5). Here each is checked exactly: once against the real list (the shown set equals what the rules allow)
   and once against a fixed list served in place of js/videos.js, so the "three hand-matched" premise and the
   decoys (a keyword match, a Short with no Trick, a Pro-only Short) are always present. YouTube is answered locally. */

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
  await page.route(/^https:\/\/i\.ytimg\.com\//, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
});

type V = { id: string; title: string; channel: string; yt: string; duration: number; kind: 'video' | 'short'; modes: string[]; skills: string[]; tricks: string[]; madeForKids: boolean; captions: boolean; checked: string; why: string; critique?: boolean };
const vid = (id: string, yt: string, o: Partial<V>): V => ({ id, title: `Fixture ${id}`, channel: 'Fixture', yt, duration: 100, kind: 'video', modes: ['challenger'], skills: [], tricks: [], madeForKids: false, captions: true, checked: '2026-10-15', why: 'A fixture entry.', ...o });

/** Serves a fixed list in place of js/videos.js (any ?v= stamp). */
async function serveList(page: Page, videos: V[]) {
  await page.route(/\/js\/videos\.js(\?.*)?$/, r => r.fulfill({ status: 200, contentType: 'text/javascript',
    body: `export const VIDEOS = ${JSON.stringify(videos)};\nexport const LINKS = [];\n` }));
}

const cards = (page: Page) => page.locator('#view button.watch-card');
const chip = (page: Page, group: string, name: string) => page.getByRole('group', { name: group, exact: true }).getByRole('button', { name, exact: true });
const shownIds = (page: Page) => cards(page).evaluateAll(els => els.map(e => (e as HTMLElement).dataset.watch || ''));
const realList = (page: Page) => page.evaluate(async () => (await import('/js/videos.js' as string)).VIDEOS as V[]);
const challengerSees = (v: V) => v.modes.some(m => m === 'challenger' || m === 'explorer') && !v.critique;
const proSees = (v: V) => v.modes.some(m => m === 'pro' || m === 'challenger');

async function shortsAndTricks(page: Page, both: boolean) {
  await open(page, '#/watch');
  await expect(cards(page).first()).toBeVisible();
  // The shelf opens on Both; the Player's own Mode chip narrows it
  await expect(chip(page, 'Mode', 'Both')).toHaveAttribute('aria-pressed', 'true');
  if (!both) await chip(page, 'Mode', 'Challenger').click();
  await chip(page, 'Videos or Shorts', 'Shorts').click();
  await chip(page, 'Tricks', 'Tricks only').click();
  await expect(chip(page, 'Videos or Shorts', 'Shorts')).toHaveAttribute('aria-pressed', 'true');
  await expect(chip(page, 'Tricks', 'Tricks only')).toHaveAttribute('aria-pressed', 'true');
}

test.describe('Shorts about tricks (Challenger)', () => {
  test.use({ seedMode: 'challenger' });

  test('real list: Shorts plus Tricks shows exactly the Trick Shorts Challenger may see', async ({ page }) => {
    await shortsAndTricks(page, true);
    const list = await realList(page);
    const expected = list.filter(v => v.kind === 'short' && v.tricks.length > 0 && challengerSees(v)).map(v => v.yt).sort();
    expect(expected.length, 'the real list has Trick Shorts for Challenger').toBeGreaterThan(0);
    await expect(cards(page)).toHaveCount(expected.length);
    expect((await shownIds(page)).sort()).toEqual(expected);
    for (const c of await cards(page).all()) {
      await expect(c).toHaveClass(/watch-card--short/);
      await expect(c).toHaveAttribute('data-kind', 'short');
      await expect(c).not.toHaveAttribute('data-tricks', '');
      expect(((await c.getAttribute('data-modes')) || '').split(' ').some(m => m === 'challenger' || m === 'explorer')).toBe(true);
    }
  });

  const FIX = [
    vid('trick-short-ch', 'TrkShortCh1', { kind: 'short', duration: 40, modes: ['challenger'], tricks: ['by11'] }),
    vid('trick-short-ex', 'TrkShortEx1', { kind: 'short', duration: 30, modes: ['explorer'], tricks: ['by9s'], madeForKids: true }),
    vid('trick-short-pro', 'TrkShortPr1', { kind: 'short', duration: 20, modes: ['pro'], tricks: ['sq5'] }),
    vid('plain-short-ch', 'PlnShortCh1', { kind: 'short', duration: 25, modes: ['challenger'], skills: ['3-mult'] }),
    vid('trick-video-ch', 'TrkVideoCh1', { kind: 'video', duration: 90, modes: ['challenger'], tricks: ['sq5'] }),
    vid('plain-video-ch', 'PlnVideoCh1', { kind: 'video', duration: 60, modes: ['challenger'], skills: ['3-mult'] }),
  ];

  test('fixed list: only Shorts matched to a Trick and visible to Challenger are shown', async ({ page }) => {
    await serveList(page, FIX);
    await shortsAndTricks(page, true);
    await expect(cards(page)).toHaveCount(2);
    expect((await shownIds(page)).sort()).toEqual(['TrkShortCh1', 'TrkShortEx1']);
    await expect(page.locator('#view')).not.toContainText('Fixture trick-short-pro');
    await expect(page.locator('#view')).not.toContainText('Fixture plain-short-ch');
    await expect(page.locator('#view')).not.toContainText('Fixture trick-video-ch');
  });

  test('fixed list: on the Player\'s own Mode chip, Shorts plus Tricks still shows only Challenger Trick Shorts', async ({ page }) => {
    await serveList(page, FIX);
    await shortsAndTricks(page, false);
    await expect(chip(page, 'Mode', 'Challenger')).toHaveAttribute('aria-pressed', 'true');
    await expect(cards(page)).toHaveCount(1);
    expect(await shownIds(page)).toEqual(['TrkShortCh1']);
  });
});

test.describe('Hand-matched Trick (Pro on Square numbers ending in 5)', () => {
  test.use({ seedMode: 'pro' });
  const box = (page: Page) => page.locator('[data-watch-for]');

  test('real list: the hand-matched sq5 videos are shown and no keyword match is added', async ({ page }) => {
    await open(page, '#/skill/v-sq5');
    await expect(box(page)).toHaveAttribute('data-how', 'hand');
    const list = await realList(page);
    const hand = list.filter(v => v.tricks.includes('sq5') && proSees(v)).sort((a, b) => a.duration - b.duration).map(v => v.yt);
    expect(hand.length, 'sq5 has hand-matched videos for Pro').toBeGreaterThanOrEqual(2);
    const btns = box(page).locator('button[data-watch]');
    await expect(btns).toHaveCount(Math.min(3, hand.length));
    expect(await btns.evaluateAll(els => els.map(e => (e as HTMLElement).dataset.watch))).toEqual(hand.slice(0, 3));
  });

  test('fixed list with three hand-matched videos and a keyword decoy: exactly those three, no keyword match', async ({ page }) => {
    await serveList(page, [
      vid('sq5-pro', 'Sq5ProVid01', { duration: 200, modes: ['pro'], tricks: ['sq5'], title: 'Fives squared, decimals too' }),
      vid('sq5-ch', 'Sq5ChalVid1', { duration: 100, modes: ['challenger'], tricks: ['sq5'], title: 'Fives squared fast' }),
      vid('sq5-short', 'Sq5Short001', { kind: 'short', duration: 50, modes: ['challenger'], tricks: ['sq5'], title: 'Fives squared in a minute' }),
      // keyword decoys: no Trick, but "square", "vedic" and "multiply" match the Trick's words; shortest, so a keyword pick would come first
      vid('kw-decoy', 'KwDecoyVid1', { duration: 10, modes: ['pro'], title: 'Vedic square numbers', why: 'Square numbers ending in 5 the vedic way.' }),
      vid('kw-decoy-2', 'KwDecoyVid2', { duration: 12, modes: ['challenger'], title: 'Square numbers ending in 5', why: 'Vedic squaring.' }),
      // hand-matched, but Explorer only: not visible to Pro
      vid('sq5-ex', 'Sq5ExplVid1', { duration: 30, modes: ['explorer'], tricks: ['sq5'], madeForKids: true }),
    ]);
    await open(page, '#/skill/v-sq5');
    await expect(box(page)).toHaveAttribute('data-how', 'hand');
    await expect(box(page)).toContainText('Watch it explained');
    const btns = box(page).locator('button[data-watch]');
    await expect(btns).toHaveCount(3);
    expect(await btns.evaluateAll(els => els.map(e => (e as HTMLElement).dataset.watch))).toEqual(['Sq5Short001', 'Sq5ChalVid1', 'Sq5ProVid01']);
    await expect(box(page)).not.toContainText('Vedic square numbers');
    await expect(box(page)).not.toContainText('Square numbers ending in 5');
    await expect(box(page).locator('[data-watch="KwDecoyVid1"], [data-watch="KwDecoyVid2"], [data-watch="Sq5ExplVid1"]')).toHaveCount(0);
  });
});
