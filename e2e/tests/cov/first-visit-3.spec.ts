import { test, expect, APP, open } from '../fixtures';

/* first-visit spec, the Requirements of openspec change try-trick-in-modes: "The Mode picker shows the Modes, each with
   its Try a trick", "Try a trick inside each Mode", "Try a trick on Home", "Try a trick teaches its Sutra first",
   "Trying it", "The end of a Try a trick", "Try a trick is reachable by keyboard and screen reader" and "Try a trick
   holds still and says nothing new": one test per scenario. */
type Page = import('@playwright/test').Page;
const player = (page: Page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}'); return (p.list || []).find((x: any) => x.id === p.active) || p.list?.[0]; });
const progress = (page: Page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}'); return JSON.parse(localStorage.getItem('mathquest.v1.' + p.active) || '{}'); });
async function typeAnswer(page: Page, a: number) { await page.locator('#tyIn').fill(String(a)); await page.keyboard.press('Enter'); }
async function finishChallenger(page: Page) {
  await page.locator('#tyStart').click();
  for (const a of [625, 2025, 4225]) { await typeAnswer(page, a); await page.locator('#tyNext').click(); }
}

test.describe('a new visitor', () => {
  test.use({ seedMode: null });

  test('The cards still work: the Explorer card opens Explorer Home as before, and no Try a trick opens', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="explorer"]').click();
    await expect(page.locator('h1.home-h')).toHaveText('What do you want to play?');
    await expect(page).not.toHaveURL(/#\/try$/);
    expect((await player(page)).modeGuess).toBeUndefined();
  });

  test('The hero says little: the headline and the line, at most 14 words, with the Nikhilam Family and no button', async ({ page }) => {
    await page.goto(APP);
    const hero = page.locator('.mq-hero-t');
    await expect(hero.locator('h1')).toHaveText('Fast, fun math for every brain');
    await expect(hero.locator('p')).toHaveText(['One trick, two minutes, no sign-up.']);
    expect((await hero.innerText()).trim().split(/\s+/).length).toBeLessThanOrEqual(14);
    await expect(page.locator('.mq-hero-in button, .mq-hero-in a')).toHaveCount(0);
    await expect(page.getByRole('img', { name: 'The Nikhilam Family: the Devanagari digits one, zero and nine' })).toBeVisible();
  });

  test('Three Try a trick buttons: one under each Mode card, named with its Mode', async ({ page }) => {
    await page.goto(APP);
    await expect(page.getByRole('button', { name: /Try a trick/ })).toHaveCount(3);
    for (const m of ['explorer', 'challenger', 'pro']) await expect(page.locator(`.mode-opt:has(.mode-card[data-mode="${m}"]) [data-try="${m}"]`)).toHaveCount(1);
    for (const n of ['Explorer', 'Challenger', 'Pro']) await expect(page.getByRole('button', { name: `Try a trick as ${n}`, exact: true })).toBeVisible();
  });

  test('Above the fold on a phone: at 390 by 844 the Explorer Try a trick is on screen; at 320 to 1280 px nothing scrolls sideways and each is 44 px tall', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(APP);
    const b = (await page.locator('[data-try="explorer"]').boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(844);
    for (const w of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width: w, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
      for (const t of await page.locator('.mode-try').all()) expect((await t.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('Challenger from the picker: the Mode is Challenger and squares ending in 5 open, naming Ekādhikena Pūrveṇa', async ({ page }) => {
    await page.goto(APP);
    await page.locator('[data-try="challenger"]').click();
    await expect(page.locator('#tyH')).toHaveText('Square numbers ending in 5');
    await expect(page.locator('.try-sutra b')).toHaveText('Ekādhikena Pūrveṇa');
    expect((await player(page)).mode).toBe('challenger');
  });

  test('Pro from the picker: the Mode is Pro and multiplying near 100 opens, naming Nikhilaṃ Navataścaramaṃ Daśataḥ', async ({ page }) => {
    await page.goto(APP);
    await page.locator('[data-try="pro"]').click();
    await expect(page.locator('#tyH')).toHaveText('Multiply numbers near 100');
    await expect(page.locator('.try-sutra b')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
    expect((await player(page)).mode).toBe('pro');
  });

  test('Explorer from the picker: the Mode is Explorer and the 11 sandwich opens, naming Ūrdhva-Tiryagbhyām, with no Star, Belt or Star count', async ({ page }) => {
    await page.goto(APP);
    await page.locator('[data-try="explorer"]').click();
    await expect(page.locator('#tyH')).toHaveText('The 11 sandwich');
    await expect(page.locator('.try-sutra b')).toHaveText('Ūrdhva-Tiryagbhyām');
    expect((await player(page)).mode).toBe('explorer');
    expect(await page.locator('#tryRoot').innerText()).not.toMatch(/\bStars?\b|\bBelts?\b/);
  });

  test('Keyboard: Try a trick under the Pro card and Enter open the first question with its answer box focused; Enter checks it', async ({ page }) => {
    await page.goto(APP);
    await page.locator('[data-try="pro"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tyStart')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tyIn')).toBeFocused();
    await page.keyboard.type('9506');
    await page.keyboard.press('Enter');
    await expect(page.locator('#tySay')).toContainText('Right!');
  });
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });

  test('From Home: the Try a trick card opens the Pro Try a trick, and Play today\'s round was the only primary button', async ({ page }) => {
    await open(page);
    await expect(page.locator('#view .md-btn--primary')).toHaveText(["Play today's round"]);
    await page.locator('.try-card a').click();
    await expect(page.locator('#tyH')).toHaveText('Multiply numbers near 100');
  });

  test('Pro\'s card: Nikhilaṃ, all from 9 and the last from 10, each distance from 100, and 97 × 96 ending in 9312', async ({ page }) => {
    await open(page, '#/try');
    await expect(page.locator('.try-sutra .mq-sutra-mean')).toHaveText('All from 9 and the last from 10');
    await expect(page.locator('.try-why')).toContainText('each distance from 100');
    await expect(page.locator('.try-k')).toHaveText('Worked example: 97 × 96');
    await expect(page.locator('.try-steps .star-step').last()).toContainText('9312');
  });

  test('A miss teaches: a wrong answer for 98 × 97 shows the near-100 steps on 98 and 97, ending in 9506, with Next', async ({ page }) => {
    await open(page, '#/try');
    await page.locator('#tyStart').click();
    await expect(page.locator('#tyQ')).toHaveText('98 × 97 = ?');
    await typeAnswer(page, 1);
    await expect(page.locator('#tyShow .star-step').first()).toContainText('98');
    await expect(page.locator('#tyShow .star-step').last()).toContainText('So 98 × 97 = 9506.');
    await expect(page.locator('#tyNext')).toBeVisible();
  });

  test('Screen reader: the live region says Try a trick with the Trick\'s name, and the start button has focus', async ({ page }) => {
    await open(page, '#/try');
    await expect(page.locator('#vmLive')).toContainText('Try a trick: Multiply numbers near 100');
    await expect(page.locator('#tyStart')).toBeFocused();
  });
});

test.describe('Challenger', () => {
  test('Finished: after Try a trick Home has no Try a trick card, and Explorer Home then shows its own', async ({ page }) => {
    await open(page);
    await expect(page.locator('.try-card')).toHaveCount(1);
    await open(page, '#/try');
    await finishChallenger(page);
    await open(page, '#/');
    await expect(page.locator('.try-card')).toHaveCount(0);
    await open(page, '#/me');
    await page.locator('.mode-pick--sm .mode-card[data-mode="explorer"]').click();
    await open(page, '#/');
    await expect(page.locator('.try-card')).toContainText('The 11 sandwich');
  });

  test('Challenger\'s card: Ekādhikena Pūrveṇa, by one more than the one before, 35² in three steps ending in 1225, Your turn and no answer box', async ({ page }) => {
    await open(page, '#/try');
    await expect(page.locator('.try-sutra .mq-sutra-mean')).toHaveText('By one more than the one before');
    await expect(page.locator('.try-steps .star-step')).toHaveCount(3);
    await expect(page.locator('.try-steps .star-step').last()).toContainText('35² = 1225.');
    await expect(page.locator('#tyStart')).toHaveText('Your turn');
    await expect(page.locator('#tyIn')).toHaveCount(0);
  });

  test('A right answer: 625 for 25² is right with +10 Sparks, the Sparks go up by 10, and Next opens the next question', async ({ page }) => {
    await open(page, '#/try');
    const before = (await progress(page)).sparks || 0;
    await page.locator('#tyStart').click();
    await expect(page.locator('#tyQ')).toHaveText('252 = ?');
    await typeAnswer(page, 625);
    await expect(page.locator('#tySay')).toContainText('+10 Sparks');
    expect((await progress(page)).sparks).toBe(before + 10);
    await page.locator('#tyNext').click();
    await expect(page.locator('.try-q .star-tag')).toHaveText('Question 2 of 3');
  });

  test('The end: how many of 3, Play Star 1 to #/star/sq5/1, Back home, the Ekādhikena Pūrveṇa deep dive; Ratings, Stars and Keep going unchanged', async ({ page }) => {
    await open(page, '#/try');
    const before = await progress(page);
    await finishChallenger(page);
    await expect(page.locator('.try-end-n')).toContainText('3 of 3 right.');
    await expect(page.locator('#tyGoOn')).toHaveAttribute('href', '#/star/sq5/1');
    await expect(page.locator('#tyHome')).toHaveText('Back home');
    await expect(page.locator('#tySutra')).toHaveText('Read about Ekādhikena Pūrveṇa');
    const after = await progress(page);
    expect(after.ratings || {}).toEqual(before.ratings || {});
    expect(after.skills || {}).toEqual(before.skills || {});
    expect(after.sky || null).toEqual(before.sky || null);
    expect(after.last ?? null).toBe(before.last ?? null);
  });

  test.describe('Calm', () => {
    test.use({ reducedMotion: 'no-preference' });
    test('Calm: every step at once, the card waits, and a right answer draws no sparkles', async ({ page }) => {
      await page.addInitScript(() => { try { localStorage.setItem('vm.calm', '1'); } catch (e) { /* storage blocked */ } });
      await page.clock.install();
      await open(page, '#/try');
      await expect(page.locator('.try-steps .star-step')).toHaveCount(3);
      await page.clock.fastForward(120_000);
      await expect(page.locator('#tyStart')).toBeVisible();
      await page.locator('#tyStart').click();
      await typeAnswer(page, 625);
      await expect(page.locator('#tySay')).toContainText('Right!');
      expect(await page.locator('.fx-sparkles').count()).toBe(0);
    });
  });
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });

  test('Explorer\'s card: Ūrdhva-Tiryagbhyām, straight down and across, 23 split into 2 and 3 with 5 in the middle, ending in 253', async ({ page }) => {
    await open(page, '#/try');
    await expect(page.locator('.try-sutra .mq-sutra-mean')).toHaveText('Its name means straight down and across.');
    await expect(page.locator('.try-steps .star-step').first()).toContainText('Split 23 into 2 and 3.');
    await expect(page.locator('.try-steps .star-step').nth(1)).toContainText('2 + 3 = 5');
    await expect(page.locator('.try-steps .star-step').last()).toContainText('253');
  });

  test('Explorer tries again: a wrong middle number says Not quite. Try again!, turns that button off, and leaves two', async ({ page }) => {
    await open(page, '#/try');
    await page.locator('#tyStart').click();
    const wrong = page.locator('.pr-choice:not([data-v="7"])').first();
    await wrong.click();
    await expect(page.locator('#tySay')).toHaveText('Not quite. Try again!');
    await expect(wrong).toBeDisabled();
    await expect(page.locator('.pr-choice:not([disabled])')).toHaveCount(2);
  });

  test('Explorer\'s end: Back home and Do it again, and no Star', async ({ page }) => {
    await open(page, '#/try');
    await page.locator('#tyStart').click();
    for (const a of [7, 8, 5]) { await page.locator(`.pr-choice[data-v="${a}"]`).click(); await page.locator('#tyNext').click(); }
    await expect(page.locator('#tyGoOn')).toHaveText('Back home');
    await expect(page.locator('#tyAgain')).toHaveText('Do it again');
    expect(await page.locator('#tryRoot').innerText()).not.toMatch(/\bStar\b/);
  });

  test('Nothing new spoken: with Read aloud on, a miss and a right answer speak only the two recorded lines', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as any; w.__said = [];
      try { localStorage.setItem('vm.studioVoice', '0'); } catch (e) { /* storage blocked */ }
      const voice = { name: 'Samantha', lang: 'en-US', voiceURI: 'Samantha', localService: true, default: true };
      Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => [voice], pending: false, speaking: false, paused: false, speak(u: any) { w.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 0); }, cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {} }, configurable: true });
      class Utterance { text: string; voice: unknown = null; lang = ''; pitch = 1; rate = 1; volume = 1; onend: null | (() => void) = null; onerror = null; constructor(t: string) { this.text = t; } }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
    });
    await open(page, '#/try');
    await page.locator('#tyStart').click();
    await page.locator('.pr-choice:not([data-v="7"])').first().click();
    await expect.poll(() => page.evaluate(() => (window as any).__said.length)).toBeGreaterThanOrEqual(1);
    await page.locator('.pr-choice[data-v="7"]').click();
    await expect.poll(() => page.evaluate(() => (window as any).__said.length)).toBeGreaterThanOrEqual(2);
    const said: string[] = await page.evaluate(() => (window as any).__said);
    expect(said.join(" ").replace(/Not quite\.?|Try again!?|You got it!?/gi, "").trim()).toBe(""); /* the voice says each sentence as its own utterance */
  });
});
