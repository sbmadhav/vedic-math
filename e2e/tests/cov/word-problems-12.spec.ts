import { test, expect, APP, open, atRoute } from '../fixtures';
import { box, label, onlyChoice, skillOf, skip } from '../word-kit';

/* word-problems spec (change word-problems-more), Requirement "Practice can ask only Word problems": one test per
   scenario. The Players here have no saved answers, so the mix asks no Word problem yet (word-problems D3). */

test('A new Challenger asks for only Word problems: the first four questions are Word problems from Grade 3 Skills', async ({ page }) => {
  await open(page, '#/mix/3');
  await expect(onlyChoice(page, false)).toHaveAttribute('aria-pressed', 'true');
  await onlyChoice(page, true).click();
  await expect(page).toHaveURL(atRoute('#/mix/3/words'));
  await expect(onlyChoice(page, true)).toHaveText('Only Word problems');
  await expect(onlyChoice(page, true)).toHaveAttribute('aria-pressed', 'true');
  for (let i = 1; i <= 4; i++) {
    await expect(label(page), `question ${i}`).toHaveText('Word problem');
    expect(await skillOf(page), `question ${i}`).toMatch(/^3-/);
    if (i < 4) await skip(page);
  }
});

test('Back to the mix: picking Mixed asks bare questions again, and a Word problem only on Two-step word problems', async ({ page }) => {
  await open(page, '#/mix/3/words');
  await expect(label(page)).toHaveText('Word problem');
  await onlyChoice(page, false).click();
  await expect(page).toHaveURL(atRoute('#/mix/3'));
  await expect(onlyChoice(page, false)).toHaveAttribute('aria-pressed', 'true');
  let bare = 0;
  for (let i = 1; i <= 6; i++) {
    await expect(box(page).locator('#prQ')).toBeVisible();
    if (await label(page).count()) expect(await skillOf(page), `question ${i}: a Word problem comes only from the Word problem Skill`).toBe('3-twostep');
    else bare++;
    if (i < 6) await skip(page);
  }
  expect(bare, 'bare questions in the mix').toBeGreaterThan(0);
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('An Explorer asks for only stories: the first three questions are picture stories labelled Story time, with big buttons', async ({ page }) => {
    await open(page, '#/mix/1');
    await expect(onlyChoice(page, true)).toHaveText('Only stories');
    await onlyChoice(page, true).click();
    await expect(page).toHaveURL(atRoute('#/mix/1/words'));
    for (let i = 1; i <= 3; i++) {
      await expect(label(page), `question ${i}`).toHaveText('Story time');
      await expect(box(page).locator('.mq-viz'), `question ${i}: a picture`).toBeVisible();
      await expect(box(page).locator('.pr-choice').first(), `question ${i}: big buttons`).toBeVisible();
      await expect(box(page).locator('.ans-in')).toHaveCount(0);
      if (i < 3) await skip(page);
    }
  });
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });
  test('A level with no Word problem: Grade 11 offers no Only Word problems choice (Grade 8 does)', async ({ page }) => {
    await open(page, '#/mix/8');
    await expect(onlyChoice(page, true)).toBeVisible(); // the stories have loaded, and Grade 8 has some
    await page.goto(`${APP}#/mix/11`);
    await expect(box(page).locator('#prQ')).toBeVisible();
    await expect(page.locator('#mixOnly')).toBeHidden();
    await expect(page.locator('#mixOnly [data-only]')).toHaveCount(0);
    // Its own Only page opens the mix
    await page.goto(`${APP}#/mix/11/words`);
    await expect(page).toHaveURL(atRoute('#/mix/11'));
    await expect(label(page)).toHaveCount(0);
  });
});
