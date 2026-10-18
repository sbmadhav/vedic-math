import AxeBuilder from '@axe-core/playwright';
import { test, expect, APP, chromiumOnly, type Page } from '../fixtures';

/* sutra-deep-dive spec, Requirements "At least three Worked examples per Sutra", "Worked examples are correct" and
   "Try first, then open the steps": one test per scenario. The build-time check of every result is
   test/sutra-examples.test.mjs; here the shipped page must carry the same checked results. */
const IDS = [...Array.from({ length: 16 }, (_, i) => 's' + (i + 1)), ...Array.from({ length: 13 }, (_, i) => 'u' + (i + 1))];
const dlg = (page: Page) => page.locator('dialog.sutra-modal');

async function openDeepDive(page: Page, id: string) {
  await page.goto(`${APP}#/sutras/${id}`);
  await expect(dlg(page)).toBeVisible();
  await expect(dlg(page).locator('.sd-ex > li').first()).toBeVisible();
}

test('Every Deep dive teaches with three or more: each of the 29 lists at least three numbered examples, the first open with its result highlighted', async ({ page }) => {
  await openDeepDive(page, 's1');
  for (const id of IDS) {
    await page.evaluate(h => location.replace(h), `#/sutras/${id}`);
    const items = dlg(page).locator('.sd-ex > li');
    await expect.poll(() => items.count(), { message: id }).toBeGreaterThanOrEqual(3);
    const n = await items.count();
    await expect(items.nth(0).locator('summary'), id).toContainText(`Example 1 of ${n}`);
    await expect(items.nth(0).locator('details'), id).toHaveAttribute('open', '');
    await expect(items.nth(0).locator('.hl').first(), id).toBeVisible();
  }
});

test('Plain numbers first: Ekādhikena Pūrveṇa opens on 25² = 625, before 65², 115² and 1/19', async ({ page }) => {
  await openDeepDive(page, 's1');
  const sums = dlg(page).locator('.sd-ex > li summary');
  await expect(sums.nth(0)).toContainText('25²');
  await expect(dlg(page).locator('.sd-ex > li').nth(0).locator('.hl').first()).toHaveText(/625/);
  await expect(sums.nth(1)).toContainText('65²');
  await expect(sums.nth(2)).toContainText('115²');
  await expect(sums.nth(3)).toContainText('1/19');
});

test('A wrong result fails the build: the shipped 25² and 65² results are the checked values (test/sutra-examples.test.mjs checks every example at build time)', async ({ page }) => {
  await openDeepDive(page, 's1');
  const results: { ex: string; hl: string }[] = await dlg(page).locator('.sd-ex > li').evaluateAll(els => els.map(li => ({ ex: (li.querySelector('summary')?.textContent || '').trim(), hl: (li.querySelector('.hl')?.textContent || '').trim() })));
  expect(results.length).toBeGreaterThanOrEqual(3);
  const sq = results.find(r => /^Example 1 of/.test(r.ex) && /25²/.test(r.ex));
  expect(sq, 'the first example is 25²').toBeTruthy();
  expect(Number(sq!.hl.replace(/[^\d.]/g, ''))).toBe(625);
  const second = results.find(r => /65²/.test(r.ex));
  expect(second, 'the second example is 65²').toBeTruthy();
  expect(Number(second!.hl.replace(/[^\d.]/g, ''))).toBe(4225);
});

test('Open by keyboard: Enter on "Example 2 of 4" shows its steps ending in 4225, Space closes them', async ({ page }) => {
  await openDeepDive(page, 's1');
  const second = dlg(page).locator('.sd-ex > li').nth(1), sum = second.locator('summary'), steps = second.locator('details > p');
  await expect(sum).toHaveAccessibleName(/Example 2 of 4/);
  await expect(steps).toBeHidden();
  await sum.focus();
  await page.keyboard.press('Enter');
  await expect(second.locator('details')).toHaveAttribute('open', '');
  await expect(steps.last()).toContainText('4225');
  await page.keyboard.press('Space');
  await expect(steps).toBeHidden();
});

for (const scheme of ['light', 'dark'] as const) {
  for (const width of [1280, 375]) {
    test.describe(`${scheme} at ${width}px`, () => {
      test.use({ colorScheme: scheme, viewport: { width, height: width > 400 ? 800 : 700 } });
      test('Accessible in both schemes: a Deep dive with every example open has no serious or critical axe violation', async ({ page }, testInfo) => {
        chromiumOnly(testInfo);
        await openDeepDive(page, 's1');
        await dlg(page).locator('.sd-ex > li details').evaluateAll(els => els.forEach(d => d.setAttribute('open', '')));
        const res = await new AxeBuilder({ page }).include('dialog.sutra-modal').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
        expect(res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
      });
    });
  }
}
