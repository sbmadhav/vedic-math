import { test, expect, open } from '../fixtures';

/* find spec, Requirements "The index holds every named thing" (A Play mode), "Plain words find things too" (Multiply
   big numbers, A kind word), "Results are grouped and ranked" (One stray word) and "Questions are answered first":
   one test per new scenario (openspec change find-and-home-polish). */
type Page = import('@playwright/test').Page;
const hits = (page: Page) => page.locator('#findOut .find-hit');
const groups = (page: Page) => page.locator('#findOut .find-group h2').allInnerTexts();
const group = (page: Page, name: string) => page.locator('#findOut .find-group', { has: page.locator('h2', { hasText: name }) }).locator('.find-hit');
async function find(page: Page, q: string) { await page.locator('#findIn').fill(q); await expect(page.locator('#findCount')).not.toHaveText(''); }

test('A Play mode: "explorer" lists Explorer Mode, which opens Me', async ({ page }) => {
  await open(page, '#/find');
  await find(page, 'explorer');
  const m = group(page, 'Play modes').first();
  await expect(m.locator('b')).toHaveText('Explorer Mode');
  await m.click();
  await expect(page).toHaveURL(/#\/me$/);
});

test('Multiply big numbers: the Tricks come first, led by Multiply any two numbers in one line', async ({ page }) => {
  await open(page, '#/find');
  await find(page, 'multiply big numbers');
  expect((await groups(page))[0]).toBe('Tricks');
  await expect(group(page, 'Tricks').first().locator('b')).toHaveText('Multiply any two numbers in one line');
});

test('A kind word: "games" lists the Games section and at least four games', async ({ page }) => {
  await open(page, '#/find');
  await find(page, 'games');
  await expect(group(page, 'Sections').locator('b', { hasText: /^Games$/ })).toHaveCount(1);
  expect(await group(page, 'Games').count()).toBeGreaterThanOrEqual(4);
});

test('One stray word: "arena zzzz" still puts the Arena section first', async ({ page }) => {
  await open(page, '#/find');
  await find(page, 'arena zzzz');
  await expect(hits(page).first().locator('b')).toHaveText('Arena');
});

test('How does it work: "how does it work", "help" and "where do I start" give Best match, Guide then Getting around', async ({ page }) => {
  await open(page, '#/find');
  for (const q of ['how does it work', 'help', 'where do I start']) {
    await find(page, q);
    expect((await groups(page))[0], q).toBe('Best match');
    await expect(group(page, 'Best match').locator('b')).toHaveText(['Guide', 'Getting around']);
  }
});

test('What is Vedic math: Best match lists the Sutras section and the Sutra cards guide section first', async ({ page }) => {
  await open(page, '#/find');
  await find(page, 'what is vedic math');
  const best = group(page, 'Best match');
  await expect(best.nth(0)).toHaveAttribute('href', '#/sutras');
  await expect(best.nth(1)).toHaveAttribute('href', '#/guide/sutras');
});

test('For kids: "for kids", "children" and "my child" give Explorer Mode (opening Me), then the Play modes guide section', async ({ page }) => {
  await open(page, '#/find');
  for (const q of ['for kids', 'children', 'my child']) {
    await find(page, q);
    expect((await groups(page))[0], q).toBe('Best match');
    const best = group(page, 'Best match');
    await expect(best.nth(0).locator('b')).toHaveText('Explorer Mode');
    await expect(best.nth(0)).toHaveAttribute('href', '#/me');
    await expect(best.nth(1)).toHaveAttribute('href', '#/guide/modes');
  }
});

test('For adults: the Best match group starts with Pro Mode', async ({ page }) => {
  await open(page, '#/find');
  await find(page, 'for adults');
  await expect(group(page, 'Best match').first().locator('b')).toHaveText('Pro Mode');
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Not a question about the app: "how many dots" has no Best match and lists the Skill How many dots?', async ({ page }) => {
    await open(page, '#/find');
    await find(page, 'how many dots');
    expect(await groups(page)).not.toContain('Best match');
    await expect(hits(page).locator('b', { hasText: 'How many dots?' }).first()).toBeVisible();
  });
});
