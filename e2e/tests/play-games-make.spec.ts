import { test, expect, open } from './fixtures';
import type { Page } from '@playwright/test';

/* Play and make games (Pattern Wall, Teach the Apprentice, Estimation Bets): shared links cannot inject markup,
   removing cards always asks first, Sparks-paying actions are not farmable, and bets with the ends typed the
   wrong way round still resolve. */

const WALL = 'vm.play.p1.wall';
const code = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
/* A conjecture card in share-code form: 0, 2, 4 on the hundred chart are 1, 3, 5; "Every prime is odd" */
const CONJ = { v: 1, p: 0, k: '', g: 'hundred', gp: 0, x: '0.2.4', n: [1, 2, 3], r: ['prime', 'odd'], t: [0, 2, 1] };
/* The same card as it is stored on the wall */
const stored = (name: number[]) => ({ p: null, k: '', g: 'hundred', gp: null, cells: [0, 2, 4], name, rule: { s: 'prime', c: 'odd' }, test: { ok: false, counter: 2, tested: 1 }, t: '2026-10-16' });

/* Records the play actions the app turns into Sparks (js/play/kit.js track) */
async function recordPlay(page: Page) {
  await page.addInitScript(() => { (window as any).__plays = []; document.addEventListener('vmplay', (e: any) => (window as any).__plays.push(e.detail.action)); });
}
const plays = (page: Page, action: string) => page.evaluate(a => (window as any).__plays.filter((x: string) => x === a).length, action);

test.describe('Pattern Wall', () => {
  test('a hostile shared card link injects nothing and does not open', async ({ page, issues }) => {
    const evil = { ...CONJ, t: [1, 0, '<a id="pwn" href="https://example.com">pwn</a>'], r: ['constructor', 'toString'] };
    await open(page, `#/games/wall/card/${code(evil)}`);
    await expect(page.locator('#view h1')).toHaveText('That card did not open');
    await expect(page.locator('#pwn')).toHaveCount(0);
    await expect(page.locator('#view a[href^="https://example.com"]')).toHaveCount(0);
    expect(issues.console).toEqual([]);
  });

  test('a shared card that claims a test result shows and pins the result worked out again', async ({ page, issues }) => {
    await open(page, `#/games/wall/card/${code({ ...CONJ, t: [1, 0, 999] })}`);
    await expect(page.locator('.wl-shared .wl-badge')).toHaveText(/broken by 2/);
    await page.locator('.wl-add').click();
    await expect(page.locator('.wl-add')).toHaveText('Pinned to your wall');
    const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), WALL);
    expect(saved.cards).toHaveLength(1);
    expect(saved.cards[0].test).toEqual({ ok: false, counter: 2, tested: 1 });
    expect(saved.cards[0].rule).toEqual({ s: 'prime', c: 'odd' });
    expect(issues.console).toEqual([]);
  });

  test('cards stored with markup in them render as text or not at all', async ({ page, issues }) => {
    await page.addInitScript(([k, cards]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({ cards })); }, [WALL, [
      { ...stored([0, 0, 0]), test: { ok: true, counter: null, tested: '<a id="pwn2" href="x">pwn</a>' } },
      { ...stored([1, 1, 1]), g: 'constructor' }
    ]] as const);
    await open(page, '#/games/wall/wall');
    await expect(page.locator('.wl-cards > li')).toHaveCount(1);
    await expect(page.locator('#pwn2')).toHaveCount(0);
    await expect(page.locator('.wl-cards .wl-badge')).toHaveText(/broken by 2/);
    expect(issues.console).toEqual([]);
  });

  test('removing two cards in a row asks to confirm each one', async ({ page, issues }) => {
    await page.addInitScript(([k, cards]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({ cards })); }, [WALL, [stored([0, 0, 0]), stored([1, 1, 1]), stored([2, 2, 2])]] as const);
    await open(page, '#/games/wall/wall');
    const cards = page.locator('.wl-cards > li');
    await expect(cards).toHaveCount(3);
    for (const left of [2, 1]) {
      const rm = cards.first().locator('.wl-rm');
      await rm.click();
      await expect(rm).toHaveText('Really remove?');
      await expect(cards).toHaveCount(left + 1);
      await rm.click();
      await expect(cards).toHaveCount(left);
    }
    await expect(cards.first().locator('.wl-rm')).toHaveText('Remove');
    await expect(page.locator('.wl-count')).toHaveText('1');
    expect((await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), WALL)).cards).toHaveLength(1);
    expect(issues.console).toEqual([]);
  });

  test('a discovery is tracked once per Player, however often it is painted again', async ({ page, issues }) => {
    await recordPlay(page);
    await open(page, '#/games/wall');
    const tool = page.locator('[data-tool="mult"]');
    await tool.click();
    await expect(page.locator('.wl-found-k')).toHaveText('Pattern discovered!');
    expect(await plays(page, 'wall/discover')).toBe(1);
    await page.locator('.wl-clear').click();
    await tool.click();
    await expect(page.locator('.wl-found-k')).toHaveText('Pattern discovered!');
    await page.locator('.wl-name-it').click();
    await page.locator('.wl-cancel').click();
    await expect(page.locator('.wl-found-k')).toHaveText('Pattern discovered!');
    expect(await plays(page, 'wall/discover')).toBe(1);
    await page.reload();
    await expect(page.locator('#view h1')).toHaveText('Pattern Wall');
    await page.locator('[data-tool="mult"]').click();
    await expect(page.locator('.wl-found-k')).toHaveText('Pattern discovered!');
    expect(await plays(page, 'wall/discover')).toBe(0);
    expect(issues.console).toEqual([]);
  });

  test('section links mark the current page, and calendar days name their weekday', async ({ page }) => {
    await open(page, '#/games/wall/wall');
    await expect(page.locator('.wl-tabs [aria-current="page"]')).toHaveText(/My wall/);
    await expect(page.locator('[role="tab"]')).toHaveCount(0);
    await open(page, '#/games/wall/calendar');
    const first = page.locator('.wl-c').first();
    const label = await first.getAttribute('aria-label');
    const now = new Date();
    const weekday = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-US', { weekday: 'long' });
    expect(label).toBe(`1, ${weekday}`);
  });
});

test.describe('Teach the Apprentice', () => {
  test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); });

  test('coaching after a miss earns no coach credit, and step states have words for screen readers', async ({ page, issues }) => {
    await recordPlay(page);
    await open(page, '#/games/apprentice');
    await expect(page.locator('.ap-bubble')).not.toHaveAttribute('aria-live', /.+/);
    /* Say "every step is right" first: on a round with a wrong step that is a miss. Clean rounds are skipped. */
    let found = false;
    for (let round = 0; round < 12 && !found; round++) {
      await page.locator('.ap-allright').click();
      const next = page.locator('.ap-next');
      if (await next.isVisible()) { await next.click(); continue; }
      found = true;
    }
    expect(found).toBe(true);
    const steps = page.locator('.ap-step-btn');
    const n = await steps.count();
    for (let i = 0; i < n && !(await page.locator('.ap-tips').isVisible()); i++) await steps.nth(i).click();
    await expect(page.locator('.ap-step.is-caught .ap-vh')).toHaveText(', the wrong step');
    const tips = page.locator('.ap-tip');
    const m = await tips.count();
    for (let i = 0; i < m && !(await page.locator('.ap-next').isVisible()); i++) if (await tips.nth(i).isEnabled()) await tips.nth(i).click();
    await expect(page.locator('.ap-next')).toBeVisible();
    await expect(page.locator('.ap-step.is-crossed .ap-vh').first()).toHaveText(', crossed out');
    await expect(page.locator('.ap-step.is-fixed .ap-vh').first()).toHaveText(', redone');
    expect(await plays(page, 'apprentice/coach')).toBe(0);
    expect(issues.console).toEqual([]);
  });
});
