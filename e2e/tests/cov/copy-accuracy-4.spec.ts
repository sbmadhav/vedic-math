import { test, expect, open, withVideos, type Mode } from '../fixtures';
import type { Page } from '@playwright/test';

/* copy-accuracy spec, "Related videos match whole words": hand-matched picks come first, and keyword matches are
   added only when there are none. (The percent lesson scenario is in copy-accuracy-3.spec.ts.) YouTube is answered
   locally. */

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
  await page.route(/^https:\/\/i\.ytimg\.com\//, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
});

const shown = (page: Page) => page.locator('[data-watch-for] button[data-watch]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.watch!));

/* Skills served with exactly one hand-matched video visible to the Mode (withVideos keeps that one and takes the
   Skill off every other video; the catalog gains hand matches in batches) whose title words also keyword-match 3
   or more other visible videos (checked in the page below, so the precondition cannot silently drift). */
for (const [mode, skill, yt] of [['challenger', '2-sub100', 'Qf_45zM68R4'], ['challenger', '2-add1000', 'Qf_45zM68R4'], ['pro', '9-expand', 'EAyI-yiXaek']] as [Mode, string, string][]) {
  test.describe(`hand-matched, ${mode}`, () => {
    test.use({ seedMode: mode });
    test(`${skill} shows only its hand-matched video, not the keyword matches (${mode})`, async ({ page }) => {
      await withVideos(page, `list => list.map(v => (v.yt === '${yt}' || !v.skills.includes('${skill}')) ? v : { ...v, skills: v.skills.filter(s => s !== '${skill}') })`);
      await open(page, `#/skill/${skill}`);
      const box = page.locator('[data-watch-for]');
      await expect(box.locator('button[data-watch]').first()).toBeVisible();
      const pre = await page.evaluate(async ({ skill, mode, yt }) => {
        const { VIDEOS } = await import('/vedic-math/js/videos.js' as string);
        const W = await import('/vedic-math/js/watch.js' as string);
        const { relatedTo } = await import('/vedic-math/js/related.js' as string);
        const { byId } = await import('/vedic-math/js/skills/index.js' as string);
        const s = byId[skill];
        const visible = VIDEOS.filter((v: any) => W.visibleTo(v, mode));
        const hand = visible.filter((v: any) => v.skills.includes(skill)).map((v: any) => v.yt);
        const others = relatedTo(`${s.title} ${s.strand}`.toLowerCase(), visible, 999).filter((v: any) => v.yt !== yt).length;
        return { hand, others };
      }, { skill, mode, yt });
      expect(pre.hand, 'exactly one hand-matched video').toEqual([yt]);
      expect(pre.others, 'its words match three or more other videos').toBeGreaterThanOrEqual(3);
      await expect(box).toHaveAttribute('data-how', 'hand');
      await expect(box.locator('button[data-watch]')).toHaveCount(1);
      expect(await shown(page)).toEqual([yt]);
    });
  });
}
