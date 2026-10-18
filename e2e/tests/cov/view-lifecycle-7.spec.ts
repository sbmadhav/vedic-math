import { test, expect, open } from '../fixtures';

/* view-lifecycle spec, "One tap, one action, in every round / Party Mode setup after a change": WHEN a Player changes
   a level in Party Mode setup and then taps "Add a player" once THEN exactly one player is added. The other scenarios
   of this requirement kept their names and are covered by view-lifecycle-1 (Explorer tap), arena.spec.ts (keypad in
   round 2) and practice.spec.ts (symbol keys and the hint link after several questions). */

test('Party Mode setup after a change: one tap on Add a player adds exactly one seat', async ({ page, issues }) => {
  await open(page, '#/arena/party');
  const seats = page.locator('.pt-seat');
  const n0 = await seats.count();
  expect(n0).toBeGreaterThanOrEqual(2);
  const level = page.locator('.pt-seat select, .pt-seat [data-level]').first();
  if (await level.evaluate(e => e.tagName === 'SELECT')) {
    const opts = await level.locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value));
    await level.selectOption(opts[opts.length - 1]);
  } else await level.click();
  await page.getByRole('button', { name: /add a player/i }).click();
  await expect(seats).toHaveCount(n0 + 1);
  await page.waitForTimeout(300);
  await expect(seats).toHaveCount(n0 + 1);
  expect(issues.console).toEqual([]);
});
