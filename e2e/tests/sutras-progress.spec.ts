import { test, expect, open } from './fixtures';

/* openspec change sutras-first, part 2: progress per Sutra on the Sutras page and in the Deep dive, from what the
   device keeps (nothing written, nothing sent), and the Sutras right after Home in every Mode's menu. */
type Page = import('@playwright/test').Page;
const face = (page: Page, id: string) => page.locator(`.sutra-card[data-id="${id}"] .sutra-face`);
const LIT = { v: 3, skills: {}, sky: { lit: { 'sq5:1': 1 }, skipped: {}, last: {} } };

test.describe('a Challenger who lit Star 1 of Square numbers ending in 5', () => {
  test.use({ seedProgress: LIT });
  test('the Ekādhikena card reads 1 of 9 Stars lit with a meter; Nikhilaṃ reads 0 of 9; Pūraṇāpūraṇābhyām has no trick yet', async ({ page }) => {
    await open(page, '#/sutras');
    await expect(face(page, 's1').locator('.sutra-prog small')).toHaveText('1 of 9 Stars lit');
    await expect(face(page, 's1').locator('.sutra-prog-bar i')).toHaveAttribute('style', /width:11%/);
    await expect(face(page, 's2').locator('.sutra-prog small')).toHaveText('0 of 9 Stars lit');
    await expect(face(page, 's8').locator('.sutra-prog small')).toHaveText(/^No trick for this one yet/);
  });

  test('the Deep dive says it under Try it yourself, one line per Trick', async ({ page }) => {
    await open(page, '#/sutras/s1');
    const dlg = page.locator('dialog.sutra-modal');
    await expect(dlg.locator('.sd-prog')).toHaveText('1 of 9 Stars lit');
    await expect(dlg.locator('.sd-try li').first()).toContainText('Square numbers ending in 5');
    await expect(dlg.locator('.sd-try li').first().locator('small')).toHaveText('1 of 3 Stars lit');
  });

  test('drawing the progress writes nothing and sends nothing about it', async ({ page }) => {
    const sent: string[] = [];
    page.on('request', r => { if (r.method() !== 'GET' || /[?&](p|t)=/.test(r.url())) sent.push(r.url() + ' ' + (r.postData() || '')); });
    await open(page, '#/');
    const before = await page.evaluate(() => localStorage.getItem('mathquest.v1.p1'));
    await page.evaluate(() => { location.hash = '#/sutras'; });
    await expect(face(page, 's1').locator('.sutra-prog small')).toHaveText('1 of 9 Stars lit');
    await page.evaluate(() => { location.hash = '#/sutras/s1'; });
    await expect(page.locator('dialog.sutra-modal .sd-prog')).toBeVisible();
    const after = await page.evaluate(() => localStorage.getItem('mathquest.v1.p1'));
    /* Opening a Deep dive collects its card and its 5 Sparks (it always has), logged in the Sparks history (muse-review-polish); the progress itself adds nothing else */
    const strip = (s: string | null) => { const d = JSON.parse(s || '{}'); delete d.seen; delete d.sparks; delete d.weekSparks; delete d.xp; delete d.weekXp; delete d.sparksLog; delete d.counts; delete d.days; return d; };
    expect(strip(after)).toEqual(strip(before));
    expect(sent.filter(u => /Stars lit|progress|sq5:1/.test(u))).toEqual([]);
  });
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro', seedProgress: LIT });
  test('the card line adds Tricks mastered', async ({ page }) => {
    await open(page, '#/sutras');
    await expect(face(page, 's1').locator('.sutra-prog small')).toHaveText('1 of 9 Stars lit · 0 of 3 Tricks mastered');
  });
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  /* The Sutras are Learn's first card (openspec change play-nav-by-mode: Explorer's menu is Play, Learn and Me) */
  test('Learn opens the Sutras first, and the cards read in Explorer words with tricks practiced', async ({ page }) => {
    await open(page, '#/');
    await page.locator('header .mq-nav a[href="#/learn"]').click();
    await page.locator('#view a.learn-sutras').click();
    await expect(page.locator('#view .md-lede')).toContainText('tiny math rule with a long name');
    await expect(face(page, 's1').locator('.sutra-kid')).toHaveText('One more than the number before');
    await expect(face(page, 's1').locator('.sutra-prog small')).toHaveText('0 of 3 tricks practiced');
    await expect(page.locator('header .mq-nav a[href="#/learn"]')).toHaveAttribute('aria-current', 'true');
  });
  test('the Guide sends Explorer to the Sutras through Learn', async ({ page }) => {
    await open(page, '#/guide/sutras');
    await expect(page.locator('#gd-sutras .gd-how li').first()).toHaveText('Tap Learn at the top, then The sutras.');
  });
});

/* openspec change play-nav-by-mode: the Sutras lead Learn, the first zone after Home */
test('Challenger menu: Home, Learn (with the Sutras first), Arcade, Watch, Find', async ({ page }) => {
  await open(page, '#/');
  expect((await page.locator('header .mq-nav a:visible').allInnerTexts()).map(t => t.trim().split('\n')[0].trim())).toEqual(['Home', 'Learn', 'Arcade', 'Watch', 'Find']);
  await page.locator('header .mq-nav a[href="#/learn"]').click();
  await expect(page.locator('#view a.learn-sutras')).toContainText('Bharati Krishna Tirtha');
});

test('The Sutra cards come before the history cards', async ({ page }) => {
  await open(page, '#/sutras');
  const order = await page.evaluate(() => { const g = document.querySelector('.sutra-grid')!, h = document.querySelector('.history')!; return !!(g.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING); });
  expect(order).toBe(true);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`320 px in ${scheme === 'light' ? 'Daybreak' : 'Deep Space'}: the Sutras page does not scroll sideways`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 320, height: 720 });
    await open(page, '#/sutras');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });
}
