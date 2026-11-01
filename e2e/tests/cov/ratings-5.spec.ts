import { test, expect, open, cloudLog } from '../fixtures';

/* ratings spec, Requirement "A Star uses its Trick's Rating":
   - Two Players on the same Star: Rating 3 and Rating 17 for Square numbers ending in 5 play its Star 2; the first
     draws from Katas near 18 and the second from Katas near 34 (js/levels.js starBand: Katas 18 to 24 and 28 to 34).
   - Shared with Practice: Star rounds that raise the Rating start that Trick's Practice at the raised Rating. */

type Page = import('@playwright/test').Page;
const base = async (page: Page) => Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]);
const tag = (page: Page) => page.locator('#stMain .star-tag');
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.' + JSON.parse(localStorage.getItem('vm.players')!).active) || '{}'));
async function seedProgress(page: Page, id: string, data: Record<string, unknown>) {
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [`mathquest.v1.${id}`, JSON.stringify(data)] as const);
}
/** Problems (with key and numbers) of Katas a to b of sq5, from the app's own seeded Katas */
const katasProblems = (page: Page, a: number, b: number) => page.evaluate(async ([a, b]) => {
  const LV = await e2eMod('levels');
  const out: { key: string; n: number }[] = [];
  for (let n = a; n <= b; n++) LV.kata('sq5', n).problems.forEach((p: { vals: number[] }, i: number) => out.push({ key: `${n}:${i}`, n: p.vals[0] }));
  return out;
}, [a, b] as const);

/** Opens Star 2 for the active Player and returns the Kata numbers its round dealt, checking the shown question is one of them */
async function star2Katas(page: Page) {
  await open(page, '#/star/sq5/2');
  await expect(page.locator('.star-top .md-tag')).toHaveText('Star 2 of 3');
  await expect(tag(page)).toHaveText('Question 1 of 4');
  const keys: string[] = (await saved(page)).sky.last['sq5:2'];
  expect(keys).toHaveLength(4);
  const all = await katasProblems(page, 18, 34);
  const shown = await base(page);
  const first = all.find(p => p.key === keys[0])!;
  expect(first, `dealt key ${keys[0]} is a Star 2 problem`).toBeTruthy();
  expect(first.n).toBe(shown);
  return keys.map(k => Number(k.split(':')[0]));
}

test('Two Players on the same Star: Rating 3 draws from Katas near 18, Rating 17 from Katas near 34', async ({ page }) => {
  await seedProgress(page, 'p1', { ratings: { 'skill:v-sq5': 3 } });
  await seedProgress(page, 'p2', { ratings: { 'skill:v-sq5': 17 } });
  await open(page, '#/');
  const low = await star2Katas(page);
  for (const n of low) { expect(n).toBeGreaterThanOrEqual(18); expect(n).toBeLessThanOrEqual(24); }
  // Leave before answering: the Rating is untouched
  await page.goto('/learn/skills');
  await page.evaluate(() => {
    const P = JSON.parse(localStorage.getItem('vm.players')!);
    P.list.push({ id: 'p2', name: 'Calm Otter 17', avatar: 'sky', mode: 'challenger', created: Date.now() }); P.active = 'p2';
    localStorage.setItem('vm.players', JSON.stringify(P));
  });
  await page.reload();
  const high = await star2Katas(page);
  for (const n of high) { expect(n).toBeGreaterThanOrEqual(28); expect(n).toBeLessThanOrEqual(34); }
  expect((await saved(page)).ratings['skill:v-sq5']).toBe(17);
  expect((await cloudLog(page)).writes).toEqual([]);
});

test('Shared with Practice: a Star round that raises the Rating starts that Trick\'s Practice at the raised Rating', async ({ page }) => {
  // Rating 7: Practice questions at generator level 1 (1 to 7 is level 1, 8 to 13 level 2)
  await seedProgress(page, 'p1', { ratings: { 'skill:v-sq5': 7 } });
  await open(page, '#/skill/v-sq5');
  await expect(page.locator('#practice #prQ')).toHaveAttribute('data-level', '1');
  // Four right answers on Star 1
  await page.evaluate(() => { location.hash = '#/star/sq5/1'; });
  for (let i = 1; i <= 4; i++) {
    await expect(tag(page)).toHaveText(`Question ${i} of 4`);
    const n = await base(page);
    await page.keyboard.type(String(n * n)); await page.keyboard.press('Enter');
  }
  await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
  const raised = (await saved(page)).ratings['skill:v-sq5'];
  expect(raised).toBeGreaterThan(7);
  // Dial 7 -> 13 over four right answers, settled 11.2, saved as 0.4 x 7 + 0.6 x 11.2
  expect(raised).toBe(9.5);
  // The Trick's Practice now starts at the raised Rating: round(9.5) = 10, generator level 2
  await page.evaluate(() => { location.hash = '#/skill/v-sq5'; });
  await expect(page.locator('#practice #prQ')).toHaveAttribute('data-level', '2');
  const fromStore = await page.evaluate(async () => {
    const AD = await e2eMod('adapt');
    return AD.levelFor(Math.round(AD.skillRating('v-sq5', 'challenger')));
  });
  expect(fromStore).toBe(2);
  expect((await cloudLog(page)).writes).toEqual([]);
});
