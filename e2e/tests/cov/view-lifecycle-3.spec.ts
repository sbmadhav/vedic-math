import { test, expect, open, heldClock, cloudLog, appErrors, APP, atRoute } from '../fixtures';

/* view-lifecycle spec, "Leaving a page stops everything it started / Leave during a game's answer hold".
   WHEN a Player misses a question in a game and leaves the page during the hold
   THEN no later question, sound or result from that game appears on the new page.

   "One tap, one action / Hint link after several questions" is already asserted by
   e2e/tests/practice.spec.ts:98 (5 questions, then one tap on "Want a hint?" writes exactly one hint). */

test.describe('leave during a game\'s answer hold', () => {
  test.beforeEach(async ({ page }) => {
    // Sound on (the fixtures turn it off), and count every tone and read-aloud the page starts
    await page.addInitScript(() => {
      try { localStorage.setItem('vm.sound', '1'); } catch (e) { /* storage blocked */ }
      const w = window as any;
      w.__tones = 0; w.__speaks = 0;
      const AC = w.AudioContext || w.webkitAudioContext;
      if (AC) {
        const make = AC.prototype.createOscillator;
        AC.prototype.createOscillator = function (this: any) { w.__tones++; return make.call(this); };
      }
      if ('speechSynthesis' in window) {
        const s = speechSynthesis.speak.bind(speechSynthesis);
        speechSynthesis.speak = (u: SpeechSynthesisUtterance) => { w.__speaks++; try { s(u); } catch (e) { /* no voice */ } };
      }
    });
    await heldClock(page);
  });

  test('Times sprint: a miss, then leaving during the 1.2 s hold, shows nothing more from the game', async ({ page, issues }) => {
    await open(page, '#/game/times-sprint');
    await expect(page.locator('#gShell [data-m="ranked"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#gStart').click();
    const area = page.locator('#gArea'), q = area.locator('.g-q'), inp = area.locator('.ans-in');
    await expect(q).toContainText('×');
    const [x, y] = ((await q.textContent()) || '').replace(/,/g, '').split('×').map(s => Number(s.trim()));
    const q1 = await q.textContent();
    // A miss: the question and its explanation are held, inputs disabled
    await inp.fill(String(x * y + 1));
    await inp.press('Enter');
    await expect(area.locator('.g-tip')).toContainText(' = ');
    await expect(q).toHaveText(q1!);
    await expect(inp).toBeDisabled();
    const tonesAtMiss = await page.evaluate(() => (window as any).__tones);
    expect(tonesAtMiss, 'the miss itself plays a sound (spy works)').toBeGreaterThan(0);

    // Leave during the hold
    await page.clock.runFor(300);
    await page.evaluate(() => { location.hash = '#/learn'; });
    await expect(page).toHaveURL(atRoute('#/learn'));
    await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
    const view = page.locator('#view');
    const before = await view.innerHTML();
    const tones = await page.evaluate(() => (window as any).__tones), speaks = await page.evaluate(() => (window as any).__speaks);

    // Past the hold, then past the end of the 60 second round
    await page.clock.runFor(1500);
    await page.clock.runFor(65_000);

    // No later question, explanation or result from the game on the new page
    await expect(page).toHaveURL(atRoute('#/learn'));
    await expect(page.locator('#gArea, #gShell, #gSay, .g-q, .g-tip, .g-timer')).toHaveCount(0);
    await expect(page.locator('.lv-result')).toHaveCount(0);
    await expect(view).not.toContainText('Times sprint');
    await expect(view).not.toContainText('×');
    expect(await view.innerHTML(), 'the new page did not change after leaving').toBe(before);
    // No sound and no read-aloud after leaving
    expect(await page.evaluate(() => (window as any).__tones)).toBe(tones);
    expect(await page.evaluate(() => (window as any).__speaks)).toBe(speaks);
    // And no Score was posted
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });
});
