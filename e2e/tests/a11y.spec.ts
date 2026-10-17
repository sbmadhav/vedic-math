import AxeBuilder from '@axe-core/playwright';
import { test, expect, APP, open, chromiumOnly } from './fixtures';

/* axe-core on the main routes, failing on serious or critical violations. Chromium only: the rules
   check the DOM and computed styles, which the other engines would only repeat.
   Known violations on the live site are listed in KNOWN. Each one is left out of the route checks
   (only that rule on that element) and recorded as its own test.fixme below, so it stays visible.
   When one is fixed, delete its KNOWN entry: the route checks then cover it again. */

const ROUTES = ['#/', '#/learn', '#/dojo', '#/arena', '#/games', '#/sutras', '#/watch', '#/me', '#/skill/v-sq5', '#/game/times-sprint', '#/places', '#/guide'];

/* Known violations on the live site: { route, rule, target, note }. Empty: the Sparks bar is a progressbar and
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

/* Home with the first-visit tour open (in-app-guide 3.3) */
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} scheme, tour`, () => {
    test.use({ colorScheme: scheme, tourSeen: false });
    test('Home with the tour open has no serious or critical axe violations', async ({ page }, testInfo) => {
      chromiumOnly(testInfo);
      await open(page);
      await expect(page.locator('dialog.vm-tour')).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(await serious(page, '#/')).toEqual([]);
    });
  });
}

/* A Star round (star-round spec 5.4): during a question and during a replay */
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} scheme, Star`, () => {
    test.use({ colorScheme: scheme });
    test('#/star/sq5/1 during a question and a replay has no serious or critical axe violations', async ({ page }, testInfo) => {
      chromiumOnly(testInfo);
      await open(page, '#/star/sq5/1');
      await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
      await page.waitForLoadState('networkidle');
      expect(await serious(page, '#/star/sq5/1')).toEqual([]);
      await page.keyboard.type('1'); await page.keyboard.press('Enter');
      await expect(page.locator('.star-step').nth(1)).toBeVisible();
      expect(await serious(page, '#/star/sq5/1')).toEqual([]);
    });
  });
}

/* The Sky as home (sky-home 2.2), with a lit and a skipped Star, and the Me page with its Sky switch */
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} scheme, the Sky`, () => {
    test.use({ colorScheme: scheme, seedPlayer: { sky: true }, seedProgress: { v: 3, skills: {}, sky: { lit: { 'from9:1': 1 }, skipped: { 'from9:2': 1 }, last: {} } } });
    for (const r of ['#/', '#/places', '#/me']) {
      test(`${r} with the Sky on has no serious or critical axe violations`, async ({ page }, testInfo) => {
        chromiumOnly(testInfo);
        await open(page, r);
        if (r === '#/') await expect(page.locator('.sky-star')).toHaveCount(63);
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

/* The site header (site-header spec): wide and on a 320px phone, in both schemes, with the music panel open */
for (const scheme of ['light', 'dark'] as const) {
  for (const width of [1280, 320]) {
    test.describe(`${scheme} scheme, header at ${width}px`, () => {
      test.use({ colorScheme: scheme, viewport: { width, height: 800 } });
      test('the header has no serious or critical axe violations', async ({ page }, testInfo) => {
        chromiumOnly(testInfo);
        await open(page, '#/learn');
        const check = async () => {
          const res = await new AxeBuilder({ page }).include('body > header').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
          return res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`);
        };
        expect(await check()).toEqual([]);
        await page.locator('#vmMBtn').click();
        await expect(page.locator('#vmMPanel')).toBeVisible();
        expect(await check()).toEqual([]);
      });
    });
  }
}

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
        await expect(page.locator('#worldBoards').getByRole('switch')).toBeVisible();
        expect(await axeIn(page, '#worldBoards')).toEqual([]);
        await page.locator('#worldBoards').getByRole('switch').click();
        await expect(page.locator('#worldBoards').getByRole('switch')).toHaveAttribute('aria-checked', 'true');
        expect(await axeIn(page, '#worldBoards')).toEqual([]);
      });
    });
  }
}

/* The play shell and the Me page's Calm and motion group (openspec game-shell-and-calm), both schemes */
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} scheme, play shell`, () => {
    test.use({ colorScheme: scheme });
    test('an open play shell and the Calm settings have no serious or critical axe violations', async ({ page }, testInfo) => {
      chromiumOnly(testInfo);
      await open(page, '#/arena');
      await page.locator('[data-t="untimed"]').click();
      await page.locator('#arGo').click();
      await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
      expect(await serious(page, 'shell')).toEqual([]);
      await page.locator('.play-shell .play-calm').click();
      await page.locator('.play-shell [data-size="a+"]').click();
      expect(await serious(page, 'shell')).toEqual([]);
      await open(page, '#/me');
      await page.waitForLoadState('networkidle');
      expect(await serious(page, '#/me')).toEqual([]);
    });
  });
}

/* The sutra deep dive (openspec sutra-examples): worked examples all open, scrolled to the middle so the pinned
   footer and close button sit over the content, at desktop and phone widths, both schemes */
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} scheme, sutra deep dive`, () => {
    test.use({ colorScheme: scheme });
    for (const width of [1280, 375]) {
      test(`#/sutras/u9 at ${width}px with every example open has no serious or critical axe violations`, async ({ page }, testInfo) => {
        chromiumOnly(testInfo);
        await page.setViewportSize({ width, height: 760 });
        await open(page, '#/sutras/u9');
        const dlg = page.locator('dialog.sutra-modal');
        await expect(dlg).toBeVisible();
        await dlg.locator('.sd-ex details').evaluateAll(ds => ds.forEach(d => { (d as HTMLDetailsElement).open = true; }));
        await dlg.evaluate(el => { el.scrollTop = (el.scrollHeight - el.clientHeight) / 2; });
        await page.waitForLoadState('networkidle');
        expect(await serious(page, '#/sutras/u9')).toEqual([]);
      });
    }
  });
}
