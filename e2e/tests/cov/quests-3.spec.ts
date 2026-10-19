import { test, expect, open, blockAnalytics, type Page } from '../fixtures';

/* quests spec, Requirement: Quests rotate daily.
   Quests are drawn per local date, so each test fixes the date with page.clock and reads the three quest
   labels from the Home quest card. */

const labels = (page: Page) => page.locator('.quest-card ul.quests > li .q-t').allTextContents()
  .then(a => a.map(s => s.trim()));

test.describe('Two Players in the same Mode', () => {
  test.use({ seedMode: 'challenger', seedProgress: null });

  test('two Challenger Players on different devices see the same three quests on the same date', async ({ page, browser }, testInfo) => {
    const when = new Date(2026, 4, 14, 9, 30, 0);

    // Device one: the fixture's fresh Challenger
    await page.clock.install({ time: when });
    await open(page, '#/');
    const one = await labels(page);
    expect(one).toHaveLength(3);

    // Device two: a separate browser context (its own storage), a different Challenger Player with some
    // progress already, and a different Math.random, opening later the same local date
    const ctx = await browser.newContext({ baseURL: testInfo.project.use.baseURL, serviceWorkers: 'block' });
    await blockAnalytics(ctx);
    await ctx.addInitScript(() => { const w = window as any; w.goatcounter ||= {}; if (typeof w.goatcounter.count !== 'function') w.goatcounter.count = () => {}; });
    await ctx.addInitScript(() => {
      try {
        if (!localStorage.getItem('vm.players')) {
          localStorage.setItem('vm.sound', '0');
          localStorage.setItem('vm.players', JSON.stringify({ active: 'p7', list: [{ id: 'p7', name: 'Brave Owl 7', avatar: 'coral', mode: 'challenger', created: Date.now() }] }));
          localStorage.setItem('mathquest.v1.p7', JSON.stringify({
            v: 3, skills: {}, sparks: 140, days: { '2026-05-13': 22 }, best: {}, last: null, grade: null, badges: {},
            counts: { answers: 22, right: 20 }, seen: {}, medals: {}, katasDone: {}, ratings: {}, weekSparks: {},
          }));
        }
      } catch (e) { /* storage blocked */ }
      let s = 987654321; Math.random = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
    });
    // Same blocks on Firebase as the fixture: the fake is not needed on Home, so abort anything Google-shaped
    await ctx.route(/firestore\.googleapis\.com|identitytoolkit|securetoken|gstatic\.com\/firebasejs/, r => r.abort('blockedbyclient'));
    try {
      const other = await ctx.newPage();
      await other.clock.install({ time: new Date(2026, 4, 14, 18, 45, 0) });
      await open(other, '#/');
      const two = await labels(other);
      expect(two, 'device two sees the same three quests as device one').toEqual(one);
    } finally {
      await ctx.close();
    }
  });
});

test.describe('A week of quests', () => {
  test.use({ seedMode: 'challenger', seedProgress: null });

  test('over seven consecutive dates the set of three quests is not the same every day', async ({ page }) => {
    test.setTimeout(120_000); // seven full page loads; on the live host each takes several seconds
    await page.clock.install({ time: new Date(2026, 5, 1, 10, 0, 0) });
    await open(page, '#/');
    const sets: string[] = [];
    for (let i = 0; i < 7; i++) {
      if (i > 0) {
        await page.clock.setSystemTime(new Date(2026, 5, 1 + i, 10, 0, 0));
        await page.reload();
        await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
      }
      const l = await labels(page);
      expect(l, `day ${i + 1} shows three quests`).toHaveLength(3);
      sets.push([...l].sort().join(' | '));
    }
    expect(new Set(sets).size, `the seven daily sets: ${sets.join(' / ')}`).toBeGreaterThan(1);
  });
});
