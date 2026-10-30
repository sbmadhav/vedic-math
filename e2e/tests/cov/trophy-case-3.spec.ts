import { test, expect, open } from '../fixtures';

/* trophy-case spec, Requirement "No reward is lost" (openspec working-memory-scaffolds):
   - Scenario "Stored rewards": opening Me, the Dojo and a game leaves the stored Stars, Medals, Belts and Badges as
     they were; the Dojo still shows each Trick's Stars and the game still shows its Medals. */

const SAVED = { v: 3, skills: {}, sparks: 400, weekSparks: {}, badges: { first: 1, trick1: 2 }, belts: { white: 3 }, medals: { 'g:times-sprint:1': 3, 'g:times-sprint:2': 1 }, sky: { lit: { 'from9:1': 1, 'by11:2': 1 }, skipped: { 'times5:1': 1 }, last: {} } };
const rewards = (page: import('@playwright/test').Page) => page.evaluate(() => { const d = JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}'); return { badges: d.badges, belts: d.belts, medals: d.medals, lit: d.sky?.lit, skipped: d.sky?.skipped }; });

test.use({ seedPlayer: { sky: false }, seedProgress: SAVED });

test('Me, the Dojo and a game leave every stored reward as it was, and still show their own', async ({ page }) => {
  await open(page, '#/me');
  const before = await rewards(page);
  expect(before.medals).toEqual(SAVED.medals);
  expect(before.belts).toEqual(SAVED.belts);
  expect(before.lit).toEqual(SAVED.sky.lit);
  for (const b of Object.keys(SAVED.badges)) expect(before.badges[b]).toBe(SAVED.badges[b as keyof typeof SAVED.badges]);

  await open(page, '#/dojo');
  await expect(page.locator('a.dojo-star[href="#/star/from9/1"]')).toHaveClass(/dojo-star--lit/);
  await expect(page.locator('a.dojo-star[href="#/star/times5/1"]')).toHaveClass(/dojo-star--skipped/);
  await open(page, '#/game/times-sprint');
  await expect(page.locator('a.lv-node[href="#/game/times-sprint/1"] .medal--gold')).toBeAttached();
  await open(page, '#/me');
  expect(await rewards(page)).toEqual(before);
});
