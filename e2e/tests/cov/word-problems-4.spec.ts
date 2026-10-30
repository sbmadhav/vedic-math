import { test, expect, open } from '../fixtures';
import { READY, box, label, question, skip, recordSpeech, said, spoken } from '../word-kit';

/* word-problems spec (change word-problems), Requirement "Styles grow with the Mode". */

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer', seedProgress: READY });
  test('An Explorer picture story: put together, drawn, big buttons, and spoken whole', async ({ page }) => {
    await recordSpeech(page);
    await open(page, '#/skill/k-add10');
    await skip(page, 4);
    await expect(label(page)).toHaveText('Story time');
    await expect(question(page)).toContainText(/more .*How many .* now\?/);
    await expect(box(page).locator('.mq-viz svg')).toBeVisible();
    await expect(box(page).getByRole('group', { name: 'Choices' })).toBeVisible();
    const words = await spoken(page, await question(page).innerHTML());
    await expect.poll(() => said(page), { timeout: 5000 }).toContain(words);
  });
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });
  test('A Pro budget: Real-life problems asks a story whose plan names two or more steps', async ({ page }) => {
    await open(page, '#/skill/8-reallife');
    await expect(label(page)).toHaveText('Word problem');
    await box(page).locator('#prHint').click();
    await box(page).locator('#prHint').click();
    await expect(box(page).locator('#prSay')).toContainText(/Hint: (Two|Three) steps|Hint: Square the two sides/);
  });
});
