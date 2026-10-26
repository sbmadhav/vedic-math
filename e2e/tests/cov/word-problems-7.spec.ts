import { test, expect, open, ANALYTICS } from '../fixtures';
import { box, label, skip } from '../word-kit';

/* word-problems spec (change word-problems), Requirement "Everyday settings that travel". */

test('Units and money: many Word problems for every Mode, in rupees or dollars as words, metric, and no Nickname', async ({ page }) => {
  await open(page, '#/skill/3-twostep');
  const bad = await page.evaluate(async () => {
    const S = await e2eMod('stories'), out: string[] = [];
    const NOT = /\$|₹|¢|€|£|\b(cents?|euros?|pounds?|miles?|feet|inch(es)?|ounces?|gallons?|yards?)\b|Swift|Tiger/i;
    const plain = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
    for (const t of S.TEMPLATES) for (let i = 0; i < 200; i++) {
      const p = S.storyFor({ id: t.skills[0], grade: 3 }, t.mode);
      const all = plain([p.q, ...p.hints].join(' '));
      if (NOT.test(all)) out.push(all);
      if (/\d (rupee|dollar)\b/.test(all) || /\b(rupee|dollar)s? \d/.test(all)) out.push(all);
    }
    for (const w of S.WRITTEN) if (NOT.test(w.q)) out.push(w.q);
    return out.slice(0, 5);
  });
  expect(bad).toEqual([]);
});

test('Offline: answering a Word problem and moving to the next one makes no request', async ({ page }) => {
  await open(page, '#/skill/3-twostep');
  await expect(label(page)).toHaveText('Word problem');
  await page.waitForLoadState('networkidle'); /* the Install guide's modules load 100 ms after boot (not a Word problem's) */
  const asked: string[] = [];
  page.on('request', r => { if (!ANALYTICS.test(r.url())) asked.push(r.url()); });
  await skip(page, 3);
  await expect(label(page)).toHaveText('Word problem');
  await box(page).locator('#prHint').click();
  expect(asked).toEqual([]);
});
