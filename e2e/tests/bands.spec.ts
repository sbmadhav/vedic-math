import AxeBuilder from '@axe-core/playwright';
import { test, expect, APP, open, chromiumOnly, type Page } from './fixtures';

/* Reading bands (openspec change age-bands; reading-bands, band-copy, placement and star-round deltas): the grade
   question on a first visit, the home card and Me for an existing Player, the Mode picker's Suggested tag, and what each
   band changes on the Legacy views: tap answers and 3 choices for Early in every Mode, 4 for Growing, band copy on Home,
   the Sky and in Practice, and nothing sent. The Grade answer is read from the Player record on this device. */

const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path + ' ' + title); };`;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);
const player = (page: Page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}'); return (p.list || []).find((x: any) => x.id === p.active) || p.list?.[0]; });
const dlg = (page: Page) => page.locator('dialog.vm-grade');
/* A fake speech engine that records every utterance (nothing is heard) */
async function recordSpeech(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__said = [];
    try { localStorage.setItem('vm.studioVoice', '0'); } catch (e) { /* blocked */ }
    const voice = { name: 'Samantha', lang: 'en-US', voiceURI: 'Samantha', localService: true, default: true };
    const fake = { getVoices: () => [voice], pending: false, speaking: false, paused: false, speak(u: any) { w.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 0); }, cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    class Utterance { text: string; voice: unknown = null; lang = ''; pitch = 1; rate = 1; volume = 1; onend: null | (() => void) = null; onerror = null; constructor(t: string) { this.text = t; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
  });
}
const said = (page: Page) => page.evaluate(() => (window as any).__said as string[]);

test.describe('a first visit', () => {
  test.use({ seedMode: null, gradeAsked: false });
  test.beforeEach(async ({ page }) => { await page.route(/\/js\/analytics\.js(\?.*)?$/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: STUB })); });

  test('the grade question comes before the Mode picker: the cards wait unpainted; Skip saves no answer and the picker shows with no tag', async ({ page, issues }) => {
    await recordSpeech(page);
    await page.goto(APP);
    await expect(dlg(page)).toBeVisible();
    await expect(dlg(page).locator('h2')).toHaveText('What grade are you in?');
    await expect(dlg(page).locator('[data-grade]')).toHaveCount(15);
    await expect(dlg(page).locator('[data-grade]').first()).toHaveText('Pre-K');
    await expect(dlg(page).locator('[data-grade]').last()).toHaveText('Grown-up');
    await expect(dlg(page).locator('#gqBolt')).toHaveText('A grown-up can help.');
    await expect(dlg(page)).not.toContainText(/read aloud|button|easier|harder|band|level/i);
    // The cards keep their place but are not painted while the question is open
    await expect(page.locator('.mode-pick')).toHaveClass(/mode-pick--wait/);
    await expect(page.locator('.mode-card').first()).toBeHidden();
    expect(await page.locator('.mode-pick').boundingBox()).not.toBeNull();
    // Nothing is spoken until the speaker button is tapped; one tap reads the question, the next the choices
    expect(await said(page)).toEqual([]);
    await dlg(page).locator('#gqHear').click();
    await expect.poll(async () => (await said(page)).join(' ')).toBe('What grade are you in? A grown-up can help.');
    const asked = (await said(page)).length;
    await dlg(page).locator('#gqHear').click();
    await expect.poll(async () => (await said(page)).slice(asked).join(' ')).toContain('Pre-K, K, 1, 2');
    // Tell my age instead swaps the buttons, and back
    await dlg(page).locator('#gqSwap').click();
    await expect(dlg(page).locator('h2')).toHaveText('How old are you?');
    await expect(dlg(page).locator('[data-age]')).toHaveCount(16);
    await expect(dlg(page).locator('[data-age]').first()).toHaveText('3');
    await dlg(page).locator('#gqSwap').click();
    await expect(dlg(page).locator('[data-grade]')).toHaveCount(15);
    // Skip: no answer saved, the picker shows, nothing suggested, and the question is not asked again
    await dlg(page).locator('#gqSkip').click();
    await expect(dlg(page)).toHaveCount(0);
    await expect(page.locator('.mode-pick')).not.toHaveClass(/mode-pick--wait/);
    await expect(page.locator('.mode-card').first()).toBeVisible();
    await expect(page.locator('.mode-sugg')).toHaveCount(0);
    expect((await player(page)).reading).toBeUndefined();
    expect((await player(page)).readingCard).toBe('done');
    await page.reload();
    await expect(page.locator('.mode-card').first()).toBeVisible();
    await expect(dlg(page)).toHaveCount(0);
    expect((await events(page)).filter(e => /\b(grade|age|band|reading)\b/i.test(e))).toEqual([]);
    expect(issues.console).toEqual([]);
  });

  test('grade 1 tags Explorer Suggested, nothing is preselected and Pro can still be chosen; the answer is on the device only', async ({ page }) => {
    await page.goto(APP);
    await dlg(page).locator('[data-grade="1"]').click();
    await expect(dlg(page)).toHaveCount(0);
    await expect(page.locator('.mode-card[data-mode="explorer"] .mode-sugg')).toHaveText('Suggested');
    await expect(page.locator('.mode-sugg')).toHaveCount(1);
    await expect(page.locator('.mode-card[aria-pressed="true"]')).toHaveCount(0);
    await expect(page.locator('.mode-card')).toHaveCount(3);
    await expect(page.locator('#pickHear')).toBeVisible(); // an Early reader's speaker button over the cards
    expect((await player(page)).reading).toMatchObject({ grade: '1' });
    expect((await player(page)).age).toBeUndefined();
    await expect(page.locator('body')).toHaveClass(/band-early/);
    await page.locator('.mode-card[data-mode="pro"]').click();
    await expect(page.locator('h1.home-h')).toHaveText('What do you want to play?'); // the Early heading, in Pro
    await expect(page.locator('.mode-line b')).toHaveText('Pro');
    await expect(page.locator('#readingCard')).toHaveCount(0);
    expect((await events(page)).filter(e => /\b(grade|age|band|reading|early)\b/i.test(e))).toEqual([]);
  });

  test('age 10 tags Challenger and sets the Age answer; Grown-up tags Pro', async ({ page }) => {
    await page.goto(APP);
    await dlg(page).locator('#gqSwap').click();
    await dlg(page).locator('[data-age="10"]').click();
    await expect(page.locator('.mode-card[data-mode="challenger"] .mode-sugg')).toHaveText('Suggested');
    const p = await player(page);
    expect(p.reading).toMatchObject({ age: 10 });
    expect(p.age).toBe(10); // an age given here is the Age answer too (decision 8)
    await expect(page.locator('body')).toHaveClass(/band-fluent/);
    // A second device: Grown-up by age
    await page.evaluate(() => localStorage.clear());
    await page.goto(APP);
    await dlg(page).locator('#gqSwap').click();
    await dlg(page).locator('[data-age="adult"]').click();
    await expect(page.locator('.mode-card[data-mode="pro"] .mode-sugg')).toHaveText('Suggested');
    expect((await player(page)).age).toBe('adult');
  });

  test('Escape is Skip, and a new Player added in Me gets the question before their Mode pick', async ({ page }) => {
    await page.goto(APP);
    await page.keyboard.press('Escape');
    await expect(dlg(page)).toHaveCount(0);
    await page.locator('.mode-card[data-mode="challenger"]').click();
    await expect(page.locator('h1.home-h')).toBeVisible();
    await page.goto(`${APP}#/me`);
    await page.locator('#meAdd').click();
    await expect(dlg(page)).toBeVisible();
    await expect(page.locator('.mode-pick')).toHaveClass(/mode-pick--wait/);
    await dlg(page).locator('[data-grade="k"]').click();
    await expect(page.locator('.mode-card[data-mode="explorer"] .mode-sugg')).toBeVisible();
    expect((await player(page)).reading).toMatchObject({ grade: 'k' });
  });
});

test.describe('an existing Player', () => {
  test.use({ gradeAsked: false });

  test('the home card appears once; Not now retires it and Me still offers the question', async ({ page }) => {
    await open(page);
    const card = page.locator('#readingCard');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Help Bolt talk your way');
    await card.locator('#readingLater').click();
    await expect(card).toHaveCount(0);
    expect((await player(page)).readingCard).toBe('done');
    await open(page);
    await expect(page.locator('#readingCard')).toHaveCount(0);
    await open(page, '#/me');
    await expect(page.locator('#readingNote')).toContainText('No grade or age given');
    await expect(page.locator('#readingChange')).toHaveText('Answer the grade question');
    await expect(page.locator('#readingClear')).toHaveCount(0);
  });

  test('the card opens the question; Me shows the help in words, and Change and Clear take effect on the next question', async ({ page }) => {
    await open(page);
    await page.locator('#readingAsk').click();
    await expect(dlg(page)).toBeVisible();
    await dlg(page).locator('[data-grade="k"]').click();
    await expect(dlg(page)).toHaveCount(0);
    await expect(page.locator('#readingCard')).toHaveCount(0);
    await expect(page.locator('body')).toHaveClass(/band-early/);
    await open(page, '#/me');
    await expect(page.locator('#readingNote')).toContainText('Reading help: lots (Kindergarten).');
    await expect(page.locator('#readingNote')).toContainText('A grade or age, if given, stays on this device and only changes how much reading help Bolt gives');
    await expect(page.locator('#readingNote')).not.toContainText(/early|growing|fluent/i);
    await page.locator('#readingChange').click();
    await dlg(page).locator('[data-grade="3"]').click();
    await expect(page.locator('#readingNote')).toContainText('Reading help: some (Grade 3).');
    await expect(page.locator('body')).toHaveClass(/band-growing/);
    // The next Practice question follows the Growing band: 4 choices for a Growing Challenger, no tapping for words
    await open(page, '#/skill/3-mult');
    await expect(page.locator('#practice .ans-in')).toBeVisible();
    await expect(page.locator('#practice .pr-choice')).toHaveCount(0);
    await open(page, '#/me');
    await page.locator('#readingClear').click();
    await expect(page.locator('#readingNote')).toContainText('No grade or age given');
    await expect(page.locator('body')).toHaveClass(/band-none/);
    expect((await player(page)).reading).toBeUndefined();
    await open(page, '#/skill/3-mult');
    await expect(page.locator('#practice .ans-in')).toBeVisible();
  });
});

/* Practice by band (reading-bands "Answers and choices by band", band-copy "Early variant") */
test.describe('an Early Pro', () => {
  test.use({ seedMode: 'pro', seedPlayer: { reading: { grade: 'k', at: 1 } } });
  test('3-mult shows 3 big buttons and no text field; a miss says the early line; 9-expand still gets the text field', async ({ page }) => {
    await open(page, '#/skill/3-mult');
    const box = page.locator('#practice');
    await expect(box.locator('.pr-choice')).toHaveCount(3);
    await expect(box.locator('.ans-in')).toHaveCount(0);
    const q = (await box.locator('#prQ').textContent()) || '';
    const [a, b] = q.match(/\d+/g)!.map(Number);
    const right = String(a * b);
    await expect(box.locator(`.pr-choice[data-v="${right}"]`)).toHaveCount(1);
    const big = await box.locator('.pr-choice').first().boundingBox();
    expect(big!.height).toBeGreaterThanOrEqual(84);
    await box.locator('.pr-choice').filter({ hasNotText: new RegExp(`^${right}$`) }).first().click();
    await expect(box.locator('#prSay')).toContainText('Try again!');
    await expect(box.locator('#prSay')).not.toContainText('Not quite. Try once more.');
    await expect(box.locator('[data-hint]')).toHaveText('Hint?');
    await open(page, '#/skill/9-expand');
    await expect(page.locator('#practice .ans-in')).toBeVisible();
    await expect(page.locator('#practice .pr-choice')).toHaveCount(0);
  });
  test('Home in Pro reads the Early lines and shows the read-aloud button; the Mode and League stay Pro', async ({ page }) => {
    await open(page);
    await expect(page.locator('h1.home-h')).toHaveText('What do you want to play?');
    await expect(page.locator('.mode-line b')).toHaveText('Pro');
    await expect(page.locator('.dojo-card .door-line')).toHaveText('A sutra is a math rule. A Star is four questions.');
    await expect(page.locator('#voiceBtn')).toBeVisible();
    await expect(page.locator('#voiceBtn')).toContainText('Read aloud: on');
    await open(page, '#/arena');
    await expect(page.locator('.g-best')).toContainText('League: Pro');
  });
});

test.describe('a Growing Explorer', () => {
  test.use({ seedMode: 'explorer', seedPlayer: { reading: { age: 8, at: 1 } } });
  test('a whole-number question shows 4 buttons, and the Mode copy stays where there is no growing variant', async ({ page }) => {
    await open(page, '#/skill/k-add10');
    await expect(page.locator('#practice .pr-choice')).toHaveCount(4);
    await open(page);
    await expect(page.locator('h1.home-h')).toHaveText('What do you want to play?');
    await expect(page.locator('body')).toHaveClass(/band-growing/);
  });
});

/* One line per screen for each band (task 4.6) */
for (const [band, reading, heading, door, sky] of [
  ['early', { grade: '1' }, 'What do you want to play?', 'A sutra is a math rule. A Star is four questions.', 'Pick any Star.'],
  ['growing', { grade: '3' }, 'Learn a sutra, then use it', 'A sutra is a short rule that does a sum in one line. A Star is four quick questions on one trick.', 'Every Star is open, so pick any one.'],
  ['fluent', { grade: '9' }, 'Learn a sutra, then use it', 'A sutra is a short rule that does a whole sum in a line or two. A Star is a two-minute round of four questions on one of its tricks.', 'Every Star is open, so pick any one.'],
] as const) {
  test.describe(`a ${band} Challenger`, () => {
    test.use({ seedPlayer: { reading: { ...reading, at: 1 } } });
    test(`Home, the Sky and the tour read the ${band} lines`, async ({ page }) => {
      await open(page);
      await expect(page.locator('body')).toHaveClass(new RegExp(`band-${band}`));
      await expect(page.locator('h1.home-h')).toHaveText(heading);
      await expect(page.locator('.dojo-card .door-line')).toHaveText(door);
      await page.evaluate(async () => (await e2eMod('store')).updatePlayer({ sky: true }));
      await page.goto(`${APP}#/me`);
      await page.goto(`${APP}#/`);
      await expect(page.locator('#skyNext')).toContainText(sky);
      await expect(page.locator('#skyNext')).toContainText(band === 'early' ? 'Bolt picks' : 'Bolt suggests');
    });
  });
}

/* The Tour's cards keep their Listen button (the Legacy tour, js/tour.js, has one on every card, so an Early reader has
   the speaker the plan asks for; task 4.6) */
test.describe('an Early Challenger on the tour', () => {
  test.use({ tourSeen: false, seedPlayer: { reading: { grade: 'k', at: 1 } } });
  test('each card has a speaker button', async ({ page }) => {
    await open(page);
    const tour = page.locator('dialog.vm-tour[open]');
    await expect(tour).toBeVisible();
    await expect(tour.locator('.listen-btn')).toBeVisible();
    await expect(tour.locator('.listen-btn')).toHaveAttribute('aria-label', 'Listen: this step');
  });
});

/* Accessibility (task 4.7): the grade question, an Early Practice question and an Early Star question in both schemes have
   no serious or critical axe violations; Early's buttons are at least 44 px and the question reflows at 320 px */
async function serious(page: Page) {
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
  return res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.slice(0, 5).map(n => n.target.join(' ')).join(' | ')}`);
}
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} scheme`, () => {
    test.use({ colorScheme: scheme });
    test.describe('the grade question', () => {
      test.use({ seedMode: null, gradeAsked: false });
      test('over the Mode picker has no serious or critical axe violations, and reflows at 320 px with 44 px buttons', async ({ page }, testInfo) => {
        chromiumOnly(testInfo);
        await page.goto(APP);
        await expect(dlg(page)).toBeVisible();
        expect(await serious(page)).toEqual([]);
        await page.setViewportSize({ width: 320, height: 700 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
        for (const b of await dlg(page).locator('button').all()) { const r = (await b.boundingBox())!; expect(r.height, 'a 44 px target').toBeGreaterThanOrEqual(44); }
      });
    });
    test.describe('an Early Pro', () => {
      test.use({ seedMode: 'pro', seedPlayer: { reading: { grade: 'k', at: 1 } } });
      test('a Practice question and a Star question have no serious or critical axe violations; every button is at least 44 px', async ({ page }, testInfo) => {
        chromiumOnly(testInfo);
        await open(page, '#/skill/3-mult');
        await expect(page.locator('#practice .pr-choice')).toHaveCount(3);
        await page.waitForLoadState('networkidle');
        expect(await serious(page)).toEqual([]);
        for (const b of await page.locator('#practice .pr-choice, #practice .md-btn').all()) { const r = (await b.boundingBox())!; expect(r.height).toBeGreaterThanOrEqual(44); }
        await open(page, '#/star/sq5/1');
        await expect(page.locator('#stMain .star-choice')).toHaveCount(3);
        expect(await serious(page)).toEqual([]);
        for (const b of await page.locator('#stMain .star-choice').all()) { const r = (await b.boundingBox())!; expect(r.height).toBeGreaterThanOrEqual(44); }
      });
    });
  });
}
