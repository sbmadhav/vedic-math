import { test, expect, appErrors } from '../fixtures';
import { at, openWarm, nextUntil } from '../warm-up-kit';

/* teacher-warm-up spec (change teacher-warm-up), Requirement "A projector warm-up in five screens", Scenarios "A whole
   warm-up" and "Reveal, then the steps"; Requirement "One click from the teachers page", Scenario "From the teachers
   page". A device with no Player: the warm-up needs none (design D1). */
test.use({ seedMode: null });

test("A whole warm-up: Today's trick, then 25², 65², 115², then Practice at home for Square numbers ending in 5", async ({ page, issues }) => {
  await openWarm(page, 'sq5');
  await expect(page.locator('#wuTitle')).toHaveText('Square numbers ending in 5');
  await expect(at(page)).toHaveText(/^Today's trick/);
  await expect(page.locator('#wuSutraName')).toHaveText('Ekādhikena Pūrveṇa');
  await expect(page.locator('#wuMeaning')).toHaveText('By one more than the one before');
  await expect(page.locator('#wuIntro')).toContainText("in Bharati Krishna Tirtha's 1965 book Vedic Mathematics");
  await expect(page.locator('#wuIdea')).toContainText('Take the part before the 5');
  await expect(page.locator('#wuExQ')).toHaveText('35²');
  await expect(page.locator('#wuExBoard .sb-step')).toHaveCount(0);
  // the worked example steps with Next, and the steps build up and stay
  await page.locator('#wuNext').click();
  await expect(page.locator('#wuExBoard .sb-step')).toHaveCount(1);
  await expect(page.locator('#wuExBoard .sb-step').first()).toContainText('The part before the 5 is 3.');
  await page.locator('#wuNext').click();
  await expect(page.locator('#wuExBoard .sb-step')).toHaveCount(2);
  await expect(page.locator('#wuExBoard .sb-step[aria-current="step"]')).toContainText('3 × 4 = 12');
  for (const [label, q] of [['Problem 1 of 3', '25²'], ['Problem 2 of 3', '65²'], ['Problem 3 of 3', '115²']] as const) {
    await nextUntil(page, label);
    await expect(page.locator('#wuIntro')).toBeHidden();
    await expect(page.locator('#wuQ')).toHaveText(q);
    await expect(page.locator('#wuQ')).toBeVisible();
    await expect(page.locator('#wuA')).toBeHidden();
    await expect(page.locator('#wuBoard')).toBeHidden();
  }
  await nextUntil(page, 'Practice at home');
  await expect(page.locator('#wuProblem')).toBeHidden();
  await expect(page.locator('#wuUrl')).toHaveText('learnvedicmath.com/tricks/square-numbers-ending-in-5/');
  await expect(page.locator('#wuUrl')).toHaveAttribute('href', '/tricks/square-numbers-ending-in-5/');
  await expect(page.locator('#wuNext')).toBeDisabled();
  expect(appErrors(issues)).toEqual([]);
  expect(issues.failed).toEqual([]);
});

test('Reveal, then the steps: on Problem 2, 4225 is shown, then the steps for 65 appear under it while the answer stays', async ({ page }) => {
  await openWarm(page, 'sq5');
  await nextUntil(page, 'Problem 2 of 3');
  await expect(page.locator('#wuQ')).toHaveText('65²');
  const reveal = page.locator('#wuReveal');
  await expect(reveal).toHaveText('Reveal');
  await reveal.click();
  await expect(page.locator('#wuA')).toHaveText('4225');
  await expect(page.locator('#wuBoard')).toBeHidden();
  await expect(reveal).toHaveText('Show the steps');
  await reveal.click();
  const steps = page.locator('#wuBoard .sb-step');
  await expect(steps).toHaveCount(1);
  await expect(steps.first()).toContainText('The part before the 5 is 6.');
  await expect(page.locator('#wuA')).toHaveText('4225');
  await expect(reveal).toBeHidden();
  // the steps build up and stay (design D2): Next adds the second under the first
  await page.locator('#wuNext').click();
  await expect(steps).toHaveCount(2);
  await expect(steps.first()).toContainText('The part before the 5 is 6.');
  await expect(steps.nth(1)).toContainText('6 × 7 = 42');
  await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('#wuA')).toHaveText('4225');
  await expect(page.locator('#wuQ')).toHaveText('65²');
  await expect(at(page)).toHaveText(/^Problem 2 of 3/);
  // Back undoes the last step; the answer stays
  await page.locator('#wuBack').click();
  await expect(steps).toHaveCount(1);
  await expect(page.locator('#wuA')).toHaveText('4225');
});

test("From the teachers page: Open the projector warm-up opens /teachers/warm-up/ on Today's trick, with no Mode picker", async ({ page }) => {
  await page.goto('/teachers/');
  const box = page.getByRole('region', { name: "A 5-minute warm-up for today's class" });
  await box.getByRole('link', { name: 'Open the projector warm-up' }).click();
  await expect(page).toHaveURL(/\/teachers\/warm-up\/$/);
  await expect(at(page)).toHaveText(/^Today's trick/);
  await expect(page.locator('#wuTitle')).not.toHaveText('Loading the trick');
  await expect(page.locator('.mode-pick, .mode-card, #view')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('vm.players'))).toBeNull();
});
