import { test, expect } from '../fixtures';
import { animate, diagram, next } from '../connector-kit';

/* trick-connectors spec, Requirement "A text alternative for each diagram" (openspec working-memory-scaffolds):
   - Scenario "Near-base, the distances": the first step's diagram of 97 × 94 is an image read as "Lines join 97 to
     its distance minus 3, and 94 to its distance minus 6." */

test('each diagram of 97 × 94 is an image with a text alternative', async ({ page }) => {
  await animate(page, 'near-base', 97, 94);
  await expect(page.getByRole('img', { name: 'Lines join 97 to its distance minus 3, and 94 to its distance minus 6.' })).toBeVisible();
  await next(page);
  expect((await diagram(page)).label).toMatch(/^A line crosses from 97 to minus 6/);
  await next(page);
  await expect(page.getByRole('img', { name: 'A line joins minus 3 and minus 6: multiply them for the right part.' })).toBeVisible();
});
