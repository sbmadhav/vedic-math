import { test, expect, APP, open, cloudLog } from '../fixtures';

/* accessibility spec, "Answers are announced". Times sprint is fully asserted in wcag.spec.ts:46.
   This adds a stricter Arena Practice check: every tap gives exactly one status message whose N and S
   match the scoring (10 + 2 per combo step, capped) and the shown score, or names the real answer.
   The round is left early, so nothing is posted. */

test.describe('Arena Practice answers are announced (Explorer)', () => {
  test.use({ seedMode: 'explorer' });

  test('each tap gives one exact status message and the pop stays hidden', async ({ page }) => {
    await open(page, '#/arena');
    await page.locator('[data-t="practice"]').click();
    await page.locator('#arGo').click();
    const choices = page.locator('.ar-choice'), say = page.locator('#arSay'), pop = page.locator('#arPop');
    await expect(choices.first()).toBeVisible({ timeout: 6000 });
    await expect(say).toHaveAttribute('role', 'status');
    await expect(pop).toHaveAttribute('aria-hidden', 'true');

    let score = 0, combo = 0, sawRight = false, sawWrong = false;
    for (let n = 0; n < 8 && !(sawRight && sawWrong); n++) {
      const vals = await choices.evaluateAll(bs => bs.map(b => (b as HTMLElement).dataset.v!));
      // Alternate the tapped option so both a right and a wrong answer are likely within a few taps
      const pick = vals[n % vals.length];
      await choices.nth(n % vals.length).click();
      await expect(say).not.toHaveText('');
      const text = (await say.textContent()) || '';
      if (text.startsWith('Right')) {
        combo++; const gain = 10 + Math.min(combo - 1, 10) * 2; score += gain; sawRight = true;
        expect(text).toBe(`Right, plus ${gain}. Score ${score}.`);
      } else {
        combo = 0; sawWrong = true;
        const m = text.match(/^Not quite\. It was (.+)\.$/);
        expect(m, `unexpected status "${text}"`).not.toBeNull();
        expect(vals).toContain(m![1]);
        expect(m![1]).not.toBe(pick);
      }
      await expect(page.locator('#arScore')).toHaveText(String(score));
      // The pop is visual only: hidden from assistive technology, never the status
      await expect(pop).toHaveAttribute('aria-hidden', 'true');
      expect(await say.evaluate(el => el.childNodes.length)).toBeLessThanOrEqual(1);
    }
    expect(sawRight || sawWrong).toBe(true);
    await page.goto(`${APP}#/`);
    expect((await cloudLog(page)).writes).toEqual([]);
  });
});
