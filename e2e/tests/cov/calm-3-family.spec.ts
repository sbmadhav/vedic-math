import { test, expect, open } from '../fixtures';
import { SKILL, ON, visit, btn, missTwice, turns } from '../family-kit';

/* calm spec, delta of change family-helpers, Requirement "The Family helpers hold still", Scenario "A visit in Calm":
   with motion allowed on the device but Calm on, a friend appears in place with no animation, and the same buttons. */
test.use({ seedPlayer: ON, reducedMotion: 'no-preference' });

test('A visit in Calm: the friend appears still, with the same words and buttons', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('vm.calm', '1'); } catch (e) { /* blocked */ } });
  await open(page, SKILL);
  await missTwice(page);
  await expect(visit(page)).toHaveClass(/fh-still/);
  await page.waitForTimeout(400); /* past the short fade */
  const moving = await page.evaluate(() => document.querySelector('.fh-visit')!.getAnimations({ subtree: true }).filter(a => a.playState === 'running').map(a => (a as CSSAnimation).animationName));
  expect(moving).toEqual([]);
  const crew = await page.locator('.fh-visit .fh-body').first().evaluate(e => getComputedStyle(e).animationName);
  expect(crew).toBe('none');
  await turns(page);
  for (const name of ['Show me', 'Another hint', 'Not now']) await expect(btn(page, name)).toBeVisible();
});
