import { test, expect, open } from '../fixtures';

/* accessibility spec, Requirement "Sutra names say their language": one test per scenario. */

test('Katas page tag: on #/katas/sq5 the Sutra tag has lang="sa-Latn"', async ({ page }) => {
  await open(page, '#/katas/sq5');
  const tag = page.locator('#view .md-tag--plum').first();
  await expect(tag).toBeVisible();
  await expect(tag).toHaveAttribute('lang', 'sa-Latn');
  await expect(tag).toContainText(/Ekādhikena/);
});

test('Button name: the Say it button in the deep dive of Sutra 3 is a toggle button named "Hear how to say Ūrdhva-Tiryagbhyām", not pressed', async ({ page }) => {
  await open(page, '#/sutras/s3');
  const btn = page.locator('dialog.sutra-modal .say-btn');
  await expect(btn).toHaveRole('button');
  await expect(btn).toHaveAccessibleName('Hear how to say Ūrdhva-Tiryagbhyām');
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
});
