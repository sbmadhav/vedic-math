import { test, expect, open } from './fixtures';

/* Play and make games (Pattern Wall, Teach the Apprentice, Estimation Bets): shared links cannot inject markup,
   removing cards always asks first, Sparks-paying actions are not farmable, and bets with the ends typed the
   wrong way round still resolve. */

const WALL = 'vm.play.p1.wall';
const code = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
/* A conjecture card in share-code form: 0, 2, 4 on the hundred chart are 1, 3, 5; "Every prime is odd" */
const CONJ = { v: 1, p: 0, k: '', g: 'hundred', gp: 0, x: '0.2.4', n: [1, 2, 3], r: ['prime', 'odd'], t: [0, 2, 1] };
/* The same card as it is stored on the wall */
const stored = (name: number[]) => ({ p: null, k: '', g: 'hundred', gp: null, cells: [0, 2, 4], name, rule: { s: 'prime', c: 'odd' }, test: { ok: false, counter: 2, tested: 1 }, t: '2026-10-16' });


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
});
