import { test, expect, open } from './fixtures';

/* View transitions inside the game (openspec change indexable-routes, design D12, page-transitions spec, task 3.1).
   The router runs a route change's DOM update inside document.startViewTransition when the browser has it and motion
   is allowed; the first render, a redraw of the same route and every move under reduced motion, Pause motion or Calm
   swap at once. An init script wraps the API and counts its calls: the count is the evidence. The suite runs under
   reduced motion by default (playwright.config.ts), so the tests that expect a transition allow motion. Chromium
   (desktop and the mobile project) and WebKit have the API (Chrome 111, Safari 18); a browser without it skips the
   tests that expect a call and keeps the ones that expect none. Cross-document transitions are task 4.1. */
type Page = import('@playwright/test').Page;

/** Counts document.startViewTransition calls in window.__vt, calling through to the real one. Before open(). */
async function countTransitions(page: Page) {
  await page.addInitScript(() => {
    const w = window as any, d = document as any;
    w.__vt = 0;
    const real = d.startViewTransition;
    if (typeof real !== 'function') return;
    d.startViewTransition = function (this: unknown, ...args: unknown[]) { w.__vt++; return real.apply(this, args); };
  });
}
const transitions = (page: Page) => page.evaluate(() => (window as any).__vt as number);
const supported = (page: Page) => page.evaluate(() => typeof (document as any).startViewTransition === 'function');
const tab = (page: Page, href: string) => page.locator(`header .mq-nav a[href="${href}"]`);
const heading = (page: Page) => page.locator('#view h1');

/** Taps a nav link and waits for its view: the heading has focus, as without a transition. */
async function tapNav(page: Page, href: string, head: string | RegExp) {
  await tab(page, href).click();
  await expect(page).toHaveURL(href === '#/' ? /\/play\/(#\/?)?$/ : new RegExp(`${href.replace(/[/#]/g, '\\$&')}$`));
  await expect(heading(page)).toHaveText(head);
  await expect(heading(page)).toBeFocused();
}

test.describe('with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('one view transition per nav tap, none on the first load; the header stays still, no document is requested and focus lands on the new heading', async ({ page }) => {
    await countTransitions(page);
    await open(page);
    test.skip(!(await supported(page)), 'this browser has no document.startViewTransition: the swap is plain');
    expect(await transitions(page), 'the first render swaps without a transition').toBe(0);
    let documents = 0;
    page.on('request', r => { if (r.resourceType() === 'document') documents++; });
    const header = page.locator('header.md-header'), nav = page.locator('header .mq-nav');
    const before = { header: await header.boundingBox(), nav: await nav.boundingBox() };
    await tapNav(page, '#/arcade', 'Pick how to play');
    expect(await transitions(page)).toBe(1);
    await tapNav(page, '#/learn', 'Pick a level');
    expect(await transitions(page)).toBe(2);
    await tapNav(page, '#/watch', 'Short videos that show how');
    expect(await transitions(page)).toBe(3);
    await tapNav(page, '#/', 'Learn a sutra, then use it');
    expect(await transitions(page), 'one transition per route change').toBe(4);
    expect(documents, 'no route change inside the game loads a document').toBe(0);
    expect({ header: await header.boundingBox(), nav: await nav.boundingBox() }).toEqual(before);
  });

  test('Play again redraws the round without a transition; the next route change gets one', async ({ page }) => {
    await countTransitions(page);
    await open(page, '#/star/sq5/1');
    test.skip(!(await supported(page)), 'this browser has no document.startViewTransition: the swap is plain');
    expect(await transitions(page)).toBe(0);
    await page.locator('#stSkip').click();
    await expect(page.locator('#stAgain')).toBeVisible();
    await page.locator('#stAgain').click();
    await expect(page.locator('#stSkip')).toBeVisible(); /* the round drawn again, in place */
    await expect(page).toHaveURL(/#\/star\/sq5\/1$/);
    expect(await transitions(page), 'a redraw of the same route is a plain swap').toBe(0);
    /* The nav is hidden inside a round: the end screen's Back link (to the Dojo, on a cold open) is the next route change */
    await page.locator('#stSkip').click();
    await page.locator('#stBack').click();
    await expect(page).toHaveURL(/#\/dojo$/);
    await expect(heading(page)).toBeFocused();
    expect(await transitions(page), 'the next route change runs inside one').toBe(1);
  });

  test('reduced motion: the swap is instant and the heading still gets focus', async ({ page }) => {
    await countTransitions(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await tapNav(page, '#/arcade', 'Pick how to play');
    await tapNav(page, '#/learn', 'Pick a level');
    expect(await transitions(page), 'prefers-reduced-motion: reduce starts no transition').toBe(0);
  });

  test('Calm: no transition', async ({ page }) => {
    await countTransitions(page);
    await page.addInitScript(() => { try { localStorage.setItem('vm.calm', '1'); } catch (e) { /* storage blocked */ } });
    await open(page);
    await expect(page.locator('body')).toHaveClass(/\bcalm\b/);
    await tapNav(page, '#/arcade', 'Pick how to play');
    await tapNav(page, '#/learn', 'Pick a level');
    expect(await transitions(page), 'Calm starts no transition').toBe(0);
  });

  test('Pause motion: no transition', async ({ page }) => {
    await countTransitions(page);
    await page.addInitScript(() => { try { localStorage.setItem('motion-paused', '1'); } catch (e) { /* storage blocked */ } });
    await open(page);
    await expect(page.locator('html')).toHaveClass(/motion-paused/);
    await tapNav(page, '#/arcade', 'Pick how to play');
    await tapNav(page, '#/learn', 'Pick a level');
    expect(await transitions(page), 'Pause motion starts no transition').toBe(0);
  });
});
