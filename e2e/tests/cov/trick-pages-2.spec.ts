import { test, expect } from '../fixtures';
import { openTrick, showSteps } from '../trick-kit';

/* trick-pages spec, Requirement "The calculator steps through the Trick for the visitor's numbers": one test per
   scenario, on sq5 (the spec's numbers), near-base and duplex. */

test('Typed numbers: 85 on Square numbers ending in 5, Show steps then Show all', async ({ page }) => {
  await openTrick(page, 'square-numbers-ending-in-5');
  await showSteps(page, 85);
  await expect(page.locator('#tkBoard .tk-step')).toHaveCount(1);
  await expect(page.locator('#tkBoard .tk-step').first()).toContainText('The part before the 5 is 8.');
  await page.locator('#tkAll').click();
  const steps = page.locator('#tkBoard .tk-step');
  await expect(steps).toHaveCount(3);
  await expect(steps.nth(0)).toContainText('The part before the 5 is 8.');
  await expect(steps.nth(1)).toContainText('8 × 9 = 72');
  await expect(steps.nth(2)).toContainText('85² = 7225');
  // Earlier steps stay on screen
  for (const s of await steps.all()) await expect(s).toBeVisible();
});

test('Typed numbers on two more Tricks: 97 × 94 near 100, and 47² by the duplex', async ({ page }) => {
  await openTrick(page, 'multiply-numbers-near-100');
  await showSteps(page, 97, 94);
  await page.locator('#tkAll').click();
  await expect(page.locator('#tkBoard .tk-step').last()).toContainText('97 × 94 = 9118');
  await openTrick(page, 'square-any-two-digit-number');
  await showSteps(page, 47);
  await page.locator('#tkAll').click();
  await expect(page.locator('#tkBoard .tk-step').last()).toContainText('47² = 2209');
});

test('A number the Trick does not take: 84 shows "Pick a number that ends in 5." and no steps', async ({ page }) => {
  await openTrick(page, 'square-numbers-ending-in-5');
  await showSteps(page, 84);
  await expect(page.locator('#tkErr')).toHaveText('Pick a number that ends in 5.');
  await expect(page.locator('#tkBoard .tk-step')).toHaveCount(0);
  await expect(page.locator('#tkNav')).toBeHidden();
  // The same on the other two Tricks, in their own words
  await openTrick(page, 'multiply-numbers-near-100');
  await showSteps(page, 97, 12);
  await expect(page.locator('#tkErr')).toHaveText('Both numbers need to be near the same 10, 100 or 1,000.');
  await expect(page.locator('#tkBoard .tk-step')).toHaveCount(0);
  await openTrick(page, 'square-any-two-digit-number');
  await showSteps(page, 100);
  await expect(page.locator('#tkErr')).toHaveText('Pick a number from 10 to 99.');
  await expect(page.locator('#tkBoard .tk-step')).toHaveCount(0);
});

test('Keyboard and screen reader: focus stays on the button pressed, and the step line says the new step politely', async ({ page }) => {
  await openTrick(page, 'square-numbers-ending-in-5');
  await page.locator('#tkForm input[data-i]').first().fill('85');
  await page.locator('#tkShow').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#tkShow')).toBeFocused();
  const at = page.locator('#tkAt');
  await expect(at).toHaveAttribute('aria-live', 'polite');
  await expect(at).toHaveAttribute('aria-atomic', 'true');
  await expect(at).toHaveText(/^Step 1 of 3: The part before the 5 is 8\./);
  await page.locator('#tkNext').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#tkNext')).toBeFocused();
  await expect(at).toHaveText(/^Step 2 of 3: One more than 8 is 9\. Multiply: 8 × 9 = 72\./);
  await page.keyboard.press('Enter');
  await expect(page.locator('#tkNext')).toBeFocused();
  await expect(at).toHaveText(/^Step 3 of 3: Write 25 on the right\. 85² = 7225\./);
  // The last step: Next is marked disabled but keeps focus (aria-disabled, not disabled)
  await expect(page.locator('#tkNext')).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await expect(page.locator('#tkBoard .tk-step')).toHaveCount(3);
  // Nothing moves by itself: under reduced motion (the suite's setting) the current step has no animation
  expect(await page.locator('#tkBoard .tk-step.cur').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});
