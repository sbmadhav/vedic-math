import { test, expect, open } from '../fixtures';

/* first-visit spec, Requirement "Three doors first on Home" as changed by openspec change sutras-first, scenario
   "Sparks follow the Sutras": one test per scenario. The changed "A new Challenger" and "Pro" scenarios, and the
   changed "Explorer" scenario of "Explorer Home keeps its pictures", are the updated tests in first-visit-1.spec.ts. */
for (const mode of ['challenger', 'pro'] as const) {
  test.describe(mode, () => {
    test.use({ seedMode: mode });
    test(`Sparks follow the Sutras: the ${mode} Player strip with Sparks comes after the doors and "Your sutras"`, async ({ page }) => {
      await open(page);
      const strip = page.locator('.me-strip');
      await expect(strip).toContainText('Sparks');
      await expect(page.locator('.your-sutras h2')).toHaveText('Your sutras');
      const doors = (await page.locator('.home-doors').boundingBox())!, yours = (await page.locator('.your-sutras').boundingBox())!, s = (await strip.boundingBox())!;
      expect(yours.y).toBeGreaterThanOrEqual(doors.y + doors.height);
      expect(s.y).toBeGreaterThanOrEqual(yours.y + yours.height);
    });
  });
}
