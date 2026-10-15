import AxeBuilder from '@axe-core/playwright';
import { test, expect, APP, open, chromiumOnly } from './fixtures';

/* axe-core on the main routes, failing on serious or critical violations. Chromium only: the rules
   check the DOM and computed styles, which the other engines would only repeat.
   Known violations on the live site are listed in KNOWN. Each one is left out of the route checks
   (only that rule on that element) and recorded as its own test.fixme below, so it stays visible.
   When one is fixed, delete its KNOWN entry: the route checks then cover it again. */

const ROUTES = ['#/', '#/learn', '#/dojo', '#/arena', '#/games', '#/sutras', '#/watch', '#/me', '#/skill/v-sq5', '#/game/times-sprint'];

const KNOWN = [
  { route: '#/', rule: 'aria-prohibited-attr', target: '.mq-xpbar--big',
    note: 'Home: the XP bar <span class="mq-xpbar mq-xpbar--big" aria-label="... XP to the next level"> has aria-label on a span with no role (heroStats() in js/app.js). Give it role="progressbar" with aria-valuenow/min/max, or move the text into visually hidden copy.' },
  { route: '#/skill/v-sq5', rule: 'aria-prohibited-attr', target: '#prRun',
    note: 'Skill practice: <span class="pr-run" id="prRun" aria-label="Streak"> has aria-label on a span with no role (practice() in js/app.js). Drop the label or give it a role such as status.' },
];

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
