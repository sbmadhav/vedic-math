import { test, expect, APP } from '../fixtures';

/* first-visit spec, Requirements "One plain lede, and the Mode cards stay" and "The app's hero says little" (as
   modified by openspec change try-trick-in-modes: no hero button, a Try a trick under each Mode card): one test per
   scenario. */
type Page = import('@playwright/test').Page;
test.use({ seedMode: null });

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const player = (page: Page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}'); return (p.list || []).find((x: any) => x.id === p.active) || p.list?.[0]; });
/* Running animations on elements inside sel */
const moving = (page: Page, sel: string) => page.evaluate(s => document.getAnimations().filter(a => {
  const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
  return a.playState === 'running' && !!t && !!t.closest(s);
}).length, sel);

test('The cards still work: the Explorer card opens Explorer Home as before, no Try a trick opens and no guess is recorded', async ({ page }) => {
  await page.goto(APP);
  await page.locator('.mode-card[data-mode="explorer"]').click();
  await expect(page.locator('h1.home-h')).toHaveText('What do you want to play?');
  await expect(page).not.toHaveURL(/#\/try$/);
  expect((await player(page)).modeGuess).toBeUndefined();
});

test('Above the fold on a phone: at 390 by 844 the Explorer card\'s Try a trick is on screen, and the lede has at most 25 words', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(APP);
  const b = (await page.locator('[data-try="explorer"]').boundingBox())!;
  expect(b.y + b.height).toBeLessThanOrEqual(844);
  expect(words(await page.locator('#view .md-lede').innerText())).toBeLessThanOrEqual(25);
});

test('Three Try a trick buttons: one under each Mode card, named with its Mode', async ({ page }) => {
  await page.goto(APP);
  await expect(page.locator('.pick-h')).toHaveText('Pick who is playing');
  await expect(page.getByRole('button', { name: /Try a trick/ })).toHaveCount(3);
  for (const m of ['explorer', 'challenger', 'pro']) await expect(page.locator(`.mode-opt:has(.mode-card[data-mode="${m}"]) [data-try="${m}"]`)).toHaveCount(1);
  for (const n of ['Explorer', 'Challenger', 'Pro']) await expect(page.getByRole('button', { name: `Try a trick as ${n}`, exact: true })).toBeVisible();
});

test('The hero says little: the headline and the line, at most 14 words, with the Nikhilam Family, no Bolt and no button', async ({ page }) => {
  await page.goto(APP);
  const hero = page.locator('.mq-hero-t');
  await expect(hero.locator('h1')).toHaveText('Fast, fun math for every brain');
  await expect(hero.locator(':scope > p')).toHaveText(['One trick, two minutes, no sign-up.']);
  expect(words(await hero.innerText())).toBeLessThanOrEqual(14);
  await expect(page.locator('.mq-hero-in button, .mq-hero-in a')).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'The Nikhilam Family: the Devanagari digits one, zero and nine' })).toBeVisible();
  expect(await page.locator('.mq-hero-in .bolt').count()).toBe(0);
});

test.describe('Try a trick draws the eye and works every way', () => {
  for (const [width, height] of [[320, 568], [375, 667], [768, 1024], [1280, 720]] as const) {
    test(`at ${width}x${height}: nothing scrolls sideways, every Try a trick is at least 44 px tall, and one opens its Mode's Try a trick by click or tap`, async ({ page }, info) => {
      await page.setViewportSize({ width, height });
      await page.goto(APP);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      for (const t of await page.locator('.mode-try').all()) expect((await t.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const cta = page.locator('[data-try="pro"]');
      if (info.project.use.hasTouch) await cta.tap(); else await cta.click();
      await expect(page).toHaveURL(/#\/try$/);
      await expect(page.locator('#tyH')).toHaveText('Multiply numbers near 100');
    });
  }

  test('Enter on a Try a trick opens its Mode\'s Try a trick', async ({ page }) => {
    await page.goto(APP);
    await page.locator('[data-try="explorer"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tyH')).toHaveText('The 11 sandwich');
  });

  test.describe('motion allowed', () => {
    test.use({ reducedMotion: 'no-preference' });
    test('the family moves', async ({ page }) => {
      await page.goto(APP);
      await expect.poll(() => moving(page, '.lv-family')).toBeGreaterThan(0);
    });
    for (const [what, key] of [['Pause motion', 'motion-paused'], ['Calm', 'vm.calm']] as const) {
      test(`with ${what} on, the family holds still`, async ({ page }) => {
        await page.addInitScript(k => { try { localStorage.setItem(k, '1'); } catch (e) { /* storage blocked */ } }, key);
        await page.goto(APP);
        await expect(page.locator('.lv-family')).toBeVisible();
        await page.waitForTimeout(300);
        expect(await moving(page, '.lv-family')).toBe(0);
      });
    }
  });

  test('with reduced motion, the family holds still', async ({ page }) => {
    await page.goto(APP);
    await expect(page.locator('.lv-family')).toBeVisible();
    expect(await moving(page, '.lv-family')).toBe(0);
  });
});
