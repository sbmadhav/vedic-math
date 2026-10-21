import { test, expect, open, withVideos, type Page } from '../fixtures';

/* copy-accuracy spec:
   - "Lesson pictures match the number" / Small hundredths: a question about 0.04 shades 4 squares, not none.
   - "Related videos match whole words" / Percent lesson: "Discounts, tax and percent change" links no counting
     video for young children, such as Numberblocks.
   Questions are random, so the Skill's generator (the same module instance the app uses) is wrapped to draw from
   a fixed list of Math.random values; the next question is then known. */

async function fixNextQuestion(page: Page, file: string, skillId: string, randoms: number[]) {
  await page.evaluate(async ({ file, skillId, randoms }) => {
    const mod = await e2eMod(`skills/${file.replace(/\.js$/, '')}`);
    const s = (mod.default as any[]).find(x => x.id === skillId);
    const orig = s.gen;
    s.gen = function (...args: unknown[]) {
      const real = Math.random; let i = 0;
      Math.random = () => (i < randoms.length ? randoms[i++] : real());
      try { return orig.apply(this, args); } finally { Math.random = real; }
    };
  }, { file, skillId, randoms });
  const box = page.locator('#practice');
  await box.locator('#prShow').click();
  await expect(box.locator('#prCheck')).toHaveText('Next');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prCheck')).toHaveText('Check');
}

test.describe('Lesson pictures match the number: small hundredths', () => {
  for (const n of [4, 1, 9]) {
    const dec = `0.0${n}`;
    test(`${dec} = ?/100 shades ${n} of 100 squares, not none`, async ({ page }) => {
      await open(page, '#/skill/4-decimals');
      // hund = 0.1 < .5 -> hundredths; n = ri(1, 99) = 1 + floor(r * 99); toDec = 0.9 -> "dec = ?/100"
      await fixNextQuestion(page, 'middle.js', '4-decimals', [0.1, (n - 1) / 99 + 0.001, 0.9]);
      const box = page.locator('#practice');
      await expect(box.locator('#prQ')).toContainText(`${dec} =`);
      const fr = await box.locator('#prQ .fr').evaluateAll(els => els.map(e => [...e.children].map(c => c.textContent)));
      expect(fr).toEqual([['?', '100']]);
      const viz = box.locator('.mq-viz svg');
      await expect(viz).toHaveAttribute('aria-label', `${n} out of 100 equal squares shaded`);
      await expect(viz.locator('rect')).toHaveCount(100);
      await expect(viz.locator('rect.vz-coral')).toHaveCount(n);
      // The picture agrees with the answer: n hundredths
      await box.locator('.ans-in').fill(String(n));
      await box.locator('#prCheck').click();
      await expect(box.locator('#prCheck')).toHaveText('Next');
    });
  }
});

/* A counting video for young children whose title shares only a word FRAGMENT with the percent lesson
   ("Count" inside "Discounts"). Served with the real list (withVideos) so the keyword fallback would pick it if it
   matched fragments. It is visible to every Mode and has no hand matches. */
const NUMBERBLOCKS = `{ id: 'e2e-numberblocks', title: 'Numberblocks: Let us Count', channel: 'Numberblocks', yt: 'e2eNumBlks1', duration: 60, kind: 'video',
    modes: ['explorer', 'challenger', 'pro'], skills: [], tricks: [], madeForKids: true, captions: true, checked: '2026-01-01',
    why: 'Count along with the Numberblocks from one to ten.' }`;

async function settleWatch(page: Page) {
  // fillWatch fills the box once js/videos.js has loaded; let that promise chain run before checking for absence
  await page.evaluate(async () => {
    await e2eMod('videos');
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

for (const mode of ['explorer', 'challenger', 'pro'] as const) {
  test.describe(`Related videos match whole words: percent lesson (${mode})`, () => {
    test.use({ seedMode: mode });

    test('"Discounts, tax and percent change" links no counting video for young children', async ({ page }) => {
      // Served with no hand match for the lesson (the catalog has some now), so the keyword fallback is what runs,
      // plus a planted Numberblocks counting video that a fragment match on "Discounts" would pick up
      await withVideos(page, `list => [...list.map(v => ({ ...v, skills: v.skills.filter(s => s !== '7-pctchange') })), ${NUMBERBLOCKS}]`);
      await open(page, '#/skill/7-pctchange');
      await expect(page.locator('#view h1')).toHaveText(/Discounts, tax and percent change/);
      await expect(page.locator('[data-watch-for]')).toHaveCount(1);
      await settleWatch(page);
      // The injected counting video really is in the list the app reads
      const { ids, counting } = await page.evaluate(async () => {
        const { VIDEOS } = await e2eMod('videos');
        return {
          ids: (VIDEOS as any[]).map(v => v.id),
          counting: (VIDEOS as any[]).filter(v => v.yt && (v.skills.some((s: string) => /^k-(count|teens)$/.test(s)) || /numberblocks/i.test(v.title))).map(v => v.yt),
        };
      });
      expect(ids).toContain('e2e-numberblocks');
      expect(counting).toContain('e2eNumBlks1');
      const watch = page.locator('[data-watch-for]');
      await expect(watch).not.toContainText(/Numberblocks/i);
      await expect(watch).not.toHaveAttribute('data-how', 'hand');
      await expect(watch.locator('[data-watch]', { hasText: /\bcount(?:s|ed|ing)?\b/i })).toHaveCount(0);
      for (const yt of counting) await expect(page.locator(`[data-watch="${yt}"]`)).toHaveCount(0);
    });
  });
}
