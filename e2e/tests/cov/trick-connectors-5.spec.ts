import { test, expect } from '../fixtures';
import { animate, diagram } from '../connector-kit';

/* trick-connectors spec, Requirement "Lines join the digits each step uses", Scenario "Show all": Show all lists
   every step of 97 × 94 at once and shows no diagram. */

test('Show all on 97 × 94 lists every step and shows no diagram', async ({ page }) => {
  await animate(page, 'near-base', 97, 94);
  await diagram(page); /* the first step's diagram is drawn before Show all */
  await page.locator('#animAll').click();
  await expect(page.locator('#animPos')).toHaveText('4 / 4');
  await expect(page.locator('#animBoard .anim-step')).toHaveCount(4);
  await expect(page.locator('#animLinks svg')).toHaveCount(0);
});
