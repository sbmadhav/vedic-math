import AxeBuilder from '@axe-core/playwright';
import { test, expect, open, APP, pickMode } from './fixtures';

/* The menu by Mode, Calm and sound, and lessons that end in practice (openspec change play-nav-by-mode). */
type Page = import('@playwright/test').Page;
const tabs = async (page: Page) => (await page.locator('header .mq-nav a:visible').allInnerTexts()).map(t => t.trim().split('\n')[0].trim());
const current = (page: Page) => page.locator('header .mq-nav a[aria-current="true"]');

/* A fake speechSynthesis that records what is said (the try-trick and verses specs' pattern) */
async function recordSpeech(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__said = [];
    try { localStorage.setItem('vm.studioVoice', '0'); } catch (e) { /* storage blocked */ }
    const voice = { name: 'Samantha', lang: 'en-US', voiceURI: 'Samantha', localService: true, default: true };
    const fake = { getVoices: () => [voice], pending: false, speaking: false, paused: false, speak(u: any) { w.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 0); }, cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    class Utterance { text: string; voice: unknown = null; lang = ''; pitch = 1; rate = 1; volume = 1; onend: null | (() => void) = null; onerror = null; constructor(t: string) { this.text = t; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
  });
}
const said = (page: Page): Promise<string[]> => page.evaluate(() => (window as any).__said || []);

test.describe('zones', () => {
  for (const mode of ['challenger', 'pro'] as const) {
    test.describe(mode, () => {
      test.use({ seedMode: mode });
      test(`${mode}: Home, Learn, Arcade, Watch and Find, each with its plain line as a tooltip`, async ({ page }) => {
        await open(page);
        expect(await tabs(page)).toEqual(['Home', 'Learn', 'Arcade', 'Watch', 'Find']);
        await expect(current(page)).toHaveText('Home');
        for (const a of await page.locator('header .mq-nav a').all()) expect(((await a.getAttribute('title')) || '').length).toBeGreaterThan(20);
        await expect(page.locator('header .mq-nav a[href="#/arcade"]')).toHaveAttribute('title', /Dojo/);
      });
    });
  }

  test('each zone is current on the routes inside it, and old links open as before', async ({ page }) => {
    for (const [hash, zone, heading] of [
      ['#/dojo', 'Arcade', /black belt/i], ['#/arena', 'Arcade', null], ['#/games', 'Arcade', null], ['#/skill/v-sq5', 'Arcade', null],
      ['#/sutras', 'Learn', /sutras/i], ['#/grade/3', 'Learn', null], ['#/watch', 'Watch', null], ['#/guide', 'Find', null], ['#/find', 'Find', null], ['#/tiles', 'Home', null]
    ] as const) {
      await open(page, hash);
      await expect(current(page), hash).toHaveCount(1);
      await expect(current(page), hash).toContainText(zone);
      if (heading) await expect(page.locator('#view h1').first()).toHaveText(heading);
    }
    await open(page, '#/me');
    await expect(current(page)).toHaveCount(0);
  });

  test('the Arcade: the Dojo, the Arena and Games as cards with their lines, then Party Mode and the challenge tower', async ({ page }) => {
    await open(page);
    await page.locator('header .mq-nav a[href="#/arcade"]').click();
    await expect(page).toHaveURL(/#\/arcade$/);
    const doors = page.locator('.arcade-doors a.door');
    await expect(doors).toHaveCount(3);
    expect(await doors.evaluateAll(as => as.map(a => a.getAttribute('href')))).toEqual(['#/dojo', '#/arena', '#/games']);
    for (const d of await doors.all()) expect((await d.locator('.door-line').innerText()).length).toBeGreaterThan(20);
    await expect(page.locator('.play-grid a[href="#/arena/party"]')).toBeVisible();
    await expect(page.locator('.play-grid a[href="#/tower"]')).toBeVisible();
    await doors.first().click();
    await expect(page).toHaveURL(/#\/dojo$/);
    await expect(current(page)).toHaveText('Arcade');
  });

  test('Learn: the Sutras come first, with the cards collected, then the levels', async ({ page }) => {
    await open(page);
    await page.locator('header .mq-nav a[href="#/learn"]').click();
    const card = page.locator('#view a.learn-sutras');
    await expect(card).toContainText('Start with the sutras');
    await expect(card).toContainText('0 of 29 cards collected');
    const firstLink = await page.locator('#view .md-wrap a:not(.mq-crumbs a)').first().getAttribute('href');
    expect(firstLink).toBe('#/sutras');
    await card.click();
    await expect(page.locator('.sutra-grid').first()).toBeVisible();
    await expect(current(page)).toHaveText('Learn');
  });

  test('switching to Explorer on Me redraws the menu at once', async ({ page }) => {
    await open(page, '#/me');
    await page.locator('.mode-pick--sm .mode-card[data-mode="explorer"]').click();
    expect(await tabs(page)).toEqual(['Play', 'Learn', 'Me']);
    await expect(current(page)).toHaveText(/Me/);
  });

  test('accessible at 1280 and 320 in both schemes', async ({ page }) => {
    for (const [w, scheme] of [[1280, 'light'], [320, 'dark']] as const) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, '#/arcade');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
      for (const a of await page.locator('header .mq-nav a').all()) await expect(a).toBeInViewport();
      const r = await new AxeBuilder({ page }).include('header').include('#view').analyze();
      expect(r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id)).toEqual([]);
    }
  });
});

test.describe('Explorer tabs', () => {
  test.use({ seedMode: 'explorer' });

  test('three big picture tabs, Play, Learn and Me, sharing a phone row', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    expect(await tabs(page)).toEqual(['Play', 'Learn', 'Me']);
    const boxes = await Promise.all((await page.locator('header .mq-nav a').all()).map(a => a.boundingBox()));
    for (const b of boxes) { expect(b!.height).toBeGreaterThanOrEqual(56); expect(b!.width).toBeGreaterThanOrEqual(76); }
    expect(new Set(boxes.map(b => Math.round(b!.y))).size).toBe(1);
    await expect(page.locator('header .mq-nav svg')).toHaveCount(3);
    await expect(page.locator('header .nav-find')).toHaveCount(0);
    await expect(current(page)).toContainText('Play');
  });

  test('with Read aloud on, a tab says its name once, after its page has drawn', async ({ page }) => {
    await recordSpeech(page);
    await open(page);
    await page.locator('header .mq-nav a[href="#/learn"]').click();
    await expect(page).toHaveURL(/#\/learn$/);
    await expect.poll(() => said(page)).toEqual(['Learn']);
    await page.locator('header .mq-nav a[href="#/learn"]').click(); /* its own page: at once */
    await expect.poll(() => said(page)).toEqual(['Learn', 'Learn']);
    await page.locator('header .mq-nav a[href="#/me"]').click();
    await expect.poll(() => said(page)).toEqual(['Learn', 'Learn', 'Me']);
  });

  test('with Read aloud off, a tab says nothing', async ({ page }) => {
    await recordSpeech(page);
    await page.addInitScript(() => { try { localStorage.setItem('vm.voice', '0'); } catch (e) { /* storage blocked */ } });
    await open(page);
    await page.locator('header .mq-nav a[href="#/me"]').click();
    await expect(page.locator('#view h1')).toBeVisible();
    await page.waitForTimeout(300);
    expect(await said(page)).toEqual([]);
  });

  test('More places on Play: all games, the sutras, How to play and Find', async ({ page }) => {
    await open(page);
    const more = page.locator('nav.home-places');
    expect(await more.locator('a').evaluateAll(as => as.map(a => a.getAttribute('href')))).toEqual(['#/games', '#/sutras', '#/guide', '#/find']);
    await expect(page.locator('.play-grid--big .play-tile')).toHaveCount(8);
    await more.locator('a[href="#/guide"]').click();
    await expect(page).toHaveURL(/#\/guide$/);
  });
});

test.describe('Find', () => {
  test('Find shows its shortcut, opens with Ctrl K (Cmd K) from a text field, and offers the guide and the tour first', async ({ page }, testInfo) => {
    await open(page, '#/skill/3-mult');
    if (testInfo.project.name !== 'mobile') await expect(page.locator('header .nav-kbd')).toBeVisible();
    await expect(page.locator('header .nav-find')).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K');
    await page.locator('#practice .ans-in').first().focus();
    await page.keyboard.press('Control+k');
    await expect(page).toHaveURL(/#\/find$/);
    await expect(page.locator('#findIn')).toBeFocused();
    await expect(current(page)).toContainText('Find');
    const help = page.locator('.find-help');
    await expect(help.locator('a[href="#/guide"]')).toBeVisible();
    await expect(help.locator('[data-find-tour]')).toBeVisible();
    expect(await page.locator('#findOut .find-list .find-hit b').allInnerTexts()).toEqual(['Home', 'Sutras', 'Learn', 'Arcade', 'Dojo', 'Arena', 'Games', 'Watch', 'Me', 'Guide']);
    await open(page, '#/dojo');
    await page.keyboard.press('Meta+k');
    await expect(page).toHaveURL(/#\/find$/);
  });

  test('Take the tour on Find opens Home with the tour', async ({ page }) => {
    await open(page, '#/find');
    await page.locator('[data-find-tour]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(/\/play\/(#\/?)?$/);
  });

  test('not during a round: Ctrl K leaves a Star open', async ({ page }) => {
    await open(page, '#/star/sq5/1');
    await expect(page.locator('.play-shell')).toBeVisible();
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(200);
    await expect(page).toHaveURL(/#\/star\/sq5\/1$/);
    await expect(page.locator('.play-shell')).toBeVisible();
  });
});

test.describe('Calm and sound', () => {
  test('one control in the header: Calm, Pause motion and the music in one panel, Escape closes it', async ({ page }) => {
    await open(page);
    const btn = page.locator('#vmMBtn');
    await expect(btn).toHaveAccessibleName('Calm and sound');
    await expect(page.locator('header .vm-calm')).toBeHidden();
    await btn.click();
    const panel = page.locator('#vmMPanel');
    await expect(panel.locator('#vmCalm')).toHaveAttribute('aria-checked', 'false');
    await expect(panel.locator('#vmMotion')).toBeVisible();
    await expect(panel.locator('[data-t]')).toHaveCount(4);
    await panel.locator('#vmCalm').click();
    await expect(panel.locator('#vmCalm')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('body')).toHaveClass(/\bcalm\b/);
    await expect(btn).toHaveClass(/\bcalm\b/);
    await expect(btn).not.toHaveClass(/\bon\b/); /* nothing started playing */
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(btn).toBeFocused();
    await open(page, '#/me');
    await expect(page.locator('#setCalm')).toHaveAttribute('aria-checked', 'true');
    await page.locator('#setCalm').click();
    await btn.click();
    await expect(panel.locator('#vmCalm')).toHaveAttribute('aria-checked', 'false');
  });

  test('on a short screen the panel stays inside the viewport and scrolls to its last control', async ({ page }) => {
    await page.setViewportSize({ width: 568, height: 320 });
    await open(page);
    await page.locator('#vmMBtn').click();
    const panel = page.locator('#vmMPanel');
    await expect(panel).toBeVisible();
    const b = (await panel.boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(320);
    expect(await panel.evaluate(p => p.scrollHeight > p.clientHeight)).toBe(true);
    const last = panel.locator('.vm-about summary');
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    await last.click();
    await expect(panel.locator('.vm-about')).toHaveAttribute('open', '');
  });

  test('in a round: the shell has the same control with Pause motion and the music, in step with the header', async ({ page }) => {
    await open(page, '#/star/sq5/1');
    const shell = page.locator('.play-shell');
    await shell.locator('#plMBtn').click();
    const panel = shell.locator('#plMPanel');
    await expect(panel.locator('[data-t]')).toHaveCount(4);
    await expect(panel.locator('.vm-calm')).toHaveCount(0); /* the shell's own Calm switch is beside it */
    await panel.locator('#plMotion').click();
    await expect(page.locator('html')).toHaveClass(/motion-paused/);
    await shell.locator('#stExit').click();
    await expect(page.locator('.play-shell')).toHaveCount(0);
    await page.locator('#vmMBtn').click(); /* the panel is drawn on its first open */
    await expect(page.locator('#vmMotion')).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('lesson practice', () => {
  test('Practice it now ends a Skill\'s lesson and puts its answer in reach on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, '#/skill/3-mult');
    const go = page.locator('#practiceNow');
    await expect(go).toHaveText(/Practice it now/);
    await expect(go).not.toHaveClass(/md-btn--primary/);
    await go.click();
    await expect(page.locator('#practice')).toBeInViewport();
    await expect(page.locator('#practice .ans-in, #practice .pr-choice').first()).toBeFocused();
  });

  test('a Trick page ends its lesson the same way', async ({ page }) => {
    await open(page, '#/skill/v-sq5');
    await expect(page.locator('#practiceNow')).toBeVisible();
  });

  test('Try it yourself starts the Trick\'s first unlit Star; Back to the sutra returns to the Deep dive, which closes to the Sutras page', async ({ page }) => {
    await open(page, '#/sutras/s1');
    const dlg = page.locator('dialog.sutra-modal');
    const first = dlg.locator('.sd-try li').first();
    await expect(first.locator('a.md-btn--primary')).toHaveAttribute('href', '#/star/sq5/1');
    await expect(first.locator('a.sd-how')).toHaveAttribute('href', '#/skill/v-sq5');
    await first.locator('a.md-btn--primary').click();
    await expect(page).toHaveURL(/#\/star\/sq5\/1$/);
    await expect(page.locator('.play-shell')).toBeVisible();
    await expect(page.locator('#stExit')).toHaveText('Back');
    await page.locator('#stExit').click();
    await expect(page).toHaveURL(/#\/sutras\/s1$/);
    await expect(dlg).toBeVisible();
    await dlg.locator('.sd-x').click();
    await expect(dlg).toBeHidden();
    await expect(page).toHaveURL(/#\/sutras$/);
  });

  test.describe('Explorer', () => {
    test.use({ seedMode: 'explorer' });
    test('Now you try, and Try it yourself opens the Trick page with no Star', async ({ page }) => {
      await open(page, '#/skill/k-add10');
      await expect(page.locator('#practiceNow')).toHaveText(/Now you try/);
      await open(page, '#/sutras/s1');
      await expect(page.locator('dialog.sutra-modal .sd-try li a.md-btn--primary').first()).toHaveAttribute('href', '#/skill/v-sq5');
    });
  });
});

test.describe('first visit', () => {
  test.use({ seedMode: null });
  test('the picker asks one question: three Mode cards are its only buttons, and the menu is hidden', async ({ page }) => {
    await page.goto(APP);
    await expect(page.locator('.mode-card')).toHaveCount(3);
    expect(await page.locator('#view button').count()).toBe(3);
    await expect(page.locator('#view [data-try]')).toHaveCount(0);
    expect(await page.locator('.mode-go').allInnerTexts()).toEqual(['Start as Explorer', 'Start as Challenger', 'Start as Pro']);
    expect(await page.locator('#view a').evaluateAll(as => as.map(a => a.getAttribute('href')))).toEqual(['#/guide']);
    await expect(page.locator('header .mq-nav')).toBeHidden();
    await pickMode(page, 'pro');
    await expect(page.locator('.home-h')).toBeVisible();
    expect(await tabs(page)).toEqual(['Home', 'Learn', 'Arcade', 'Watch', 'Find']);
  });
});
