import { test, expect, open } from '../fixtures';

/* play-experiences spec, Requirements "Calm removes clocks from play" and "Nothing personal leaves the device":
   one test per scenario. */

test.describe('Calm on', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { localStorage.setItem('vm.calm', '1'); } catch (e) { /* storage blocked */ } }); });

  test('A Party game in Calm: no clock shows and the turn does not time out', async ({ page }) => {
    await page.clock.install();
    await open(page, '#/arena/party');
    await page.locator('.pt-start').click();
    const stage = page.locator('.pt-stage');
    await expect(page.locator('.pt-timer')).toBeHidden();
    await page.locator('.pt-go').click();
    await expect(stage).toHaveAttribute('data-phase', 'open');
    await page.clock.fastForward('02:00');
    await expect(stage).toHaveAttribute('data-phase', 'open');
    await page.keyboard.press('q');
    await expect(stage).toHaveAttribute('data-phase', 'answer');
    await page.clock.fastForward('02:00');
    await expect(stage).toHaveAttribute('data-phase', 'answer');
    await expect(page.locator('.pt-timer')).toBeHidden();
  });

  test('Beat the lock in Calm: the quick level has no clock, so a slow right answer counts', async ({ page }) => {
    await open(page, '#/dojo/locks');
    await expect(page.locator('#view h1').first()).toHaveText('Discovery Locks');
    const r = await page.evaluate(async () => {
      const m: any = await import('/vedic-math/js/play/exp/locks-core.js' as string);
      const calm = m.levelsFor('challenger', true).find((l: any) => l.kind === 'quick');
      const timed = m.levelsFor('challenger', false).find((l: any) => l.kind === 'quick');
      return { calmSecs: calm.secs || 0, timedSecs: timed.secs, slowRightCalm: m.counts(calm, true, 45), slowRightTimed: m.counts(timed, true, timed.secs + 30), wrongCalm: m.counts(calm, false, 1) };
    });
    expect(r.timedSecs).toBeGreaterThan(0);
    expect(r.calmSecs).toBe(0);
    expect(r.slowRightCalm).toBe(true);
    expect(r.slowRightTimed).toBe(false);
    expect(r.wrongCalm).toBe(false);
    await expect(page.locator('#view')).not.toContainText(/within \d+ seconds/);
  });
});

test('Sharing a ghost: the link holds the seed, answer times and an optional word-list nickname, and nothing else', async ({ page }) => {
  await open(page, '#/arena/ghosts');
  const check = await page.evaluate(async () => {
    const G: any = await import('/vedic-math/js/play/exp/ghosts-core.js' as string);
    const kind = Object.keys(G.SPRINTS)[0];
    const g = G.makeGhost({ kind, lv: 'challenger', seed: 12345, n: 3, t: [1200, 2700, 3600], miss: [[1, 300]], nick: [1, 2] });
    let code: string;
    try { code = G.encode(g); } catch (e) { return { error: String(e) }; }
    const back = G.decode(code);
    const text = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    return { code, back, text, nickName: G.nickName([1, 2]) };
  });
  expect(check.error).toBeUndefined();
  // Only base 36 numbers, dots, commas, colons and the nick's dash: no free text can be in the link
  expect(check.text).toMatch(/^[0-9a-z.,:\-]*$/);
  expect(check.back).toBeTruthy();
  expect(check.back.seed).toBe(12345);
  expect(check.nickName).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  expect(check.text).not.toMatch(/Swift|Tiger/);
});

test('A typed plate in a share link: a plate typed with other words is shared as its digits only', async ({ page }) => {
  await page.route(/\/vedic-math\/vendor\/tesseract\//, r => r.abort());
  await open(page, '#/games/lens');
  await page.locator('[data-way="type"]').click();
  await page.locator('#lnDigits').fill('KA 05 call me 4721 <b>');
  await page.locator('#lnDigits').press('Enter');
  await page.evaluate(() => { (window as any).__shared = []; (navigator as any).share = async (d: any) => { (window as any).__shared.push(d); }; });
  await page.locator('.ln-send').first().click();
  const shared = await page.evaluate(() => (window as any).__shared as { url: string; text: string }[]);
  expect(shared).toHaveLength(1);
  expect(decodeURIComponent(shared[0].url.split('/').pop()!)).toBe('054721');
  expect(shared[0].text).not.toMatch(/call|<b>|KA/i);
});
