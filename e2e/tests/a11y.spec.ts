import AxeBuilder from '@axe-core/playwright';
import { test, expect, APP, open, chromiumOnly } from './fixtures';

/* axe-core on the main routes, failing on serious or critical violations. Chromium only: the rules
   check the DOM and computed styles, which the other engines would only repeat.
   Known violations on the live site are listed in KNOWN. Each one is left out of the route checks
   (only that rule on that element) and recorded as its own test.fixme below, so it stays visible.
   When one is fixed, delete its KNOWN entry: the route checks then cover it again. */

const ROUTES = ['#/', '#/learn', '#/dojo', '#/arena', '#/games', '#/sutras', '#/watch', '#/me', '#/skill/v-sq5', '#/game/times-sprint'];

/* Known violations on the live site: { route, rule, target, note }. Empty: the XP bar is a progressbar and
   #prRun lost its label (both fixed in js/app.js). Add an entry when a new one is found and reported. */
const KNOWN: { route: string; rule: string; target: string; note: string }[] = [];

async function serious(page: import('@playwright/test').Page, route?: string) {
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
  const known = KNOWN.filter(k => k.route === route);
  return res.violations
    .filter(v => v.impact === 'serious' || v.impact === 'critical')
    .map(v => ({ ...v, nodes: v.nodes.filter(n => !known.some(k => k.rule === v.id && n.target.join(' ') === k.target)) }))
    .filter(v => v.nodes.length)
    .map(v => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.slice(0, 5).map(n => n.target.join(' ')).join(' | ')}${v.nodes.length > 5 ? ` and ${v.nodes.length - 5} more` : ''}`);
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} scheme`, () => {
    test.use({ colorScheme: scheme });
    for (const r of ROUTES) {
      test(`${r} has no serious or critical axe violations`, async ({ page }, testInfo) => {
        chromiumOnly(testInfo);
        await open(page, r);
        await page.waitForLoadState('networkidle');
        expect(await serious(page, r)).toEqual([]);
      });
    }
  });
}

/* The Duel after Start (duel spec): both sides show the same question, picture and choices */
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} scheme, explorer`, () => {
    test.use({ colorScheme: scheme, seedMode: 'explorer' });
    test('#/duel after Start has no serious or critical axe violations', async ({ page }, testInfo) => {
      chromiumOnly(testInfo);
      await open(page, '#/duel');
      await page.locator('#dGo').click();
      await expect(page.locator('#dQ0')).not.toBeEmpty();
      expect(await serious(page, '#/duel')).toEqual([]);
    });
  });
}

for (const k of KNOWN) {
  // Known issue on the live site, reported to the owner. Remove .fixme (and the KNOWN entry) once fixed.
  test.fixme(`known: ${k.rule} on ${k.target} (${k.route}). ${k.note}`, async ({ page }, testInfo) => {
    chromiumOnly(testInfo);
    await open(page, k.route);
    const res = await new AxeBuilder({ page }).withRules([k.rule]).analyze();
    expect(res.violations.flatMap(v => v.nodes.map(n => n.target.join(' ')))).not.toContain(k.target);
  });
}

test.describe('first visit', () => {
  test.use({ seedMode: null });
  test('the mode picker has no serious or critical axe violations', async ({ page }, testInfo) => {
    chromiumOnly(testInfo);
    await page.goto(APP);
    await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
    expect(await serious(page)).toEqual([]);
  });
});

test('the Explore menu has no serious or critical axe violations', async ({ page }, testInfo) => {
  chromiumOnly(testInfo);
  await open(page);
  await page.locator('#exploreBtn').click();
  await expect(page.locator('dialog.xpm')).toBeVisible();
  const res = await new AxeBuilder({ page }).include('dialog.xpm').analyze();
  expect(res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
});

/* Posting consent: the age sheet and the Parent step on the Me page, in both color schemes and every Mode */
const axeIn = async (page: import('@playwright/test').Page, sel: string) => {
  const res = await new AxeBuilder({ page }).include(sel).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
  return res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`);
};
for (const scheme of ['light', 'dark'] as const) {
  for (const mode of ['explorer', 'challenger', 'pro'] as const) {
    test.describe(`${scheme} scheme, ${mode}`, () => {
      test.use({ colorScheme: scheme, seedMode: mode });
      test('the age sheet has no serious or critical axe violations', async ({ page }, testInfo) => {
        chromiumOnly(testInfo);
        await open(page, '#/me');
        await page.locator('#wbAsk').click();
        await expect(page.locator('dialog.vm-sheet')).toBeVisible();
        expect(await axeIn(page, 'dialog.vm-sheet')).toEqual([]);
        await page.locator('dialog.vm-sheet [data-age="9"]').click();
        await expect(page.locator('dialog.vm-sheet h2')).toHaveText('Saved on this device');
        expect(await axeIn(page, 'dialog.vm-sheet')).toEqual([]);
      });
    });
    test.describe(`${scheme} scheme, ${mode}, under 13`, () => {
      test.use({ colorScheme: scheme, seedMode: mode, seedConsent: { age: 8 } });
      test('the Parent step and its switch have no serious or critical axe violations', async ({ page }, testInfo) => {
        chromiumOnly(testInfo);
        await open(page, '#/me');
        expect(await axeIn(page, '#worldBoards')).toEqual([]);
        await page.locator('#wbIn').fill('1');
        await page.locator('#wbCheck button').click();
        await expect(page.locator('#wbErr')).not.toBeEmpty();
        expect(await axeIn(page, '#worldBoards')).toEqual([]);
        await page.locator('#wbIn').fill((await page.locator('#wbCheck').getAttribute('data-n'))!);
        await page.locator('#wbCheck button').click();
        await expect(page.getByRole('switch')).toBeVisible();
        expect(await axeIn(page, '#worldBoards')).toEqual([]);
        await page.getByRole('switch').click();
        await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
        expect(await axeIn(page, '#worldBoards')).toEqual([]);
      });
    });
  }
}
