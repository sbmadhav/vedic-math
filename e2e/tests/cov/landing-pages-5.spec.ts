import { test, expect } from '../fixtures';

/* landing-pages, Requirement "Welcome back marks Your Mode" (openspec change landing-modes-and-return):
   one test per scenario. */
test('A returning Challenger: the Challenger card is Your Mode, the others offer a switch', async ({ page }) => {
  await page.goto('/?home');
  const mine = page.getByRole('link', { name: 'Keep playing as Challenger' });
  await expect(mine).toHaveAttribute('aria-current', 'true');
  await expect(mine).toContainText('Your Mode');
  await expect(page.getByRole('link', { name: 'Switch to Explorer' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Switch to Pro' })).toBeVisible();
});

test('Switching from the landing page: Switch to Pro opens the Pro Home', async ({ page }) => {
  await page.goto('/?home');
  await page.getByRole('link', { name: 'Switch to Pro' }).click();
  await expect(page.locator('h1.home-h')).toHaveText('Train your mental math');
});
