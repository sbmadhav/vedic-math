import { test, expect, open, heldClock, typeAnswer, hrefTo } from '../fixtures';

/* medals spec, "Game Levels and tower challenges earn Medals":
   - Two goals reached: finishing game Level 12 past the second goal but not the third earns a silver Medal.
   - A worse result later: a tower challenge with gold, played again reaching only the first goal, still shows gold. */

const blank = { v: 3, skills: {}, sparks: 0, days: {}, best: {}, last: null, grade: null, badges: {}, counts: {}, seen: {}, katasDone: {}, ratings: {}, weekSparks: {}, questDay: null };
const num = (t: string | null) => Number((t || '').replace(/[,\s]/g, '').replace('−', '-'));

test.describe('Two goals reached', () => {
  // Level 11 has a Medal, so Level 12 is open whatever the Player's skill
  test.use({ seedProgress: { ...blank, medals: { 'g:times-sprint:11': 1 } } });

  test('finishing game Level 12 past the second goal but not the third earns a silver Medal', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/game/times-sprint/12');
    const shell = page.locator('#gShell');
    await expect(shell.locator('.lv-best .medal')).toHaveAttribute('aria-label', 'No Medal yet');
    const goalsLine = (await shell.locator('.lv-best').first().textContent())!;
    const m = goalsLine.match(/Bronze ([\d,]+) · Silver ([\d,]+) · Gold ([\d,]+) points/);
    expect(m, goalsLine).not.toBeNull();
    const [bronze, silver, gold] = m!.slice(1).map(num);

    await page.locator('#gStart').click();
    const area = page.locator('#gArea'), q = area.locator('.g-q'), inp = area.locator('.ans-in'), pts = page.locator('#gPts');
    // Right answers until the score is past the second goal
    let score = 0;
    for (let guard = 0; score < silver && guard < 40; guard++) {
      const before = await q.textContent();
      const [x, y] = before!.split('×').map(num);
      await inp.fill(String(x * y));
      await inp.press('Enter');
      await expect(pts).not.toHaveText(String(score.toLocaleString('en-US')));
      score = num(await pts.textContent());
    }
    expect(score).toBeGreaterThanOrEqual(silver);
    expect(score, 'test setup: the score must stay short of the third goal').toBeLessThan(gold);
    expect(score).toBeGreaterThan(bronze);

    // Let the 60 second round run out (jump the clock: running every animation frame of a minute is slow)
    await page.clock.fastForward(61_000);
    await page.clock.runFor(100);
    const result = page.locator('.play-shell .lv-result');
    await expect(result.locator('h2')).toHaveText('Silver Medal');
    await expect(result.locator('.lv-big .medal')).toHaveAttribute('aria-label', 'Silver Medal');
    await expect(result.locator('.lv-big .medal')).toHaveClass(/medal--silver/);
    await expect(result).toContainText(`${score.toLocaleString('en-US')} points.`);
    await expect(page.locator('#view')).not.toContainText('★');

    // Kept for that Level: the saved record, the Level's lobby and the game's map
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!));
    expect(saved.medals['g:times-sprint:12']).toBe(2);
    await open(page, '#/game/times-sprint');
    const node = page.locator(`a.lv-node${hrefTo('#/game/times-sprint/12')}`);
    await expect(node).toHaveAttribute('aria-label', 'Level 12, silver Medal');
    await expect(node.locator('.medal')).toHaveClass(/medal--silver/);
    await open(page, '#/game/times-sprint/12');
    await expect(page.locator('#gShell .lv-best .medal')).toHaveAttribute('aria-label', 'Silver Medal');
  });
});

test.describe('A worse result later', () => {
  // Challenge 2 (Sharpshooter: 10 questions, goals 6, 9 and 10 right) already has gold
  test.use({ seedProgress: { ...blank, medals: { 'a:1': 1, 'a:2': 3 } } });

  test('a gold tower challenge played again reaching only the first goal still shows gold', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/challenge/2');
    await expect(page.locator('#chShell .lv-best .medal')).toHaveAttribute('aria-label', 'Gold Medal');
    const lede = (await page.locator('.md-lede').textContent())!;
    const m = lede.match(/Medals: Bronze (\d+) · Silver (\d+) · Gold (\d+) right answers/);
    expect(m, lede).not.toBeNull();
    const [bronze, silver] = m!.slice(1).map(Number);

    // The questions are seeded per challenge, so the page can build the same set the round uses
    const set: { kind: string; answer: number | string }[] = await page.evaluate(async () => {
      const LV = await e2eMod('levels');
      return LV.challengeSet(LV.challenge(2)).map((p: any) => ({ kind: p.kind, answer: p.answer }));
    });

    await page.locator('#chGo').click();
    await page.clock.runFor(2000); // the 3, 2, 1 countdown
    const qEl = page.locator('#arQ'), counter = page.locator('#arTime');
    await expect(qEl).not.toBeEmpty();
    const answer = async (i: number, right: boolean) => {
      const p = set[i];
      if (p.kind === 'choice') {
        const choices = page.locator('.ar-choice');
        const vals = await choices.evaluateAll(bs => bs.map(b => (b as HTMLElement).dataset.v));
        const k = right ? vals.indexOf(String(p.answer)) : vals.findIndex(v => v !== String(p.answer));
        expect(k).toBeGreaterThanOrEqual(0);
        await choices.nth(k).click();
      } else {
        await typeAnswer(page, right ? String(p.answer) : '987654');
        await page.locator('#arType').press('Enter');
      }
    };
    // Only the first goal: exactly `bronze` right, the rest missed
    for (let i = 0; i < 10; i++) {
      await answer(i, i < bronze);
      if (i < 9) await expect(counter).toHaveText(`${i + 2}/10`);
    }
    expect(bronze).toBeLessThan(silver);

    const result = page.locator('.play-shell .lv-result');
    await expect(result.locator('h2')).toHaveText('Bronze Medal');
    await expect(result).toContainText(`${bronze} right, ${10 - bronze} missed.`);
    await expect(result).not.toContainText('New best');

    // The challenge still shows gold: saved, on its page and on the chapter map
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!));
    expect(saved.medals['a:2']).toBe(3);
    await result.locator('[data-retry]').click();
    await expect(page.locator('#chShell .lv-best .medal')).toHaveAttribute('aria-label', 'Gold Medal');
    await open(page, '#/tower/1');
    const node = page.locator(`a.lv-node${hrefTo('#/challenge/2')}`);
    await expect(node).toHaveAttribute('aria-label', 'Level 2, gold Medal');
    await expect(node.locator('.medal')).toHaveClass(/medal--gold/);
    await expect(page.locator('#view')).not.toContainText('★');
  });
});
