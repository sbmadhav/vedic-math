import { test, expect, open, openExplore } from '../fixtures';
import type { Page } from '@playwright/test';

/* openspec/specs/accessibility/spec.md
   - Pages reflow at 320px / Settings on a small phone: the voice picker fits the screen and #/me does not scroll sideways.
   - Motion can be paused / Pause from the Explore menu: the background canvas stops changing and no looping
     animation runs, and BOTH resume when Pause motion is turned off. (e2e/tests/wcag.spec.ts checks the pause and
     the background resuming, but never that a looping animation runs before the pause or runs again after it.) */

const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('Settings on a small phone', () => {
  test('at 320px the voice picker fits the screen and #/me does not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await open(page, '#/me');
    const picker = page.locator('#vvSet');
    await expect(picker).toBeVisible();
    await expect(page.locator('#setVoiceName')).toBeVisible();
    await expect(page.locator('#vvTest')).toBeVisible();
    // Show the natural voice list too (without switching the natural voice on, which would start a 100 MB download),
    // so the widest part of the picker is measured as well
    await page.evaluate(() => document.querySelector('#setNaturalVoice')!.removeAttribute('hidden'));
    await expect(page.locator('#setNaturalVoice')).toBeVisible();
    const out = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const els = [document.querySelector('#vvSet'), ...document.querySelectorAll('#vvSet .vv-row, #vvSet select:not([hidden]), #vvSet button, #vvSet label')] as HTMLElement[];
      return els.filter(Boolean).map(e => { const r = e.getBoundingClientRect(); return { id: e.id || e.className, left: r.left, right: r.right, vw, clipped: e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== 'visible' }; })
        .filter(r => r.left < -0.5 || r.right > r.vw + 0.5 || r.clipped);
    });
    expect(out, 'parts of the voice picker outside the 320px screen').toEqual([]);
    expect(await sideways(page)).toBe(0);
  });
});

test.describe('Pause from the Explore menu', () => {
  test.use({ reducedMotion: 'no-preference' });

  const bgMoving = (page: Page) => page.evaluate(async () => {
    const c = document.querySelector('canvas.vm-bg') as HTMLCanvasElement | null;
    if (!c) return false;
    const a = c.toDataURL(); await new Promise(r => setTimeout(r, 400)); return a !== c.toDataURL();
  });
  const looping = (page: Page) => page.evaluate(() => document.getAnimations()
    .filter(a => a.playState === 'running' && a.effect!.getTiming().iterations === Infinity).length);

  test('the background and the looping animations stop, and both resume when Pause motion is turned off', async ({ page }) => {
    // A level map: its next level pulses in a loop (.lv-node.next, lvPulse)
    await open(page, '#/game/balloons');
    await expect(page.locator('.lv-node.next').first()).toBeVisible();
    await expect.poll(() => bgMoving(page), { timeout: 15_000 }).toBe(true);
    await expect.poll(() => looping(page)).toBeGreaterThan(0);

    const dlg = await openExplore(page);
    const sw = dlg.locator('#xpMotion');
    await sw.click();
    await expect(sw).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).toHaveClass(/motion-paused/);
    await expect.poll(() => bgMoving(page)).toBe(false);
    await expect.poll(() => looping(page)).toBe(0);
    // Still held a moment later
    expect(await bgMoving(page)).toBe(false);
    expect(await looping(page)).toBe(0);

    const dlg2 = await openExplore(page);
    await dlg2.locator('#xpMotion').click();
    await expect(dlg2.locator('#xpMotion')).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).not.toHaveClass(/motion-paused/);
    await expect.poll(() => bgMoving(page), { timeout: 15_000 }).toBe(true);
    await expect.poll(() => looping(page)).toBeGreaterThan(0);
  });
});
