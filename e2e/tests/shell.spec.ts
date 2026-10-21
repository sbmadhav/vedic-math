import { test, expect, APP, open, cloudLog, heldClock, appErrors } from './fixtures';
import type { Page, Locator, TestInfo } from '@playwright/test';

/* The play shell, Calm, the one motion rule and text size (openspec game-shell-and-calm). Timed rounds and Star
   rounds play full screen with the keypad in view; nothing here finishes a Ranked round, so nothing is posted. */

const isMobile = (t: TestInfo) => t.project.name === 'mobile';
/** True when the element's box is wholly inside the viewport */
async function onScreen(page: Page, loc: Locator) {
  const b = await loc.boundingBox(), v = page.viewportSize()!;
  return !!b && b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= v.width + 0.5 && b.y + b.height <= v.height + 0.5;
}
async function allOnScreen(page: Page, loc: Locator) {
  const n = await loc.count(), out: number[] = [];
  for (let i = 0; i < n; i++) if (!(await onScreen(page, loc.nth(i)))) out.push(i);
  return { n, off: out };
}
const scrollTop = (page: Page) => page.evaluate(() => document.scrollingElement!.scrollTop);
const calmOn = (page: Page) => page.evaluate(() => localStorage.getItem('vm.calm') === '1');
/** Calm on before the page loads */
const seedCalm = (page: Page) => page.addInitScript(() => { try { localStorage.setItem('vm.calm', '1'); } catch (e) { /* blocked */ } });

/** Starts a timed Arena Practice round and waits for the first question */
async function arenaPractice(page: Page, held = false) {
  await open(page, '#/arena');
  await page.locator('[data-t="practice"]').click();
  await page.locator('#arGo').click();
  if (held) await page.clock.runFor(2_200);
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
}

test.describe('the Arena round fills the screen', () => {
  test('question, entry and all 12 keys are on screen, and the page never scrolls through 10 answers', async ({ page, issues }, testInfo) => {
    await page.setViewportSize(isMobile(testInfo) ? page.viewportSize()! : { width: 390, height: 844 });
    await arenaPractice(page);
    await expect(page.locator('.play-shell')).toBeVisible();
    await expect(page.locator('.ar-key')).toHaveCount(12);
    expect(await scrollTop(page)).toBe(0);
    for (let k = 0; k < 10; k++) {
      expect(await onScreen(page, page.locator('#arQ')), `question on screen, answer ${k + 1}`).toBe(true);
      expect(await onScreen(page, page.locator('#arEntry')), 'entry on screen').toBe(true);
      expect(await onScreen(page, page.locator('#arForm button')), 'Go on screen').toBe(true);
      expect((await allOnScreen(page, page.locator('.ar-key'))).off, 'keys off screen').toEqual([]);
      const q = await page.locator('#arQ').innerHTML();
      await page.locator('.ar-key[data-k="1"]').click();
      await page.locator('#arForm button').click();
      await expect(page.locator('#arQ')).not.toHaveJSProperty('innerHTML', q);
      expect(await scrollTop(page), `scrollTop after answer ${k + 1}`).toBe(0);
    }
    await page.locator('#arStop').click();
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });

  test('on a touch screen, tapping the entry never opens the system keyboard', async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), 'touch screens only');
    await arenaPractice(page);
    await expect(page.locator('#arType')).toHaveAttribute('inputmode', 'none');
    await expect(page.locator('#arType')).toHaveAttribute('readonly', '');
    await page.locator('#arEntry').tap();
    const focused = await page.evaluate(() => { const a = document.activeElement as HTMLElement | null; return !a || a === document.body ? null : { tag: a.tagName, inputmode: a.getAttribute('inputmode'), readonly: (a as HTMLInputElement).readOnly }; });
    if (focused && /^(INPUT|TEXTAREA)$/.test(focused.tag)) expect(focused.inputmode).toBe('none');
    // A physical keyboard still types into the round
    await page.keyboard.type('12');
    await expect(page.locator('#arEntry')).toHaveText('12');
  });

  test('landscape 844 by 390: every key is still on screen', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await arenaPractice(page);
    const keys = await allOnScreen(page, page.locator('.ar-key'));
    expect(keys.n).toBe(12);
    expect(keys.off).toEqual([]);
    for (const sel of ['#arQ', '#arEntry', '#arForm button']) expect(await onScreen(page, page.locator(sel)), sel).toBe(true);
    expect(await scrollTop(page)).toBe(0);
  });

  test('the rest of the page is inert while the shell is open, and leaving the result focuses Start', async ({ page }) => {
    await heldClock(page);
    await arenaPractice(page, true);
    const inert = () => page.evaluate(() => ({ view: [...document.querySelectorAll('#view > :not(.play-shell)')].every(n => (n as HTMLElement).inert), header: (document.querySelector('body > header') as HTMLElement).inert, footer: (document.querySelector('body > footer') as HTMLElement).inert }));
    expect(await inert()).toEqual({ view: true, header: true, footer: true });
    await page.clock.fastForward(61_000);
    await page.clock.runFor(100);
    await expect(page.locator('.play-shell .ar-result')).toBeVisible();
    await expect(page.locator('#arStop')).toHaveText('Back');
    await page.locator('#arDone').click();
    await expect(page.locator('.play-shell')).toHaveCount(0);
    await expect(page.locator('#arGo')).toBeFocused();
    expect(await inert()).toEqual({ view: false, header: false, footer: false });
    // The result stays in the lobby, and Stop during a round also returns to Start
    await expect(page.locator('#arShell .ar-result')).toBeVisible();
    await page.locator('#arGo').click();
    await page.clock.runFor(2_200);
    await page.locator('#arStop').click();
    await expect(page.locator('.play-shell')).toHaveCount(0);
    await expect(page.locator('#arGo')).toBeFocused();
    expect((await cloudLog(page)).writes).toEqual([]);
  });
});

/* Tower challenges in Calm (task 3.3): Sprint has no clock and no Medal; Sharpshooter keeps its Medal */
test.describe('tower in Calm', () => {
  test.use({ seedProgress: { medals: { 'a:1': 1 } } });
  test('Sprint has no timer and says its Medals need the clock; Sharpshooter still awards a Medal', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'webkit', 'app logic: chromium and mobile');
    await seedCalm(page);
    await open(page, '#/challenge/1');
    await page.locator('#chGo').click();
    await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
    await expect(page.locator('.ar-bar')).toHaveCount(0);
    await expect(page.locator('.ar-time small')).toHaveText('Question');
    await expect(page.locator('#arTime')).toHaveText('1/20');
    await page.locator('#arFinish').click();
    await expect(page.locator('.lv-result h2')).toHaveText('Round done');
    await expect(page.locator('.lv-result')).toContainText('Medals for Sprint need the clock.');
    await expect(page.locator('.lv-result')).toContainText('Sparks');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!).medals['a:1'])).toBe(1);

    // Challenge 2 is a Sharpshooter: no clock anyway, so its Medal stays
    const answers = await page.evaluate(async () => { const L = await e2eMod('levels'); const ch = L.challenge(2); return L.challengeSet(ch).slice(0, ch.total).map((p: { answer: unknown }) => String(p.answer)); });
    await page.goto(`${APP}#/challenge/2`);
    await page.locator('#chGo').click();
    await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
    for (const a of answers) {
      const choice = page.locator(`.ar-choice[data-v="${a}"]`);
      if (await choice.count()) await choice.first().click();
      else { for (const c of a) await page.locator(`.ar-key[data-k="${c}"]`).click(); await page.locator('#arForm button').click(); }
    }
    await expect(page.locator('.lv-result h2')).toHaveText('Gold Medal!');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!).medals['a:2'])).toBe(3);
    expect(await calmOn(page)).toBe(true);
  });
});

/* One motion rule (task 4.1): Pause motion stills the moving background without turning Calm on */
test.describe('the moving background', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('Pause motion stops its frames, clearing it restarts them, and Calm stays off', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'canvas frames: chromium');
    await open(page, '#/learn');
    const canvas = page.locator('canvas.vm-bg');
    await expect(canvas).toHaveCount(1, { timeout: 5000 });
    const frame = () => canvas.evaluate(c => (c as HTMLCanvasElement).toDataURL());
    const moving = async () => { const a = await frame(); await page.waitForTimeout(1000); return a !== (await frame()); };
    expect(await moving(), 'moves before').toBe(true);
    await page.evaluate(() => { document.documentElement.classList.add('motion-paused'); document.dispatchEvent(new CustomEvent('sitemotion', { detail: { paused: true } })); });
    await page.waitForTimeout(100);
    expect(await moving(), 'still while paused').toBe(false);
    await expect(canvas).toHaveCount(1);
    expect(await calmOn(page)).toBe(false);
    await expect(page.locator('body')).not.toHaveClass(/\bcalm\b/);
    await page.evaluate(() => { document.documentElement.classList.remove('motion-paused'); document.dispatchEvent(new CustomEvent('sitemotion', { detail: { paused: false } })); });
    expect(await moving(), 'moves again').toBe(true);
    expect(await calmOn(page)).toBe(false);
  });

  test('Calm on: the background stays and stops moving', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'canvas frames: chromium');
    await open(page, '#/me');
    const canvas = page.locator('canvas.vm-bg');
    await expect(canvas).toHaveCount(1, { timeout: 5000 });
    await page.locator('#setCalm').click();
    await page.waitForTimeout(100);
    const a = await canvas.evaluate(c => (c as HTMLCanvasElement).toDataURL());
    await page.waitForTimeout(1000);
    expect(await canvas.evaluate(c => (c as HTMLCanvasElement).toDataURL())).toBe(a);
  });
});

/* Calm is one switch (task 4.2): turned on in a game's play shell, it is on in Me and after a reload */
test('Calm turned on in a game header shows on in Me and after a reload, and is announced', async ({ page }) => {
  await open(page, '#/game/times-sprint');
  await page.locator('#gShell [data-m="endless"]').click();
  await page.locator('#gStart').click();
  const sw = page.locator('.play-shell .play-calm');
  await expect(sw).toHaveAttribute('role', 'switch');
  await expect(sw).toHaveAccessibleName('Calm');
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#vmLive')).toHaveText('Calm on. No clocks in Practice, no motion.');
  await expect(page.locator('body')).toHaveClass(/\bcalm\b/);
  await page.goto(`${APP}#/me`);
  await expect(page.locator('#setCalm')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#setMotion')).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('#motionNote')).toHaveText('Stops every animation on every page of this site, also after a reload. Saved on this device.');
  await page.reload();
  await expect(page.locator('#setCalm')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('body')).toHaveClass(/\bcalm\b/);
  await page.locator('#setCalm').click();
  await expect(page.locator('#setCalm')).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('#vmLive')).toHaveText('Calm off.');
  expect(await calmOn(page)).toBe(false);
});

/* Text size (task 5.1): A+ grows the question about 25%, and a Star round still fits on a phone */
test('A+ grows the Star question by about 25% and every key stays on screen', async ({ page }, testInfo) => {
  await open(page, '#/star/sq5/1');
  await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
  const size = () => page.locator('#stQ').evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  const a = await size();
  await page.locator('.play-shell [data-size="a+"]').click();
  await expect(page.locator('.play-shell [data-size="a+"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('body')).toHaveClass(/\btext-plus\b/);
  const b = await size();
  expect(b / a).toBeGreaterThan(1.2);
  expect(b / a).toBeLessThan(1.3);
  const keys = await allOnScreen(page, page.locator('#stPad .star-key'));
  expect(keys.n).toBe(13);
  if (isMobile(testInfo)) expect(keys.off).toEqual([]);
  expect(await scrollTop(page)).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('vm.text'))).toBe('a+');
  // Back to A, from the Me page
  await page.goto(`${APP}#/me`);
  await expect(page.locator('.me-size [data-size="a+"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.me-size [data-size="a"]').click();
  await expect(page.locator('body')).not.toHaveClass(/\btext-plus\b/);
});
