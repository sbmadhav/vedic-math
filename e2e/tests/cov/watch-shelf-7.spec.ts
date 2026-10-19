import { test, expect, open, withVideos, type Mode } from '../fixtures';
import type { Page, Route } from '@playwright/test';

/* watch-shelf:
   - Hand-picked videos first, keywords as a fallback / No hand match: a Skill with no hand-matched video shows
     keyword matches visible to the Player's Mode, or no Watch section at all. tests/watch.spec.ts checks the
     section's data-how for one Mode; this checks, for every Mode, that what is shown is visible to that Mode,
     is not hand-matched, and shares a whole key word with the Skill.
   - The video Bolt offers in a Star / A Trick with a hand-matched video: tests/star.spec.ts checks that a video
     is offered and plays in the page; this checks WHICH video (hand-matched, visible to Challenger, made for kids
     first, shortest first, never a keyword match).
   YouTube is answered with an empty page, so no real player loads. The catalog keeps growing (batches of
   hand-matched videos land for more Skills), so each scenario serves the real list through withVideos with
   exactly the premise it needs, instead of leaning on a Skill that happens to have no match today. */

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
  await page.route(/^https:\/\/i\.ytimg\.com\//, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
});

type V = { yt: string; title: string; why: string; modes: string[]; skills: string[]; tricks: string[]; madeForKids: boolean; duration: number; critique?: boolean };
const SEES: Record<Mode, string[]> = { explorer: ['explorer'], challenger: ['challenger', 'explorer'], pro: ['pro', 'challenger'] };
const visible = (v: V, mode: Mode) => v.modes.some(m => SEES[mode].includes(m)) && (!v.critique || mode === 'pro');
const videos = (page: Page) => page.evaluate(async () => (await import('/vedic-math/js/videos.js' as string)).VIDEOS) as Promise<V[]>;

/* ---------- No hand match ---------- */
// "Multiply by multiples of ten" (3-multtens), served with no hand-matched video; its words include "multiply"
const MULT = /\bmultipl(?:y|ies|ied|ying|ication)\b/;
const NO_HAND = `list => list.map(v => ({ ...v, skills: v.skills.filter(s => s !== '3-multtens') }))`;

for (const mode of ['explorer', 'challenger', 'pro'] as Mode[]) {
  test.describe(`${mode}: a Skill with no hand-matched video`, () => {
    test.use({ seedMode: mode });

    test('shows keyword matches visible to the Mode, or no Watch section at all', async ({ page }) => {
      await withVideos(page, NO_HAND);
      await open(page, '#/skill/3-multtens');
      await expect(page.locator('#practice')).toBeVisible();
      const all = await videos(page);
      expect(all.filter(v => v.skills.includes('3-multtens'))).toHaveLength(0); // the premise: no hand match
      // What the keyword fallback may find for this Mode
      const candidates = all.filter(v => visible(v, mode) && MULT.test(`${v.title} ${v.why}`.toLowerCase()));
      const box = page.locator('[data-watch-for]');
      if (!candidates.length) {
        // Neither finds one: no Watch section at all
        await page.waitForTimeout(300); // fillWatch has already had its list (imported above); give it a beat
        await expect(box.locator('button')).toHaveCount(0);
        await expect(box).not.toHaveAttribute('data-how', /.+/);
        await expect(page.locator('#view')).not.toContainText('Watch it explained');
        return;
      }
      await expect(box).toHaveAttribute('data-how', 'keyword');
      await expect(box.locator('h2')).toHaveText('Watch it explained');
      const shown = await box.locator('button[data-watch]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.watch!));
      expect(shown.length).toBeGreaterThanOrEqual(1);
      expect(shown.length).toBeLessThanOrEqual(3);
      for (const yt of shown) {
        const v = all.find(x => x.yt === yt)!;
        expect(v, yt).toBeTruthy();
        expect(visible(v, mode), `${yt} visible to ${mode}`).toBe(true);
        expect(v.skills, `${yt} is not hand-matched`).not.toContain('3-multtens');
        expect(`${v.title} ${v.why}`.toLowerCase(), `${yt} keyword`).toMatch(MULT);
      }
    });
  });
}

test('a Skill with neither a hand match nor a keyword match shows no Watch section', async ({ page }) => {
  // "Discounts, tax and percent change" (7-pctchange) served with no hand match; none of its words is a key word
  // in js/related.js ("Discounts" is not "count"), which the premise below checks the way picksFor looks
  await withVideos(page, `list => list.map(v => ({ ...v, skills: v.skills.filter(s => s !== '7-pctchange') }))`);
  await open(page, '#/skill/7-pctchange');
  await expect(page.locator('#practice')).toBeVisible();
  const premise = await page.evaluate(async () => {
    const { VIDEOS } = await import('/vedic-math/js/videos.js' as string);
    const { relatedTo } = await import('/vedic-math/js/related.js' as string);
    const { byId } = await import('/vedic-math/js/skills/index.js' as string);
    const s = byId['7-pctchange'];
    return { hand: VIDEOS.filter((v: any) => v.skills.includes('7-pctchange')).length, keyword: relatedTo(`${s.title} ${s.strand}`.toLowerCase(), VIDEOS, 999).length, total: VIDEOS.length };
  });
  expect(premise.hand, 'no hand match').toBe(0);
  expect(premise.keyword, 'no keyword match').toBe(0);
  expect(premise.total, 'other videos are still listed').toBeGreaterThan(10);
  await page.waitForTimeout(300);
  await expect(page.locator('[data-watch-for] button')).toHaveCount(0);
  await expect(page.locator('#view')).not.toContainText('Watch it explained');
});

/* ---------- The video Bolt offers in a Star ---------- */
const tag = (page: Page) => page.locator('#stMain .star-tag');
const question = (page: Page, i: number) => expect(tag(page)).toHaveText(`Question ${i} of 4`);
async function enter(page: Page, v: string) { await page.keyboard.type(v); await page.keyboard.press('Enter'); }
/** Two misses in a Star (question 1 and its rematch, then question 2), skipping the replay: the offer's moment */
async function twoMisses(page: Page) {
  await question(page, 1);
  await enter(page, '1');
  await page.locator('#stRSkip').click();
  await expect(tag(page)).toHaveText('Rematch');
  await enter(page, '1');
  await expect(page.locator('#stSay')).toContainText('Close! It is');
  // The Next button can appear under the spot just tapped; move the pointer off so its hover lift does not jitter
  await page.mouse.move(0, 0);
  await page.locator('#stNext').click();
  await question(page, 2);
  await enter(page, '1');
  await expect(page.locator('.star-step').first()).toBeVisible();
  await page.keyboard.press('Escape');
}
/** The spec's rule worked out independently: hand-matched to the Trick, visible to Challenger, made for kids first, shortest first */
const expected = (all: V[], trick: string) => all
  .filter(v => v.tricks.includes(trick) && visible(v, 'challenger'))
  .sort((a, b) => Number(b.madeForKids) - Number(a.madeForKids) || a.duration - b.duration)[0];

async function offeredPlays(page: Page) {
  await expect(page.locator('.star-offer')).toBeVisible();
  const before = page.url();
  await page.mouse.move(0, 0); // the offer can appear under the spot just tapped (see twoMisses)
  await page.locator('#stWatch').click();
  const player = page.locator('dialog.vm-player');
  await expect(player).toBeVisible();
  const src = await player.locator('iframe').getAttribute('src');
  expect(src).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?/);
  expect(page.url()).toBe(before); // plays in the page
  return src!.match(/\/embed\/([\w-]{11})\?/)![1];
}

test('Challenger, two misses in a Star for Square numbers ending in 5: Bolt offers the shortest made-for-kids-first hand-matched video, in the page', async ({ page }) => {
  await open(page, '#/star/sq5/1');
  const want = expected(await videos(page), 'sq5');
  expect(want).toBeTruthy();
  await twoMisses(page);
  expect(await offeredPlays(page)).toBe(want.yt);
});

test('the Star offer prefers a made-for-kids hand match over a shorter one, skips Pro-only entries and never offers a keyword match', async ({ page }) => {
  // The real list plus three entries: a longer made-for-kids sq5 video for Challenger, a shorter made-for-kids
  // sq5 video for Pro only, and a very short made-for-kids keyword-only video (its title names the Trick, no tricks)
  const extra = [
    { id: 'e2e-kids-long', yt: 'KIDSLONG001', title: 'E2E kids long', channel: 'e2e', duration: 230, kind: 'video', modes: ['challenger'], skills: [], tricks: ['sq5'], madeForKids: true, captions: true, checked: '2026-10-15', why: 'e2e' },
    { id: 'e2e-pro-short', yt: 'PROSHORT001', title: 'E2E pro short', channel: 'e2e', duration: 10, kind: 'video', modes: ['pro'], skills: [], tricks: ['sq5'], madeForKids: true, captions: true, checked: '2026-10-15', why: 'e2e' },
    { id: 'e2e-keyword', yt: 'KEYWORD0001', title: 'Square numbers ending in 5 the vedic way', channel: 'e2e', duration: 5, kind: 'video', modes: ['challenger', 'explorer'], skills: [], tricks: [], madeForKids: true, captions: true, checked: '2026-10-15', why: 'squaring' }
  ];
  await page.route(/\/vedic-math\/js\/videos\.js(\?.*)?$/, async (route: Route) => {
    const res = await route.fetch();
    const body = (await res.text()) + `\nVIDEOS.push(...${JSON.stringify(extra)});\n`;
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/javascript' } });
  });
  await open(page, '#/star/sq5/1');
  const all = await videos(page);
  expect(all.map(v => v.yt)).toContain('KIDSLONG001'); // the routed list is the one the page uses
  expect(expected(all, 'sq5').yt).toBe('KIDSLONG001');
  await twoMisses(page);
  expect(await offeredPlays(page)).toBe('KIDSLONG001');
});
