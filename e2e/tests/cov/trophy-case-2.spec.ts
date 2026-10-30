import { test, expect, open } from '../fixtures';

/* trophy-case spec, Requirement "A Trophy case on Me" (openspec working-memory-scaffolds):
   - Scenario "A Challenger's Trophy case": 4 Stars lit, one gold and one bronze Medal: "0 of 7" Belts, "4 of 63 Stars
     lit", 1 gold, 0 silver and 1 bronze Medals, the Sutra cards collected, and the Badges.
   - Scenario "Links": Stars to the Dojo, Medals to Games and the Challenge tower, Sutra cards to the Sutras.
   - Scenario "Explorer with nothing yet": no Belts or Stars row. */

const SKY = { lit: { 'from9:1': 1, 'from9:2': 1, 'from9:3': 1, 'by11:1': 1 }, skipped: {}, last: {} };

test.describe('a Challenger with 4 Stars lit, one gold and one bronze Medal', () => {
  test.use({ seedPlayer: { sky: false }, seedProgress: { v: 3, skills: {}, sky: SKY, medals: { 'g:times-sprint:1': 3, 'a:1': 1 } } });
  test('the Trophy case counts each reward and links to where it is earned', async ({ page }) => {
    await open(page, '#/me');
    const tc = page.getByRole('region', { name: 'Trophy case' });
    await expect(tc).toBeVisible();
    const row = (name: string) => tc.locator('.trophy').filter({ has: page.getByRole('heading', { name, exact: true }) });
    await expect(row('Belts').locator('.trophy-v')).toHaveText('0 of 7');
    await expect(row('Belts').locator('.belt-chip')).toHaveCount(7);
    await expect(row('Belts').locator('.belt-chip.on')).toHaveCount(0);
    await expect(row('Stars').locator('.trophy-v')).toHaveText('4 of 63 Stars lit');
    await expect(row('Medals').locator('.trophy-v')).toHaveText(/\b1 gold\b.*\b0 silver\b.*\b1 bronze$/);
    await expect(row('Sutra cards').locator('.trophy-v')).toHaveText(/^\d+ of 29 collected$/);
    await expect(tc.locator('.mq-strand', { hasText: 'Badges' })).toBeVisible();
    await expect(tc.locator('.badge-grid .badge').first()).toBeVisible();
    // Links
    await expect(row('Stars').getByRole('link')).toHaveAttribute('href', '#/dojo');
    await expect(row('Belts').getByRole('link')).toHaveAttribute('href', '#/dojo');
    await expect(row('Medals').getByRole('link', { name: 'Games' })).toHaveAttribute('href', '#/games');
    await expect(row('Medals').getByRole('link', { name: 'Challenge tower' })).toHaveAttribute('href', '#/tower');
    await expect(row('Sutra cards').getByRole('link')).toHaveAttribute('href', '#/sutras');
    // The stats row keeps Skills mastered and Day streak only
    await expect(page.locator('.me-stats .md-kicker')).toHaveText(['Skills mastered', 'Day streak']);
  });
});

test.describe('a Pro who holds the white belt', () => {
  test.use({ seedMode: 'pro', seedProgress: { v: 3, skills: {}, belts: { white: 1 } } });
  test('the Belts row marks it held', async ({ page }) => {
    await open(page, '#/me');
    const belts = page.locator('.trophy--belts');
    await expect(belts.locator('.trophy-v')).toHaveText('1 of 7');
    await expect(belts.locator('.belt-chip.on')).toHaveText('White belt, held');
  });
});

test.describe('an Explorer with nothing yet', () => {
  test.use({ seedMode: 'explorer' });
  test('the Trophy case has no Belts or Stars row', async ({ page }) => {
    await open(page, '#/me');
    const tc = page.getByRole('region', { name: 'Trophy case' });
    await expect(tc).toBeVisible();
    await expect(tc.locator('.trophy--belts, .trophy--stars')).toHaveCount(0);
    await expect(tc.locator('.trophy--medals')).toBeVisible();
    await expect(tc.locator('.trophy--cards')).toBeVisible();
  });
});
