import { test, expect } from '../fixtures';
import AxeBuilder from '@axe-core/playwright';

/* landing-pages, as changed by openspec change landing-interactive-hero: Requirement "The landing page leads with the
   Sutras and the method" (scenarios Step by step, Back and Start again, Keyboard and screen reader, No motion by
   itself, Counted once, JavaScript off), "Three Sutras one tap from their Deep dives" (scenario Plain-English name
   first) and "Bolt and Math Lens on the landing page" (scenario Inside the game): one test per scenario. Analytics is
   stubbed so the event can be checked and nothing counts. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path + ' ' + title); };`;
type Page = import('@playwright/test').Page;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);
const STEPS = ['98 is 2 below 100, and 97 is 3 below.', '98 − 3 = 95, and 2 × 3 = 06.', 'So the answer is 9506.'];
/* The steps a sighted visitor can see: visibility hides later ones */
const shown = (page: Page) => page.locator('#lv-demo .lv-steps li').evaluateAll(els => els.filter(e => getComputedStyle(e).visibility === 'visible').map(e => e.textContent));
const running = (page: Page) => page.locator('#lv-demo').evaluate(el => el.getAnimations({ subtree: true }).length);

test.use({ seedMode: null });
test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test('Step by step: Next twice adds one step at a time, says the step, and the card and the page below it never move', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('#lv-demo'), at = card.locator('.lv-demo-at'), next = card.getByRole('button', { name: 'Next' });
  await expect(card).toHaveAttribute('data-step', '1');
  await expect(at).toHaveText('Step 1 of 3');
  expect(await shown(page)).toEqual(STEPS.slice(0, 1));
  /* Positions on the page, not in the viewport (a click may scroll) */
  const box = () => page.evaluate(() => [document.getElementById('lv-demo')!, document.querySelector('.lv-sutra-cards')!, document.getElementById('lv-modes-h')!].map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y + scrollY, r.width, r.height]; }));
  const before = await box();
  for (const n of [2, 3]) {
    await card.locator('.lv-demo-next').click();
    await expect(at).toContainText(`Step ${n} of 3`);
    expect(await shown(page)).toEqual(STEPS.slice(0, n));
    expect(await box()).toEqual(before);
  }
  await expect(card.locator('.lv-demo-next')).toHaveText('Start again');
  await expect(next).toHaveCount(0);
});

test('Back and Start again: Step 3, Back to 2, Next to 3, Start again to 1, and Back does nothing on Step 1', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('#lv-demo'), next = card.locator('.lv-demo-next'), back = card.getByRole('button', { name: 'Back' });
  await expect(back).toHaveAttribute('aria-disabled', 'true');
  await back.click({ force: true }); /* aria-disabled: Playwright waits for an enabled control, a visitor's press just does nothing */
  await expect(card).toHaveAttribute('data-step', '1');
  await next.click(); await next.click();
  await expect(card).toHaveAttribute('data-step', '3');
  await expect(back).toHaveAttribute('aria-disabled', 'false');
  await back.click();
  await expect(card).toHaveAttribute('data-step', '2');
  await next.click();
  await expect(card).toHaveAttribute('data-step', '3');
  await card.getByRole('button', { name: 'Start again' }).click();
  await expect(card).toHaveAttribute('data-step', '1');
  await expect(card.locator('.lv-demo-at')).toContainText('Step 1 of 3');
  await expect(back).toHaveAttribute('aria-disabled', 'true');
});

test('Keyboard and screen reader: Enter, then Space on Next; focus stays; the current step is marked; the polite line says the step', async ({ page }, info) => {
  test.skip(!!info.project.use.hasTouch, 'keyboard');
  await page.goto('/');
  const card = page.locator('#lv-demo'), next = card.locator('.lv-demo-next'), at = card.locator('.lv-demo-at');
  await expect(at).toHaveAttribute('aria-live', 'polite');
  await expect(card.locator('.lv-board')).toHaveAttribute('aria-hidden', 'true');
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(card).toHaveAttribute('data-step', '2');
  await expect(next).toBeFocused();
  await page.keyboard.press('Space');
  await expect(card).toHaveAttribute('data-step', '3');
  await expect(next).toBeFocused();
  await expect(card.locator('.lv-steps li[aria-current="step"]')).toHaveText(STEPS[2]);
  await expect(card.locator('.lv-steps li[aria-current]')).toHaveCount(1);
  await expect(at).toHaveText('Step 3 of 3: So the answer is 9506.');
  await expect(at.locator('.md-sr-only')).toHaveText(': So the answer is 9506.');
});

for (const [what, key] of [['reduced motion', null], ['Pause motion', 'motion-paused'], ['Calm', 'vm.calm']] as const) {
  test.describe(`No motion by itself, ${what}`, () => {
    test.use({ reducedMotion: key ? 'no-preference' : 'reduce' });
    test(`with ${what}, no animation runs in the card before or after a press`, async ({ page }) => {
      if (key) await page.addInitScript(k => { try { localStorage.setItem(k, '1'); } catch (e) { /* storage blocked */ } }, key);
      await page.goto('/');
      await expect(page.locator('#lv-demo')).toHaveAttribute('data-step', '1');
      expect(await running(page)).toBe(0);
      await page.locator('#lv-demo .lv-demo-next').click();
      await expect(page.locator('#lv-demo')).toHaveAttribute('data-step', '2');
      expect(await running(page)).toBe(0);
    });
  });
}

test.describe('No motion by itself, motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('nothing animates in the card until a press', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#lv-demo')).toHaveAttribute('data-step', '1');
    await page.waitForTimeout(400);
    expect(await running(page)).toBe(0);
  });
});

test('Counted once: Step 3, Start again, Step 3 again sends one math/landing/demo/done, and nothing is stored', async ({ page }) => {
  await page.goto('/');
  const stored = () => page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  const before = await stored();
  const next = page.locator('#lv-demo .lv-demo-next');
  for (let i = 0; i < 5; i++) await next.click();
  await expect(page.locator('#lv-demo')).toHaveAttribute('data-step', '3');
  expect((await events(page)).filter(e => e.startsWith('math/landing/'))).toEqual(['math/landing/demo/done Vedic Math: landing demo finished']);
  expect(await stored()).toBe(before);
});

test.describe('JavaScript off', () => {
  test.use({ javaScriptEnabled: false });
  test('JavaScript off: the sutra way shows all three steps ending in 9506, and no Back or Next', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('#lv-demo');
    await expect(card.locator('.lv-steps li')).toHaveText(STEPS);
    for (const li of await card.locator('.lv-steps li').all()) await expect(li).toBeVisible();
    await expect(card.locator('.lv-board')).toContainText('9506');
    await expect(card.getByRole('button')).toHaveCount(0);
  });
});

test('Plain-English name first: each Sutra card leads with its Trick, with the Sanskrit name directly under it', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('.lv-sutras a.lv-sutra');
  await expect(cards.locator('.lv-trick')).toHaveText(['Square numbers ending in 5', 'Subtract from 100, 1000, 10000', 'Multiply any two numbers in one line']);
  for (const c of await cards.all()) {
    const [first, second] = await c.evaluate(el => [...el.children].slice(0, 2).map(e => e.className || e.tagName));
    expect([first, second]).toEqual(['lv-trick', 'B']);
    const t = (await c.locator('.lv-trick').boundingBox())!, s = (await c.locator('b[lang="sa-Latn"]').boundingBox())!;
    expect(s.y).toBeGreaterThanOrEqual(t.y + t.height - 1);
  }
  const cap = page.locator('#lv-demo figcaption');
  await expect(cap.locator('.lv-trick')).toHaveText('Multiply numbers near 10, 100 or 1000');
  await expect(cap.locator('.lv-sa[lang="sa-Latn"]')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
});

for (const scheme of ['light', 'dark'] as const) {
  for (const width of [320, 1280]) {
    test(`Inside the game: Bolt and Math Lens with one line each at ${width} px in ${scheme === 'light' ? 'Daybreak' : 'Deep Space'}, no sideways scroll, axe finds nothing serious`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      const sec = page.locator('section.lv-inside');
      await expect(sec.locator('h2')).toHaveText('Inside the game');
      await expect(sec.locator('h3')).toHaveText(['Bolt', 'Math Lens']);
      await expect(sec.locator('.lv-feat p')).toHaveText([
        'Our robot teacher shows you each trick, and when an answer goes wrong, works it step by step on your own numbers.',
        'Point the camera at a number plate, a clock or a receipt and play puzzles made from its digits; the pictures never leave your device.'
      ]);
      for (const art of await sec.locator('.lv-feat-art').all()) { await expect(art).toBeVisible(); await expect(art).toHaveAttribute('aria-hidden', 'true'); }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const r = await new AxeBuilder({ page }).include('section.lv-inside').include('section.lv-sutras').analyze();
      expect(r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id)).toEqual([]);
    });
  }
}
