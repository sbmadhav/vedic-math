import { test, expect } from '../fixtures';
import AxeBuilder from '@axe-core/playwright';

/* landing-pages, Requirements "The landing page leads with the Sutras and the method" and "Three Sutras one tap from
   their Deep dives" (openspec change sutras-first), and the changed scenario "The hero says little" of "The landing
   hero says little": one test per scenario. */
test.use({ seedMode: null });

test('Both ways: 98 × 97 worked the school way and the sutra way, both ending in 9506', async ({ page }) => {
  await page.goto('/');
  const sec = page.locator('.lv-sutras');
  await expect(sec.locator('h2')).toHaveText('One short rule, one line of work');
  await expect(sec.locator('.md-lede')).toContainText('A sutra is a short rule');
  const ways = sec.locator('.lv-way');
  await expect(ways).toHaveCount(2);
  await expect(ways.locator('figcaption')).toHaveText(['The school way', /^The sutra way/]);
  await expect(ways.locator('.lv-sum')).toHaveText(['98 × 97', '98 × 97']);
  for (const w of [0, 1]) await expect(ways.nth(w).locator('.lv-steps li').last()).toContainText('9506');
});

for (const scheme of ['light', 'dark'] as const) {
  test(`A phone: at 320 px in ${scheme === 'light' ? 'Daybreak' : 'Deep Space'} the section's cards sit in one column, nothing scrolls sideways, and axe finds nothing serious`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/');
    const boxes = await page.locator('.lv-sutras .lv-way, .lv-sutras a.lv-sutra').evaluateAll(els => els.map(e => e.getBoundingClientRect().toJSON()));
    expect(boxes).toHaveLength(5);
    expect(new Set(boxes.map(b => Math.round(b.x))).size).toBe(1);
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].y).toBeGreaterThanOrEqual(boxes[i - 1].y + boxes[i - 1].height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const r = await new AxeBuilder({ page }).include('.lv-sutras').analyze();
    expect(r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id)).toEqual([]);
  });
}

test('A Sutra card: tapping the Nikhilaṃ Navataścaramaṃ Daśataḥ card opens that Deep dive in the game, not the Mode picker', async ({ page }, info) => {
  await page.goto('/');
  const card = page.locator('a.lv-sutra[href="/play/#/sutras/s2"]');
  await expect(card.locator('b[lang="sa-Latn"]')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
  if (info.project.use.hasTouch) await card.tap(); else await card.click();
  await expect(page).toHaveURL(/\/play\/#\/sutras\/s2$/);
  await expect(page.locator('dialog.sutra-modal #sdTitle')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
  await expect(page.locator('.mode-pick')).toHaveCount(0);
});

test("Where they come from: the section credits Bharati Krishna Tirtha's 1965 book, says the Sutras are not found in the Vedas, and links to all 29 sutras", async ({ page }) => {
  await page.goto('/');
  const note = page.locator('.lv-sutras .lv-sutras-note');
  await expect(note).toContainText("Bharati Krishna Tirtha's book Vedic Mathematics, published in 1965");
  await expect(note).toContainText('They are not found in the Vedas');
  await expect(note.getByRole('link', { name: 'See all 29 sutras' })).toHaveAttribute('href', '/play/#/sutras');
});

test('The hero says little: "Math in your head, the sutra way", "Free, for ages 4 to adult." and Start learning, at most 14 words, with the Sutras and what the site teaches below it', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('.lv-hero-t');
  await expect(hero.locator('h1')).toHaveText('Math in your head, the sutra way');
  await expect(hero.locator('.lv-sub')).toHaveText('Free, for ages 4 to adult.');
  await expect(hero.locator('a.lv-play')).toHaveText('Start learning');
  const text = await hero.evaluate(el => [...el.children].filter(c => !c.querySelector('a, button')).map(c => (c as HTMLElement).innerText).join(' '));
  expect(text.trim().split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(14);
  const h = (await hero.boundingBox())!, s = (await page.locator('.lv-sutras').boundingBox())!, w = (await page.getByRole('heading', { name: 'What you learn' }).boundingBox())!;
  expect(s.y).toBeGreaterThanOrEqual(h.y + h.height);
  expect(w.y).toBeGreaterThan(s.y);
});
