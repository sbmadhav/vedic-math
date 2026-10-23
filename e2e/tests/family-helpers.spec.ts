import { test, expect, open, APP } from './fixtures';
import { SKILL, ON, visit, friends, say, btn, ask, missTwice, miss, nextQuestion, closeVisit, askFriend, turns, factors, overlaps } from './family-kit';

/* The Nikhilam Family helpers (openspec family-helpers): behaviors beyond the one-per-scenario coverage specs in
   e2e/tests/cov/family-*.spec.ts. Nothing here posts a Score. */

test.describe('helpers off (the default)', () => {
  test('Me offers the switch in every Mode, off, with no When they help until it is on', async ({ page }) => {
    await open(page, '#/me');
    const sw = page.locator('#familySwitch');
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await expect(sw).toContainText('Try the Nikhilam Family helpers');
    await expect(page.locator('input[name="familyHelp"]')).toHaveCount(0);
    await sw.click();
    await expect(page.locator('#familySwitch')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#familyMsg')).toHaveText('The Family helpers are on.');
    await expect(page.locator('input[name="familyHelp"]')).toHaveCount(3);
    await page.locator('#familySwitch').click();
    await expect(page.locator('#familySwitch')).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('input[name="familyHelp"]')).toHaveCount(0);
  });
  test('the helpers\' overlay module is never requested', async ({ page }) => {
    const loaded: string[] = [];
    page.on('request', r => { if (/family-(view|helpers|lines)\.js/.test(r.url())) loaded.push(r.url()); });
    await open(page, SKILL);
    await missTwice(page);
    await expect(page.locator('#practice [data-fh-ask]')).toHaveCount(0);
    // every module is precached by the worker, which the suite blocks: so a request here would be the hook loading it
    expect(loaded).toEqual([]);
  });
});

test.describe('helpers on', () => {
  test.use({ seedPlayer: ON });

  test('Off in Me hides Ask a friend and keeps them away', async ({ page }) => {
    await open(page, '#/me');
    await page.locator('input[name="familyHelp"][value="off"]').check();
    await expect(page.locator('#familyMsg')).toHaveText('They will stay away.');
    await page.goto(`${APP}${SKILL}`);
    await expect(page.locator('#practice #prQ')).toBeVisible();
    await expect(ask(page)).toHaveCount(0);
    await missTwice(page);
    await expect(visit(page)).toHaveCount(0);
  });

  test('Ask a friend twice: one friend, then two taking turns with Next; the close button closes in one tap', async ({ page }) => {
    await open(page, SKILL);
    await askFriend(page);
    await expect(friends(page)).toHaveCount(1);
    await page.locator('.fh-visit .fh-x').click();
    await expect(visit(page)).toHaveCount(0);
    await askFriend(page);
    await expect(friends(page)).toHaveCount(2);
    await expect(btn(page, 'Next')).toBeVisible();
    const t = await turns(page);
    expect(new Set(t.map(([w]) => w)).size).toBe(2);
    await expect(btn(page, 'Show me')).toBeVisible();
    await expect(btn(page, 'Another hint')).toBeVisible();
    await expect(btn(page, 'Not now')).toBeVisible();
  });

  test('a Visit stays clear of the question and the buttons on a wide screen too, and taps reach the round', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page, SKILL);
    await missTwice(page);
    await expect(visit(page)).toBeVisible();
    const v = (await visit(page).boundingBox())!;
    for (const sel of ['#prQ', '.ans-in', '#prCheck', '#prHint', '#prShow', '#prSay']) {
      const b = await page.locator(`#practice ${sel}`).boundingBox();
      if (b) expect(overlaps(v, b), sel).toBe(false);
    }
    const { a, b } = await factors(page);
    await page.locator('#practice .ans-in').fill(String(a * b));
    await page.locator('#practice #prCheck').click();
    await expect(page.locator('#practice #prSay')).toHaveClass(/\bok\b/);
  });

  test('leaving after a miss: a friend says goodbye on the next page, and it closes on the next move', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page, SKILL);
    await miss(page);
    await page.goto(`${APP}#/learn`);
    await expect(visit(page)).toBeVisible();
    await expect(visit(page)).toHaveAttribute('data-kind', 'leave');
    await expect(btn(page, 'Not now')).toBeVisible();
    await page.goto(`${APP}#/dojo`);
    await expect(visit(page)).toHaveCount(0);
  });

  test('Pause motion during a Visit stops its movement at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page, SKILL);
    await askFriend(page);
    await expect(visit(page)).not.toHaveClass(/fh-still/);
    await page.evaluate(async () => (await e2eMod('fx')).setMotionPaused(true));
    await expect(visit(page)).toHaveClass(/fh-still/);
  });

  test('in a Kata: Ask a friend opens a Visit, and Another hint shows the Kata\'s own hint', async ({ page }) => {
    await open(page, '#/kata/sq5/1');
    await expect(page.locator('#kata #kHint')).toBeVisible();
    await page.locator('#kata [data-fh-ask]').click();
    await expect(visit(page)).toBeVisible();
    await turns(page);
    await btn(page, 'Another hint').click();
    await expect(visit(page)).toHaveCount(0);
    await expect(page.locator('#kata #kSay')).toContainText('Hint:');
  });

  test('the Visit\'s Show me example is on other numbers, and Show me goes once the example is shown', async ({ page }) => {
    await open(page, SKILL);
    const { q } = await factors(page);
    await askFriend(page);
    await turns(page); /* the first Visit greets first */
    await btn(page, 'Show me').click();
    await expect(say(page).locator('.fh-steps li').first()).toBeVisible();
    await expect(say(page).locator('.fh-ex')).not.toHaveText(q);
    await expect(btn(page, 'Show me')).toHaveCount(0);
  });
});
