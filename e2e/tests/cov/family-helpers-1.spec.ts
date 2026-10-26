import { test, expect, open, APP } from '../fixtures';
import { SKILL, visit, ask, missTwice } from '../family-kit';

/* family-helpers spec (change family-helpers), Requirement "The Family helpers are off until turned on". */

test('A new Player: two misses on a Practice question bring no Family helper and no Ask a friend button', async ({ page }) => {
  await open(page, SKILL);
  await missTwice(page);
  await expect(visit(page)).toHaveCount(0);
  await expect(ask(page)).toHaveCount(0);
});

test('Turning them on: the switch is still on after a reload and When they help shows Always', async ({ page }) => {
  await open(page, '#/me');
  await page.locator('#familySwitch').click();
  await page.reload();
  await expect(page.locator('#familySwitch')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('input[name="familyHelp"][value="always"]')).toBeChecked();
  await page.goto(`${APP}${SKILL}`);
  await expect(ask(page)).toBeVisible();
});
