import { test, expect, APP, open } from '../fixtures';

/* celebrations spec, Requirements "Big confetti only for true wins", "Small animations for everyday moments", "Small
   animations stay cheap" and "Celebrations hold still under no motion" (openspec change celebrations): one test per
   scenario. */
type Page = import('@playwright/test').Page;

/* Counts every confetti canvas and sparkle layer the page adds, however short-lived, and names the target of every Web
   Animation started (the pop on a Mode card, the family's cheer) */
async function watchFx(page: Page) {
  await page.addInitScript(() => {
    const seen = ((globalThis as any).__fx = { confetti: 0, sparkles: 0, animated: [] as string[] });
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
      const c = (n as Element).classList; if (!c) return;
      if (c.contains('fx-confetti')) seen.confetti++;
      if (c.contains('fx-sparkles')) seen.sparkles++;
    }))).observe(document, { childList: true, subtree: true });
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, ...args: Parameters<Element['animate']>) {
      seen.animated.push(this.getAttribute('class') || this.tagName);
      return animate.apply(this, args);
    };
  });
}
const fx = (page: Page): Promise<{ confetti: number; sparkles: number; animated: string[] }> => page.evaluate(() => (globalThis as any).__fx);

/* Square numbers ending in 5: every question is n² */
const sq = async (page: Page) => { const n = Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>2<\/sup>/)![1]); return String(n * n); };
async function answer(page: Page, i: number) {
  await expect(page.locator('#stMain .star-tag')).toHaveText(`Question ${i} of 4`);
  await page.keyboard.type(await sq(page)); await page.keyboard.press('Enter');
  await expect(page.locator('#stSay')).toContainText('+10 Sparks');
}
async function lightStar(page: Page) {
  await open(page, '#/star/sq5/1');
  for (let i = 1; i <= 4; i++) await answer(page, i);
  await expect(page.locator('.star-end-h')).toHaveText('Star 1 is lit!');
}
const freshVisit = async (page: Page, mode: 'challenger' | 'pro') => {
  await page.goto(APP);
  await page.locator(`.mode-card[data-mode="${mode}"]`).click();
};

test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test.describe('a new visitor', () => {
    test.use({ seedMode: null });

    test('Picking a Mode is not a win: no big confetti is drawn, and Home opens', async ({ page }) => {
      await watchFx(page);
      await freshVisit(page, 'challenger');
      await expect(page.locator('h1.home-h')).toHaveText('Ready to get faster?');
      expect((await fx(page)).confetti).toBe(0);
    });

    test('Picking a Mode: the card pops, a few sparkles fly and the family cheers, then Challenger Home opens and the sparkles are gone', async ({ page }) => {
      await watchFx(page);
      await freshVisit(page, 'challenger');
      await expect.poll(async () => (await fx(page)).sparkles).toBeGreaterThan(0);
      const animated = (await fx(page)).animated;
      expect(animated.some(c => c.includes('mode-card'))).toBe(true); // the pop
      for (const digit of ['lv-f-one', 'lv-f-zero', 'lv-f-nine']) expect(animated.some(c => c.includes(digit))).toBe(true); // the cheer
      await expect(page.locator('h1.home-h')).toHaveText('Ready to get faster?');
      await expect(page.locator('.fx-sparkles')).toHaveCount(0);
    });
  });

  test('Lighting a Star is a win: the big confetti is drawn once with the end screen, and it removes itself when it ends', async ({ page }) => {
    await watchFx(page);
    await lightStar(page);
    await expect.poll(async () => (await fx(page)).confetti).toBe(1);
    await expect(page.locator('canvas.fx-confetti')).toHaveCount(0, { timeout: 5000 });
    expect((await fx(page)).confetti).toBe(1);
  });

  test('A right answer is not a win: a few sparkles fly and no big confetti is drawn', async ({ page }) => {
    await watchFx(page);
    await open(page, '#/star/sq5/1');
    await answer(page, 1);
    await expect.poll(async () => (await fx(page)).sparkles).toBeGreaterThan(0);
    expect((await fx(page)).confetti).toBe(0);
  });

  test('Sparks count up for sight only: the number counts up from 0 on screen, while a screen reader reads "+40 Sparks" at once', async ({ page }) => {
    /* Every text the counting digits show, in order */
    await page.addInitScript(() => {
      const shown = ((globalThis as any).__roll = [] as string[]);
      new MutationObserver(() => {
        const v = document.querySelector('.star-end .fx-roll');
        if (v && shown[shown.length - 1] !== v.textContent) shown.push(v.textContent || '');
      }).observe(document, { childList: true, subtree: true, characterData: true });
    });
    await lightStar(page);
    const sparks = page.locator('.star-end .fx-sparks');
    await expect(sparks.locator('.md-sr-only')).toHaveText('+40 Sparks'); // the final text, for screen readers, at once
    await expect(sparks.locator('.fx-roll')).toHaveAttribute('aria-hidden', 'true');
    await expect(sparks.locator('.fx-roll')).toHaveText('+40 Sparks');
    const shown: string[] = await page.evaluate(() => (globalThis as any).__roll);
    expect(shown[0]).toBe('+0 Sparks');
    expect(shown.length).toBeGreaterThan(2); // it counted through numbers on the way
    expect(shown[shown.length - 1]).toBe('+40 Sparks');
  });

  test('Nothing beside it moves: the text around "+40 Sparks" keeps its place while the number counts', async ({ page }) => {
    /* The box of the Sparks pill and the line under it, on every frame from the end screen's first frame */
    await page.addInitScript(() => {
      const boxes = ((globalThis as any).__boxes = [] as number[][]);
      const frame = () => {
        const el = document.querySelector('.star-end .fx-sparks'), next = document.querySelector('.star-end .star-end-sp + p');
        if (el && next && el.querySelector('.fx-roll')) {
          const a = el.getBoundingClientRect(), b = next.getBoundingClientRect();
          boxes.push([a.left, a.top, a.width, a.height, b.left, b.top, b.width, b.height]);
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    await lightStar(page);
    await expect(page.locator('.star-end .fx-roll')).toHaveText('+40 Sparks');
    const boxes: number[][] = await page.evaluate(() => (globalThis as any).__boxes);
    expect(boxes.length).toBeGreaterThan(2);
    for (const b of boxes) for (let k = 0; k < b.length; k++) expect(Math.abs(b[k] - boxes[0][k])).toBeLessThan(0.5);
  });

  test('Pause motion during a burst: the confetti is gone at once', async ({ page }) => {
    await watchFx(page);
    await lightStar(page);
    await expect(page.locator('canvas.fx-confetti')).toHaveCount(1);
    // What the Pause motion switch does (fx.setMotionPaused): the class on <html> and the sitemotion event
    await page.evaluate(() => { document.documentElement.classList.add('motion-paused'); document.dispatchEvent(new CustomEvent('sitemotion', { detail: { paused: true } })); });
    await expect(page.locator('canvas.fx-confetti')).toHaveCount(0, { timeout: 500 });
  });
});

const STILL = [
  ['reduced motion', { reducedMotion: 'reduce' as const }, null],
  ['Pause motion', { reducedMotion: 'no-preference' as const }, 'motion-paused'],
  ['Calm', { reducedMotion: 'no-preference' as const }, 'vm.calm'],
] as const;
for (const [name, use, key] of STILL) {
  test.describe(name, () => {
    test.use(use);
    test.beforeEach(async ({ page }) => {
      if (key) await page.addInitScript(k => { try { localStorage.setItem(k, '1'); } catch (e) { /* storage blocked */ } }, key);
      await watchFx(page);
    });

    test.describe('a new visitor', () => {
      test.use({ seedMode: null });
      test(`Picking a Mode with no motion (${name}): Pro Home opens at once, with no sparkles and no confetti`, async ({ page }) => {
        await freshVisit(page, 'pro');
        await expect(page.locator('h1.home-h')).toHaveText('Train your mental math');
        const seen = await fx(page);
        expect([seen.confetti, seen.sparkles]).toEqual([0, 0]);
      });
    });

    test(`Lighting a Star with no motion (${name}): the end screen shows "Star 1 is lit!" and its Sparks, with no confetti and no sparkles`, async ({ page }) => {
      await lightStar(page);
      await expect(page.locator('.star-end')).toContainText('+40 Sparks');
      const seen = await fx(page);
      expect([seen.confetti, seen.sparkles]).toEqual([0, 0]);
    });
  });
}
