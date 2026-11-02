import { test, expect, open, type Page, atRoute } from '../fixtures';

/* quests spec, Requirement "Changing Mode starts the new quests at zero", Scenario "A quest already met today"
   (openspec change muse-review-polish, design D3): a Challenger finishes an Arena round or tower challenge on a day
   whose Challenger quests do not ask for one, then switches to Explorer on a day whose Explorer quests do. The quest
   completes at the switch, with its message on Me where the Mode was changed, and the next answer shows no quest
   message. Today's draws come from a seeded pick on the local date (js/gamify.js pickQuests), so the date is fixed:
   2026-03-11  Challenger: answers-15, tricksWatched-1, runs-1   Explorer: right-5, gamesPlayed-1, arena-1 */

const at = (day: string) => new Date(`${day}T12:00:00`);
const questDay = (page: Page) => page.evaluate(async () => ((await e2eMod('store')) as any).questDay());
const toast = (page: Page) => page.locator('.fx-toast', { hasText: 'Quest complete' });

test.describe('a quest already met today completes at the Mode switch', () => {
  test.use({ seedMode: 'challenger' });

  test('the Arena quest completes on Me when a Challenger who finished a tower challenge switches to Explorer, and the next answer shows no quest message', async ({ page }) => {
    await page.clock.install({ time: at('2026-03-11') });
    await open(page, '#/');
    await expect(page.locator('.quest-card .q-l')).toHaveText(['Answer 15 questions', 'Watch a speed trick', 'Finish an Endless run']);
    // A tower challenge finished as a Challenger bumps the arena counter (js/app.js challengeView onEnd); done here on
    // the store, as quests-2 does. No Challenger quest asks for it, so nothing completes.
    await page.evaluate(async () => ((await e2eMod('store')) as any).bump('arena'));
    await page.waitForTimeout(300);
    await expect(toast(page)).toHaveCount(0);
    expect((await questDay(page)).done).toEqual({});

    await open(page, '#/me');
    await page.locator('.mode-pick--sm .mode-card[data-mode="explorer"]').click();
    await expect(page.locator('.mode-pick--sm .mode-card[data-mode="explorer"]')).toHaveAttribute('aria-pressed', 'true');
    // The Explorer quest the day's play already met completes now, here on Me, once
    await expect(toast(page)).toHaveCount(1);
    await expect(toast(page)).toContainText('Finish an Arena round or tower challenge');
    await expect(toast(page)).toContainText('+25 Sparks');
    await expect(page).toHaveURL(atRoute('#/me'));
    expect(Object.keys((await questDay(page)).done)).toEqual(['arena-1']);
    const qs = await page.evaluate(async () => ((await e2eMod('gamify')) as any).quests());
    expect(qs.find((q: any) => q.id === 'arena-1')).toMatchObject({ prog: 1, goal: 1, done: true });
    await expect(toast(page)).toHaveCount(0, { timeout: 8000 }); // the message leaves after a few seconds

    // The next answer (Balloon pop, Practice, anything) brings no late quest message
    await open(page, '#/game/balloons');
    await page.evaluate(async () => ((await e2eMod('store')) as any).record('k-count', true, 0));
    await page.waitForTimeout(500);
    await expect(toast(page)).toHaveCount(0);
    expect(Object.keys((await questDay(page)).done)).toEqual(['arena-1']);
  });
});
