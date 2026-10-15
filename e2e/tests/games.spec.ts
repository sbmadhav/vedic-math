import { test, expect, open, chromiumOnly, cloudLog, heldClock, type Mode } from './fixtures';
import type { Page, Locator } from '@playwright/test';

/* Every game launches (Endless practice, so no round ends and nothing is posted) and accepts an answer.
   The step for each game plays one move and checks the feedback that proves it was scored. */

type Step = (area: Locator, page: Page) => Promise<void>;
const say = (page: Page) => page.locator('#gSay');
/* A right answer moves on at once with the explanation line cleared, so it shows as points; a miss shows its explanation */
const scoredOr = async (p: Page, line: Locator, miss: RegExp) =>
  expect.poll(async () => miss.test((await line.textContent()) || '') || /^[1-9]/.test((await p.locator('#gPts').textContent()) || '')).toBe(true);
const GAMES: Record<string, { mode?: Mode; step: Step }> = {
  balloons: { mode: 'explorer', step: async (a, p) => {
    await a.locator('.g-balloon').first().click();
    await a.getByRole('button', { name: 'Done' }).click();
    await expect(say(p)).toHaveText(/Yes!|You popped 1\./);
  } },
  'more-less': { step: async (a, p) => { await a.locator('.g-more').first().click(); await expect(say(p)).toHaveText(/bigger/); } },
  'make-ten': { step: async (a, p) => {
    await a.locator('.g-tile').nth(0).click();
    await a.locator('.g-tile').nth(1).click();
    await expect(say(p)).toHaveText(/=/);
  } },
  'quick-look': { step: async (a, p) => { await a.locator('.g-opts .md-chip').first().click(); await expect(say(p)).toHaveText(/Yes, \d+!|It was \d+\./); } },
  bonds: { step: async (a, p) => { await a.locator('.g-opts .md-chip').first().click(); await scoredOr(p, say(p), /\+.*=.*so the part is/); } },
  'times-sprint': { step: async (a, p) => {
    const q = (await a.locator('.g-q').textContent())!.replace(/,/g, '');
    const [x, y] = q.split('×').map(s => Number(s.trim()));
    await a.locator('.ans-in').fill(String(x * y));
    await a.locator('.ans-in').press('Enter');
    await expect(p.locator('#gPts')).toHaveText(/^[1-9]/);
  } },
  target: { step: async a => {
    await a.locator('.ans-in').fill('1 + 1');
    await a.locator('.ans-in').press('Enter');
    await expect(a.locator('.g-tip')).toContainText(/Use each of|That makes/);
    await a.getByRole('button', { name: /Show an answer/ }).click();
    await expect(a.locator('.g-tip')).toHaveText(/One answer:/);
  } },
  'frac-faceoff': { step: async (a, p) => { await a.locator('.g-frac').first().click(); await expect(say(p)).toHaveText(/Right!|The other one was bigger/); } },
  'line-snipe': { step: async (a, p) => {
    await a.locator('input[type="range"]').fill('300');
    await a.getByRole('button', { name: 'Place it' }).click();
    await expect(say(p)).toHaveText(/% away/);
  } },
  pairs: { step: async a => {
    const cards = a.locator('.g-card');
    await cards.nth(0).click();
    await expect(cards.nth(0)).toHaveClass(/\bup\b/);
    await expect(cards.nth(0)).not.toHaveAttribute('aria-label', 'Hidden card');
    await cards.nth(1).click();
    await expect(cards.nth(1)).toHaveClass(/\b(up|got)\b/);
  } },
  'check-it': { step: async (a, p) => { await a.getByRole('button', { name: 'Right', exact: true }).click(); await scoredOr(p, a.locator('.g-tip'), /Digit sums:.*It was (right|wrong)\./); } },
  rain: { step: async (a, p) => {
    const drop = a.locator('.g-drop').first();
    await expect(drop).toBeAttached({ timeout: 5000 });
    await drop.dispatchEvent('click'); // drops keep falling, so they never become "stable" for a normal click
    await expect(say(p)).toHaveText(/multiple of|=/);
  } },
  sequence: { step: async a => { await a.locator('.g-opts .md-chip').first().click(); await expect(a.locator('.g-tip')).toHaveText(/^-?[\d,]+: /); } },
  balance: { step: async (a, p) => { await a.locator('.g-opts .md-chip').first().click(); await scoredOr(p, a.locator('.g-tip'), /^x = /); } },
};

test('the games page lists all 14 games with a leaderboard each', async ({ page }) => {
  await open(page, '#/games');
  const ids = await page.locator('a.mq-game').evaluateAll(as => as.map(a => a.getAttribute('href')!.replace('#/game/', '')));
  expect(ids.sort()).toEqual(Object.keys(GAMES).sort());
});

for (const [id, g] of Object.entries(GAMES)) {
  test.describe(`game ${id}`, () => {
    test.use({ seedMode: g.mode || 'challenger' });

    test(`${id} launches and accepts an answer`, async ({ page }, testInfo) => {
      chromiumOnly(testInfo);
      await open(page, `#/game/${id}`);
      await page.locator('#gShell [data-m="endless"]').click();
      await expect(page.locator('#gStart')).toHaveText(/Practice/);
      await page.locator('#gStart').click();
      // Park the mouse: a tile drawn under the pointer would bob on :hover (translateY) and never be "stable"
      await page.mouse.move(0, 0);
      const area = page.locator('#gArea');
      await expect(area).not.toBeEmpty();
      await g.step(area, page);
      // Endless practice never posts a score
      await page.locator('#gQuit').click();
      await expect(page.locator('.g-result .md-kicker')).toHaveText('Practice score');
      expect((await cloudLog(page)).writes.filter(w => w.path.startsWith('boards/g_'))).toEqual([]);
    });
  });
}

test('a ranked round shows the game leaderboards and starts the clock', async ({ page }) => {
  await open(page, '#/game/times-sprint');
  await expect(page.locator('#gbDay .lb-tabs [data-src="world"]')).toBeVisible();
  await expect(page.locator('#gShell [data-m="ranked"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#gStart').click();
  await expect(page.locator('#gArea .g-timer')).toBeAttached();
  await expect(page.locator('#gArea .g-q')).toContainText('×');
  // Stop before the round ends: nothing is posted
  await page.locator('#gQuit').click();
  await expect(page.locator('#gStart')).toBeVisible();
  expect((await cloudLog(page)).writes).toEqual([]);
});

/* view-lifecycle spec: an explanation stays with its question. page.clock drives the 1.2 second hold. */
const num = (t: string | null) => Number((t || '').replace(/,/g, '').replace('−', '-'));

test('Number bonds: a miss holds the question and its explanation for 1.2 s and ignores taps', async ({ page }) => {
  await heldClock(page);
  await open(page, '#/game/bonds');
  await page.locator('#gShell [data-m="endless"]').click();
  await page.locator('#gStart').click();
  const area = page.locator('#gArea'), whole = area.locator('.bond-w'), part = area.locator('.bond-a');
  const W = await whole.textContent(), A = await part.textContent(), b = Math.round((num(W) - num(A)) * 100) / 100;
  const chips = area.locator('.g-opts .md-chip'), values = (await chips.allTextContents()).map(num);
  await chips.nth(values.findIndex(v => v !== b)).click();
  await expect(say(page)).toContainText('so the part is');
  const pts = await page.locator('#gPts').textContent();
  // A tap on the right part during the hold counts for nothing
  await chips.nth(values.indexOf(b)).dispatchEvent('click');
  await page.clock.runFor(1100);
  await expect(whole).toHaveText(W!);
  await expect(part).toHaveText(A!);
  await expect(say(page)).toContainText(`so the part is`);
  await expect(page.locator('#gPts')).toHaveText(pts!);
  await page.clock.runFor(200);
  await expect(say(page)).toHaveText('');
  await expect.poll(async () => `${await whole.textContent()}|${await part.textContent()}`).not.toBe(`${W}|${A}`);
});

test('Times sprint: after a right answer the next question has no explanation under it', async ({ page }) => {
  await heldClock(page);
  await open(page, '#/game/times-sprint');
  await page.locator('#gShell [data-m="endless"]').click();
  await page.locator('#gStart').click();
  const area = page.locator('#gArea'), q = area.locator('.g-q'), tip = area.locator('.g-tip'), inp = area.locator('.ans-in');
  const product = async () => { const [x, y] = ((await q.textContent()) || '').replace(/,/g, '').split('×').map(s => Number(s.trim())); return x * y; };
  // A miss first, so there is an explanation to clear
  const q1 = await q.textContent();
  await inp.fill(String((await product()) + 1));
  await inp.press('Enter');
  await expect(tip).toContainText(`= `);
  await expect(q).toHaveText(q1!);
  await page.clock.runFor(1300);
  await expect(tip).toHaveText('');
  const q2 = await q.textContent();
  expect(q2).not.toBe(q1);
  await inp.fill(String(await product()));
  await inp.press('Enter');
  await expect(q).not.toHaveText(q2!);
  await expect(tip).toHaveText('');
});

test.describe('balloon pop, stop and start', () => {
  test.use({ seedMode: 'explorer' });
  test('stopping during the wait and starting again shows only the new round', async ({ page }) => {
    // Every read-aloud starts by cancelling speech, so counting cancels shows whether a stale question is read
    await page.addInitScript(() => {
      (window as any).__cancels = 0;
      if ('speechSynthesis' in window) { const c = speechSynthesis.cancel.bind(speechSynthesis); speechSynthesis.cancel = () => { (window as any).__cancels++; c(); }; }
    });
    await heldClock(page);
    await open(page, '#/game/balloons');
    await expect(page.locator('#gShell [data-m="ranked"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#gStart').click();
    const area = page.locator('#gArea');
    await area.locator('.g-balloon').first().click();
    await area.getByRole('button', { name: 'Done' }).click();
    await expect(say(page)).toHaveText(/Yes!|You popped 1\./);
    // Stop inside the 0.9 s wait, then start a new round
    await page.locator('#gQuit').click();
    await page.locator('#gStart').click();
    await expect(page.locator('#gPts')).toHaveText('0');
    const ask = await area.locator('.g-q').textContent(), cancels = await page.evaluate(() => (window as any).__cancels);
    await page.clock.runFor(1500);
    await expect(area.locator('.g-q')).toHaveText(ask!);
    expect(await page.evaluate(() => (window as any).__cancels)).toBe(cancels);
    await expect(page.locator('#gPts')).toHaveText('0');
    await expect(say(page)).toHaveText('');
    await expect(area.locator('.g-sky.g-ok, .g-sky.g-no')).toHaveCount(0);
    expect((await cloudLog(page)).writes).toEqual([]);
  });
});

/* Game prompts inside the game card render at the game prompt size in the main ink color (page-layout spec),
   not at the design system's 15px muted card paragraph. */
const PROMPTS = [
  { id: 'balloons', mode: 'explorer' as Mode, sel: '#gArea .g-q', min: 24 },
  { id: 'make-ten', mode: 'explorer' as Mode, sel: '#gArea .g-say', min: 15.5 },
  { id: 'rain', mode: 'explorer' as Mode, sel: '#gArea .g-say', min: 15.5 },
];
for (const p of PROMPTS) {
  test.describe(`prompt in ${p.id}`, () => {
    test.use({ seedMode: p.mode });
    for (const scheme of ['light', 'dark'] as const) {
      test(`${p.id}: the prompt is large and in ink (${scheme})`, async ({ page }, testInfo) => {
        chromiumOnly(testInfo);
        await page.emulateMedia({ colorScheme: scheme });
        await open(page, `#/game/${p.id}`);
        await page.locator('#gShell [data-m="endless"]').click();
        await page.locator('#gStart').click();
        const el = page.locator(p.sel).first();
        await expect(el).toBeVisible();
        await expect(el).not.toBeEmpty();
        const st = await el.evaluate(e => {
          const probe = document.createElement('span'); probe.style.color = 'var(--ink)'; e.parentElement!.append(probe);
          const ink = getComputedStyle(probe).color; probe.remove();
          const cs = getComputedStyle(e);
          return { size: parseFloat(cs.fontSize), color: cs.color, ink };
        });
        expect(st.size).toBeGreaterThanOrEqual(p.min);
        expect(st.color).toBe(st.ink);
        await page.locator('#gQuit').click();
      });
    }
  });
}
