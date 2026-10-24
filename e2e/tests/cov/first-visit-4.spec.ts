import { test, expect, APP } from '../fixtures';

/* first-visit spec, Requirement "The app's hero says little" (openspec change celebrations): one test per scenario. */
type Page = import('@playwright/test').Page;
test.use({ seedMode: null });

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
/* Running animations on elements inside sel */
const moving = (page: Page, sel: string) => page.evaluate(s => document.getAnimations().filter(a => {
  const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
  return a.playState === 'running' && !!t && !!t.closest(s);
}).length, sel);

test('The hero says little: "Fast, fun math for every brain", "One trick, two minutes, no sign-up." and Try a trick, at most 14 words before the button, with the Nikhilam Family beside it', async ({ page }) => {
  await page.goto(APP);
  const hero = page.locator('.mq-hero-t');
  await expect(hero.locator('h1')).toHaveText('Fast, fun math for every brain');
  await expect(hero.locator(':scope > p').first()).toHaveText('One trick, two minutes, no sign-up.');
  await expect(page.locator('#tryBtn')).toHaveText('Try a trick');
  const before = await hero.evaluate(el => [...el.children].filter(c => !c.querySelector('a, button')).map(c => (c as HTMLElement).innerText).join(' '));
  expect(words(before)).toBeLessThanOrEqual(14);
  await expect(page.getByRole('img', { name: 'The Nikhilam Family: the Devanagari digits one, zero and nine' })).toBeVisible();
  expect(await page.locator('.mq-hero-t .bolt').count()).toBe(0);
});

test.describe('Try a trick draws the eye and works every way', () => {
  for (const [width, height] of [[320, 568], [375, 667], [768, 1024], [1280, 720]] as const) {
    test(`at ${width}x${height}: on screen without scrolling, at least 56 px tall, and it opens a Star by click or tap`, async ({ page }, info) => {
      await page.setViewportSize({ width, height });
      await page.goto(APP);
      const cta = page.locator('#tryBtn');
      const b = (await cta.boundingBox())!;
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height).toBeLessThanOrEqual(height);
      expect(b.height).toBeGreaterThanOrEqual(56);
      if (info.project.use.hasTouch) await cta.tap(); else await cta.click();
      await expect(page).toHaveURL(/#\/star\/[\w-]+\/1$/);
    });
  }

  test('Enter on Try a trick opens a Star', async ({ page }) => {
    await page.goto(APP);
    await page.locator('#tryBtn').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/star\/[\w-]+\/1$/);
  });

  test.describe('motion allowed', () => {
    test.use({ reducedMotion: 'no-preference' });
    test('Try a trick glows and the family\'s nine nods', async ({ page }) => {
      await page.goto(APP);
      await expect(page.locator('#tryBtn')).toBeVisible();
      await expect.poll(() => moving(page, '.mq-hero-t')).toBeGreaterThan(0);
      await expect.poll(() => moving(page, '.lv-family .lv-f-nine')).toBeGreaterThan(0);
    });
    for (const [what, key] of [['Pause motion', 'motion-paused'], ['Calm', 'vm.calm']] as const) {
      test(`with ${what} on, Try a trick and the family hold still`, async ({ page }) => {
        await page.addInitScript(k => { try { localStorage.setItem(k, '1'); } catch (e) { /* storage blocked */ } }, key);
        await page.goto(APP);
        await expect(page.locator('#tryBtn')).toBeVisible();
        await page.waitForTimeout(300);
        expect(await moving(page, '.mq-hero-t')).toBe(0);
        expect(await moving(page, '.lv-family')).toBe(0);
      });
    }
  });

  test('with reduced motion, Try a trick and the family hold still', async ({ page }) => {
    await page.goto(APP);
    await expect(page.locator('#tryBtn')).toBeVisible();
    expect(await moving(page, '.mq-hero-t')).toBe(0);
    expect(await moving(page, '.lv-family')).toBe(0);
  });
});
