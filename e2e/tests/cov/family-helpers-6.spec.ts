import { test, expect, open } from '../fixtures';
import { SKILL, ON, visit, say, btn, askFriend, turns, factors } from '../family-kit';

/* family-helpers spec (change family-helpers), Requirement "The friends never give the answer". */
test.use({ seedPlayer: ON });

test('Show me in a visit: a worked example whose question and answer differ, and the question is still open', async ({ page }) => {
  await open(page, SKILL);
  const { a, b, q } = await factors(page);
  await askFriend(page);
  await turns(page);
  await btn(page, 'Show me').click();
  await expect(say(page).locator('.fh-steps li').first()).toBeVisible();
  expect(((await say(page).locator('.fh-ex').textContent()) || '').replace(/\s/g, '')).not.toBe(q.replace(/\s/g, ''));
  await expect(say(page).locator('.fh-ex-a b')).not.toHaveText(String(a * b));
  await expect(page.locator('#practice #prCheck')).toHaveText('Check');
  await expect(page.locator('#practice #prCheck')).toBeEnabled();
  await expect(page.locator('#practice #prSol')).toBeHidden();
  await expect(page.locator('#practice #prSay')).not.toContainText(String(a * b));
});

test('Another hint counts as a hint: the round\'s hint shows under the answer, as the Hint button shows it', async ({ page }) => {
  await open(page, SKILL);
  await askFriend(page);
  await turns(page);
  await btn(page, 'Another hint').click();
  await expect(visit(page)).toHaveCount(0);
  await expect(page.locator('#practice #prSay')).toContainText('Hint:');
  const viaFriend = await page.locator('#practice #prSay .md-bubble').textContent();
  await page.locator('#practice #prHint').click();
  await expect(page.locator('#practice #prSay .md-bubble')).toHaveText(/^Hint: /);
  expect(viaFriend).toMatch(/^Hint: /);
});
