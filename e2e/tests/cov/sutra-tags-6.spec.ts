import { test, expect, open } from '../fixtures';
import AxeBuilder from '@axe-core/playwright';

/* sutra-tags spec (openspec change sutras-first), Requirements "One tap to the Deep dive and one back", "Tags are not
   spoken" and "Tags work on a phone in both schemes": one test per scenario. */

test('From a Trick and back: following the tag on Square numbers ending in 5 opens Ekādhikena Pūrveṇa, and closing shows the Trick page again', async ({ page }) => {
  await open(page, '#/learn');
  await page.evaluate(() => { location.hash = '#/skill/v-sq5'; });
  await page.locator('.mq-sutra a.sutra-tag-a').click();
  const dlg = page.locator('dialog.sutra-modal');
  await expect(dlg.locator('#sdTitle')).toHaveText('Ekādhikena Pūrveṇa');
  await dlg.locator('.sd-x').click();
  await expect(page).toHaveURL(/#\/skill\/v-sq5$/);
  await expect(page.locator('.mq-sutra')).toBeVisible();
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('Read aloud on: nothing from the tag is spoken while the first question is read', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__said = [];
      const fake = { speak: (u: any) => (window as any).__said.push(u.text), cancel() {}, getVoices: () => [], pending: false, speaking: false, paused: false, addEventListener() {}, removeEventListener() {} };
      Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    });
    await open(page, '#/skill/v-sq5');
    await page.waitForTimeout(800);
    const said: string[] = await page.evaluate(() => (window as any).__said);
    expect(said.join(' ')).not.toMatch(/Ekādhikena|one more than the number before|open its deep dive/i);
  });
});

for (const scheme of ['light', 'dark'] as const) {
  test(`A 320 px phone in ${scheme === 'light' ? 'Daybreak' : 'Deep Space'}: a Trick page, a Kata and the Dojo do not scroll sideways and axe finds nothing serious in the tags`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 320, height: 720 });
    for (const hash of ['#/skill/v-sq5', '#/kata/from9/1', '#/dojo']) {
      await open(page, hash);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), hash).toBe(true);
      const r = await new AxeBuilder({ page }).include('.sutra-tag').analyze();
      expect(r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${hash}: ${v.id}`)).toEqual([]);
    }
  });
}
