import { test, expect, APP } from './fixtures';

/* The heroes say as little as they can (openspec landing-pages "The landing page"): one short headline, at most one
   short line under it, and one big call to action that is on screen without scrolling at every width, works by
   click, tap and keyboard, glows gently, and holds still under reduced motion, Pause motion and Calm. The app home's
   hero (the Mode picker, openspec try-trick-in-modes) has no button: Try a trick sits under each Mode card. The Nikhilam
   Family is the mascot on all of them. */
type Page = import('@playwright/test').Page;

const HEROES = [
  { name: 'landing page', url: '/?home', text: '.lv-hero-t', h1: 'Math in your head, the sutra way', line: 'Free, for ages 4 to adult.', cta: 'main a.lv-play', label: 'Start learning', mode: null },
  { name: 'welcome back landing page', url: '/?home', text: '.lv-hero-t', h1: 'Welcome back, Swift Tiger 42', line: 'Pick up where you left off.', cta: 'main a.lv-play', label: 'Keep playing', mode: 'challenger' },
] as const;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
/* Running animations on elements inside the hero (the family, the call to action and its ring) */
const heroMoving = (page: Page, sel: string) => page.evaluate(s => document.getAnimations().filter(a => {
  const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
  return a.playState === 'running' && !!t && !!t.closest(s);
}).length, sel);

for (const h of HEROES) {
  test.describe(h.name, () => {
    test.use({ seedMode: h.mode });

    test(`one short headline, one short line and ${h.label}: at most 14 words, nothing else in the hero`, async ({ page }) => {
      await page.goto(h.url);
      const box = page.locator(h.text);
      await expect(box.locator('h1')).toHaveText(h.h1);
      const ps = box.locator(':scope > p');
      await expect(ps).toHaveCount(2); // the line and the row with the call to action
      await expect(ps.first()).toHaveText(h.line);
      await expect(page.locator(h.cta)).toHaveText(h.label);
      const text = await box.evaluate(el => [...el.children].filter(c => !c.querySelector('a, button')).map(c => (c as HTMLElement).innerText).join(' '));
      expect(words(text)).toBeLessThanOrEqual(14);
      // The Nikhilam Family is the mascot, and Bolt is not in the hero
      await expect(page.getByRole('img', { name: 'The Nikhilam Family: the Devanagari digits one, zero and nine' })).toBeVisible();
      expect(await page.locator(`${h.text} .bolt, ${h.cta} svg path[d^="M13 2L4 14"]`).count()).toBe(0);
    });

    for (const [width, height] of [[320, 568], [375, 667], [768, 1024], [1280, 720]] as const) {
      test(`at ${width}x${height} ${h.label} is on screen without scrolling and nothing scrolls sideways`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(h.url);
        const b = (await page.locator(h.cta).boundingBox())!;
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.y + b.height).toBeLessThanOrEqual(height);
        expect(b.height).toBeGreaterThanOrEqual(56); // big: well over the 44 px touch target
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      });
    }

    test(`${h.label} works by click or tap`, async ({ page }, info) => {
      await page.goto(h.url);
      const cta = page.locator(h.cta);
      if (info.project.use.hasTouch) await cta.tap(); else await cta.click();
      await expect(page).toHaveURL(/\/learn\/$/);
    });

    test(`${h.label} works from the keyboard`, async ({ page }) => {
      await page.goto(h.url);
      const cta = page.locator(h.cta);
      await cta.focus();
      await expect(cta).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/learn\/$/);
    });

    test.describe('motion allowed', () => {
      test.use({ reducedMotion: 'no-preference' });
      test(`${h.label} glows and the family moves`, async ({ page }) => {
        await page.goto(h.url);
        await expect(page.locator(h.cta)).toBeVisible();
        await expect.poll(() => heroMoving(page, h.text)).toBeGreaterThan(0); // the ring and the arrow
        await expect.poll(() => heroMoving(page, '.lv-family')).toBeGreaterThan(0);
      });
      for (const [what, key] of [['Pause motion', 'motion-paused'], ['Calm', 'vm.calm']] as const) {
        test(`with ${what} on, ${h.label} and the family hold still`, async ({ page }) => {
          await page.addInitScript(k => { try { localStorage.setItem(k, '1'); } catch (e) { /* storage blocked */ } }, key);
          await page.goto(h.url);
          await expect(page.locator(h.cta)).toBeVisible();
          await page.waitForTimeout(300);
          expect(await heroMoving(page, h.text)).toBe(0);
          expect(await heroMoving(page, '.lv-family')).toBe(0);
        });
      }
    });

    test.describe('reduced motion', () => {
      test.use({ reducedMotion: 'reduce' });
      test(`${h.label} and the family hold still`, async ({ page }) => {
        await page.goto(h.url);
        await expect(page.locator(h.cta)).toBeVisible();
        expect(await heroMoving(page, h.text)).toBe(0);
        expect(await heroMoving(page, '.lv-family')).toBe(0);
      });
    });
  });
}

test.describe('app home (the Mode picker)', () => {
  test.use({ seedMode: null });

  test('one short headline and one short line, at most 14 words, no button, the Nikhilam Family and no Bolt', async ({ page }) => {
    await page.goto(APP);
    const box = page.locator('.mq-hero-t');
    await expect(box.locator('h1')).toHaveText('Fast, fun math for every brain');
    await expect(box.locator(':scope > p')).toHaveText(['One trick, two minutes, no sign-up.']);
    await expect(box.locator('a, button')).toHaveCount(0);
    expect(words(await box.innerText())).toBeLessThanOrEqual(14);
    await expect(page.getByRole('img', { name: 'The Nikhilam Family: the Devanagari digits one, zero and nine' })).toBeVisible();
    expect(await page.locator('.mq-hero .bolt').count()).toBe(0);
  });

  test.describe('motion allowed', () => {
    test.use({ reducedMotion: 'no-preference' });
    test('the family moves', async ({ page }) => {
      await page.goto(APP);
      await expect.poll(() => heroMoving(page, '.lv-family')).toBeGreaterThan(0);
    });
    for (const [what, key] of [['Pause motion', 'motion-paused'], ['Calm', 'vm.calm']] as const) {
      test(`with ${what} on, the family holds still`, async ({ page }) => {
        await page.addInitScript(k => { try { localStorage.setItem(k, '1'); } catch (e) { /* storage blocked */ } }, key);
        await page.goto(APP);
        await expect(page.locator('.lv-family')).toBeVisible();
        await page.waitForTimeout(300);
        expect(await heroMoving(page, '.lv-family')).toBe(0);
      });
    }
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('the family holds still', async ({ page }) => {
      await page.goto(APP);
      await expect(page.locator('.lv-family')).toBeVisible();
      expect(await heroMoving(page, '.lv-family')).toBe(0);
    });
  });
});
