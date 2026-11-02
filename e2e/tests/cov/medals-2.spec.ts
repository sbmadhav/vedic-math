import { test, expect, open, atRoute, hrefTo, pathTo } from '../fixtures';

/* medals spec:
   - Game Levels and tower challenges earn Medals / Accessible label
   - Existing stars become Medals 1:1 / A Level with 3 stars
   Explorer mode starts with a game Rating of 1, so only Level 1 is open by skill: every other Level that is
   open is open because the Level before it has a Medal (or, before the update, a star). */

const v2 = (stars: Record<string, number>) => ({ v: 2, skills: {}, xp: 0, days: {}, best: {}, last: null, grade: null, badges: {}, counts: {}, seen: {}, stars, ratings: {}, weekXp: {}, questDay: null });
const v3 = (medals: Record<string, number>) => ({ v: 3, skills: {}, sparks: 0, days: {}, best: {}, last: null, grade: null, badges: {}, counts: {}, seen: {}, medals, katasDone: {}, ratings: {}, weekSparks: {}, questDay: null });

test.describe('Existing stars become Medals 1:1: a Level with 3 stars', () => {
  test.use({ seedMode: 'explorer', seedProgress: v2({ 'g:times-sprint:1': 1, 'g:times-sprint:2': 1, 'g:times-sprint:3': 2, 'g:times-sprint:4': 1, 'g:times-sprint:5': 3 }) });

  test('Level 5 shows a gold Medal, and Level 6 is open as before', async ({ page }) => {
    await open(page, '#/game/times-sprint');
    const lv5 = page.locator(`a.lv-node${hrefTo('#/game/times-sprint/5')}`);
    await expect(lv5).toHaveAttribute('aria-label', 'Level 5, gold Medal');
    await expect(lv5.locator('.medal')).toHaveClass(/medal--gold/);
    await expect(lv5).not.toContainText('★');
    // Level 6 is open (a link), and only because Level 5 is cleared: Level 7 stays locked
    const lv6 = page.locator(`a.lv-node${hrefTo('#/game/times-sprint/6')}`);
    await expect(lv6).toBeVisible();
    await expect(lv6).toHaveAttribute('aria-label', 'Level 6');
    await expect(page.locator(`a.lv-node${hrefTo('#/game/times-sprint/7')}`)).toHaveCount(0);
    await expect(page.locator('.lv-node.locked[aria-label="Level 7, locked"]')).toBeVisible();
    // The other stars map 1:1 too
    await expect(page.locator(`a.lv-node${hrefTo('#/game/times-sprint/3')}`)).toHaveAttribute('aria-label', 'Level 3, silver Medal');
    await expect(page.locator(`a.lv-node${hrefTo('#/game/times-sprint/4')}`)).toHaveAttribute('aria-label', 'Level 4, bronze Medal');
    // Level 6 can actually be played, and Level 5's page shows the gold Medal as its best
    await lv6.click();
    await expect(page).toHaveURL(atRoute('#/game/times-sprint/6'));
    await expect(page.locator('#gStart')).toBeVisible();
    await open(page, '#/game/times-sprint/5');
    await expect(page.locator('.lv-best .medal')).toHaveAttribute('aria-label', 'Gold Medal');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!));
    expect(saved.medals['g:times-sprint:5']).toBe(3);
  });
});

test.describe('Game Levels earn Medals: accessible label', () => {
  const medals: Record<string, number> = {};
  for (let n = 1; n <= 11; n++) medals[`g:times-sprint:${n}`] = 1;
  medals['g:times-sprint:12'] = 2;
  test.use({ seedMode: 'explorer', seedProgress: v3(medals) });

  test('a game Level node with a silver Medal is read as its number and "silver Medal"', async ({ page }) => {
    await open(page, '#/game/times-sprint');
    const node = page.getByRole('link', { name: 'Level 12, silver Medal', exact: true });
    await expect(node).toBeVisible();
    await expect(node).toHaveAttribute('href', pathTo('#/game/times-sprint/12'));
    // The visual disc is hidden from screen readers, so only the label is heard (no star count, no stray letter)
    const disc = node.locator('.medal');
    await expect(disc).toHaveClass(/medal--silver/);
    await expect(disc).toHaveAttribute('aria-hidden', 'true');
    await expect(node).not.toContainText('★');
    // The Level page names the Medal in text too
    await node.click();
    await expect(page.locator('.lv-best .medal')).toHaveAttribute('aria-label', 'Silver Medal');
    await expect(page.locator('.lv-best .medal')).toHaveText('Silver');
  });
});
