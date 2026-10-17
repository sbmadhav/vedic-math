import { test, expect, open, cloudLog, type Mode } from '../fixtures';
import type { Locator, Page } from '@playwright/test';

/* page-layout spec, Requirement "Game prompts are large and high contrast".
   games.spec.ts checks size and ink on chromium only; this file adds the prompt text itself, the exact
   instruction size for Make ten and Multiple rain, every Mode that can play them, and WebKit. */

async function startEndless(page: Page, id: string) {
  await open(page, `#/game/${id}`);
  await page.locator('#gShell [data-m="endless"]').click();
  await page.locator('#gStart').click();
}

/** Computed size and color of the element, the main ink color resolved in the same place, and the muted color. */
async function style(el: Locator) {
  return el.evaluate(e => {
    const probe = (v: string) => { const s = document.createElement('span'); s.style.color = v; e.parentElement!.append(s); const c = getComputedStyle(s).color; s.remove(); return c; };
    const cs = getComputedStyle(e);
    return { size: parseFloat(cs.fontSize), color: cs.color, ink: probe('var(--ink)'), root: parseFloat(getComputedStyle(document.documentElement).fontSize) };
  });
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`Balloon pop prompt (${scheme})`, () => {
    test.use({ seedMode: 'explorer' });

    test(`an Explorer sees "Pop N balloons" at 24 px or more in ink (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await startEndless(page, 'balloons');
      const ask = page.locator('#gArea .g-q').first();
      await expect(ask).toBeVisible();
      await expect(ask).toHaveText(/^Pop .+ balloons?!$/);
      const st = await style(ask);
      expect(st.size).toBeGreaterThanOrEqual(24);
      expect(st.size).not.toBe(15);
      expect(st.color).toBe(st.ink);
      // the prompt for the next round keeps the same style
      const n = Number(/^Pop (\d+) balloon/.exec((await ask.textContent()) || '')?.[1]);
      if (n) {
        for (let i = 0; i < n; i++) await page.locator('#gArea .g-balloon:not(.popped)').first().click();
        await page.locator('#gArea .g-tools button').click();
        await expect(page.locator('#gPts')).not.toHaveText('0');
      }
      const st2 = await style(ask);
      expect(st2.size).toBeGreaterThanOrEqual(24);
      expect(st2.color).toBe(st2.ink);
      await page.locator('#gQuit').click();
      expect((await cloudLog(page)).writes).toEqual([]);
    });
  });
}

const LINES = [
  { id: 'make-ten', text: /^Find pairs that make \d+(\.\d+)?\.$/ },
  { id: 'rain', text: /^Tap the multiples of \d+\.$/ },
];
for (const g of LINES) {
  for (const mode of ['explorer', 'challenger', 'pro'] as Mode[]) {
    test.describe(`${g.id} target line (${mode})`, () => {
      test.use({ seedMode: mode });
      for (const scheme of ['light', 'dark'] as const) {
        test(`${g.id}: the target line is at the instruction size in ink (${mode}, ${scheme})`, async ({ page }) => {
          await page.emulateMedia({ colorScheme: scheme });
          await startEndless(page, g.id);
          const line = page.locator('#gArea .g-say').first();
          await expect(line).toBeVisible();
          await expect(line).toHaveText(g.text);
          const st = await style(line);
          // game instruction size: 1.15rem, well above the 15 px muted card paragraph
          expect(st.size).toBeCloseTo(1.15 * st.root, 1);
          expect(st.size).toBeGreaterThan(15);
          expect(st.color).toBe(st.ink);
          await page.locator('#gQuit').click();
          expect((await cloudLog(page)).writes).toEqual([]);
        });
      }
    });
  }
}
