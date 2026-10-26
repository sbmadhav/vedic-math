import { test, expect, open } from '../fixtures';
import { box, label } from '../word-kit';

/* word-problems spec (change word-problems), Requirement "Word problem Skills". */

test.use({ seedMode: 'pro' });

test('Real-life problems in the Skill map: listed under Grade 8, and its Practice asks a Word problem', async ({ page }) => {
  await open(page, '#/grade/8');
  const link = page.locator('a.mq-skill[href="#/skill/8-reallife"]');
  await expect(link).toContainText('Real-life problems');
  await link.click();
  await expect(page.locator('#view h1')).toContainText('Real-life problems');
  await expect(label(page)).toHaveText('Word problem');
  await box(page).locator('#prHint').click();
  await expect(box(page).locator('#prSay')).toContainText('Hint: What is it asking?');
});
