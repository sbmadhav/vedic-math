import { test, expect, APP, open, openExplore, cloudLog } from './fixtures';
import type { Page } from '@playwright/test';

/* WCAG 2.1 AA checks axe cannot make: focus order after an answer (2.4.3), status messages (4.1.3),
   Pause motion (2.2.2), reflow at 320px (1.4.10) and text spacing (1.4.12). Every round here is
   Endless practice or an Arena Practice round left early, so nothing is ever posted. */

const SPACING = '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}';
const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const focusInGame = (page: Page) => page.evaluate(() => !!document.activeElement?.closest('#gArea'));

/** Starts Endless practice from the keyboard, so focus is on the Start button when the round begins. */
async function startByKeyboard(page: Page, id: string) {
  await open(page, `#/game/${id}`);
  await page.locator('#gShell [data-m="endless"]').click();
  await page.locator('#gStart').focus();
  await page.keyboard.press('Enter');
}

test.describe('focus stays in the game after an answer (2.4.3)', () => {
  for (const id of ['more-less', 'bonds', 'sequence', 'make-ten', 'quick-look', 'balance', 'check-it', 'frac-faceoff']) {
    test(id, async ({ page }) => {
      await startByKeyboard(page, id);
      await expect.poll(() => focusInGame(page)).toBe(true);
      for (let i = 0; i < 2; i++) {
        await page.keyboard.press('Enter');
        // A miss holds the question for 1.2 s with the options disabled; focus comes back with the next question
        await expect.poll(() => focusInGame(page), { timeout: 5000 }).toBe(true);
      }
      expect((await cloudLog(page)).writes).toEqual([]);
    });
  }

  test('a mouse click outside the game is left alone', async ({ page }) => {
    await open(page, '#/game/more-less');
    await page.locator('#gShell [data-m="endless"]').click();
    await page.locator('#gStart').click();
    await page.locator('#view h1').click();
    await page.locator('.g-more').first().dispatchEvent('click');
    await page.waitForTimeout(900);
    expect(await focusInGame(page)).toBe(false);
  });
});

test.describe('status messages (4.1.3)', () => {
  test('Times sprint announces a right answer in the status line', async ({ page }) => {
    await open(page, '#/game/times-sprint');
    await page.locator('#gShell [data-m="endless"]').click();
    await page.locator('#gStart').click();
    const q = page.locator('#gArea .g-q'), inp = page.locator('#gArea .ans-in');
    const [x, y] = ((await q.textContent()) || '').replace(/,/g, '').split('×').map(s => Number(s.trim()));
    await inp.fill(String(x * y));
    await inp.press('Enter');
    await expect(page.locator('#gSay')).toHaveAttribute('role', 'status');
    await expect(page.locator('#gSay')).toHaveText('Right! 1 so far.');
    await expect(page.locator('#gArea .g-tip')).toHaveText('');
  });

  test.describe('explorer', () => {
    test.use({ seedMode: 'explorer' });
    test('Arena answers are announced once through a polite status, while the pop stays hidden', async ({ page }) => {
      await open(page, '#/arena');
      await page.locator('[data-t="practice"]').click();
      await page.locator('#arGo').click();
      const choices = page.locator('.ar-choice');
      await expect(choices.first()).toBeVisible({ timeout: 6000 });
      await choices.first().click();
      const say = page.locator('#arSay');
      await expect(say).toHaveAttribute('role', 'status');
      await expect(say).toHaveText(/^Right, plus \d+\. Score \d+\.$|^Not quite\. It was .+\.$/);
      await expect(page.locator('#arPop')).toHaveAttribute('aria-hidden', 'true');
      await page.goto(`${APP}#/`);
      expect((await cloudLog(page)).writes).toEqual([]);
    });
  });
});

test.describe('Pause motion (2.2.2)', () => {
  test.use({ reducedMotion: 'no-preference' });

  const bgMoving = (page: Page) => page.evaluate(async () => {
    const c = document.querySelector('canvas.vm-bg') as HTMLCanvasElement | null;
    if (!c) return false;
    const a = c.toDataURL(); await new Promise(r => setTimeout(r, 400)); return a !== c.toDataURL();
  });
  const looping = (page: Page) => page.evaluate(() => document.getAnimations()
    .filter(a => a.playState === 'running' && a.effect!.getTiming().iterations === Infinity).length);

  test('the Explore menu switch stops the moving background and CSS loops, live and after a reload', async ({ page }) => {
    await open(page, '#/');
    await expect.poll(() => bgMoving(page), { timeout: 15_000 }).toBe(true);
    const dlg = await openExplore(page);
    await dlg.locator('#xpMotion').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).toHaveClass(/motion-paused/);
    await expect.poll(() => bgMoving(page)).toBe(false);
    expect(await looping(page)).toBe(0);
    await page.reload();
    await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
    await expect(page.locator('canvas.vm-bg')).toBeAttached({ timeout: 10_000 });
    expect(await bgMoving(page)).toBe(false);
    // Turning it back on restarts the background
    const dlg2 = await openExplore(page);
    await dlg2.locator('#xpMotion').click();
    await page.keyboard.press('Escape');
    await expect.poll(() => bgMoving(page)).toBe(true);
  });

  test('the Moving background switch in #/me stops it too', async ({ page }) => {
    await open(page, '#/me');
    await expect(page.locator('canvas.vm-bg')).toBeAttached({ timeout: 10_000 });
    await page.locator('#setBg').uncheck();
    await expect(page.locator('canvas.vm-bg')).toHaveCount(0);
  });
});

test.describe('reflow at 320px and text spacing (1.4.10, 1.4.12)', () => {
  for (const hash of ['#/', '#/me', '#/sutras', '#/games']) {
    test(`${hash} has no horizontal scroll at 320px, with or without text spacing`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 720 });
      await open(page, hash);
      await page.waitForTimeout(500);
      expect(await sideways(page)).toBe(0);
      await page.addStyleTag({ content: SPACING });
      expect(await sideways(page)).toBe(0);
      if (hash === '#/sutras') {
        const clipped = await page.locator('.sutra-card').evaluateAll(cs => cs.filter(c => c.scrollHeight > c.clientHeight + 2 || c.scrollWidth > c.clientWidth + 2).length);
        expect(clipped).toBe(0);
      }
    });
  }
});

test('the symbol keys in Practice are a labelled group', async ({ page }) => {
  await open(page, '#/skill/v-sq5');
  const keys = page.getByRole('group', { name: 'Symbol keys' });
  await expect(keys.first()).toBeVisible();
  for (const k of await page.locator('.pr-keys').all()) await expect(k).toHaveAttribute('role', 'group');
});
