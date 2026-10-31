import { test, expect, APP, open, appErrors, type Page, atRoute, pathTo } from './fixtures';

/* Try a trick inside each Mode (openspec try-trick-in-modes): a Try a trick under each Mode card on the Mode picker and
   a card on each Mode's Home; each Mode's lesson teaches one Sutra on a worked example, then asks three questions,
   then ends with the next step. Analytics is stubbed so the fixed events can be checked and nothing counts. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);
const player = (page: Page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}'); return (p.list || []).find((x: any) => x.id === p.active) || p.list?.[0]; });
const progress = (page: Page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}'); return JSON.parse(localStorage.getItem('mathquest.v1.' + p.active) || '{}'); });
/* A typed answer, then Enter (Challenger and Pro) */
async function typeAnswer(page: Page, a: string | number) {
  await expect(page.locator('#tyIn')).toBeFocused();
  await page.locator('#tyIn').fill(String(a));
  await page.keyboard.press('Enter');
}
const ANSWERS = { challenger: [625, 2025, 4225], pro: [9506, 9024, 10918], explorer: [7, 8, 5] };

test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

test.describe('the Mode picker', () => {
  test.use({ seedMode: null });

  /* The three Mode cards are the picker's only buttons; each Mode's Try a trick waits on its Home (openspec change play-nav-by-mode) */
  test('no Try a trick on the picker: three Mode cards, each ending in Start as its Mode', async ({ page, issues }) => {
    await page.goto(APP);
    await expect(page.locator('.pick-h')).toHaveText('Pick who is playing');
    await expect(page.locator('#tryBtn')).toHaveCount(0);
    await expect(page.locator('.mq-hero-t button, .mq-hero-t a')).toHaveCount(0);
    for (const [i, m] of (['Explorer', 'Challenger', 'Pro'] as const).entries()) {
      const card = page.locator('.mode-pick .mode-card').nth(i);
      await expect(card.locator('b')).toHaveText(m);
      await expect(card.locator('.mode-go')).toHaveText(`Start as ${m}`);
    }
    await expect(page.getByRole('button', { name: /Try a trick/ })).toHaveCount(0);
    expect(appErrors(issues)).toEqual([]);
  });

  for (const [w, h] of [[320, 568], [375, 667], [390, 844], [768, 1024], [1280, 720]] as const) {
    test(`at ${w}x${h} nothing scrolls sideways and every Mode card is at least 44 px tall`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(APP);
      for (const b of await page.locator('.mode-pick .mode-card').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
      if (w === 390) { const b = (await page.locator('.mode-card[data-mode="explorer"] .mode-go').boundingBox())!; expect(b.y + b.height).toBeLessThanOrEqual(h); }
    });
  }

  test('Challenger: picks the Mode with no guess, counts it, and teaches Ekādhikena Pūrveṇa on 35²', async ({ page, issues }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="challenger"]').click(); await page.locator('[data-try-open]').click(); /* the picker's card, then Home's Try a trick card (openspec change play-nav-by-mode) */
    await expect(page).toHaveURL(atRoute('#/try'));
    await expect(page.locator('#tyH')).toHaveText('Square numbers ending in 5');
    await expect(page.locator('.try-sutra b')).toHaveText('Ekādhikena Pūrveṇa');
    await expect(page.locator('.try-sutra .sutra-tag-m')).toHaveText('By one more than the one before');
    await expect(page.locator('.try-sutra .say-btn')).toBeVisible();
    await expect(page.locator('.try-k')).toHaveText('Worked example: 352');
    await expect(page.locator('.try-steps .star-step')).toHaveCount(3);
    await expect(page.locator('.try-steps .star-step').last()).toContainText('35² = 1225.');
    await expect(page.locator('.try-src')).toContainText("Bharati Krishna Tirtha's 1965 book");
    await expect(page.locator('#tyStart')).toHaveText('Your turn');
    await expect(page.locator('#tyStart')).toBeFocused();
    await expect(page.locator('#tyIn')).toHaveCount(0);
    const p = await player(page);
    expect(p.mode).toBe('challenger');
    expect(p.modeGuess).toBeUndefined();
    const ev = await events(page);
    expect(ev.filter(e => e.startsWith('math/try/'))).toEqual(['math/try/start', 'math/try/mode/challenger']);
    expect(ev.filter(e => e.startsWith('math/mode/'))).toEqual(['math/mode/challenger']);
    expect(ev.slice(ev.indexOf('math/try/mode/challenger')).find(e => e.startsWith('math/view/'))).toBe('math/view/try');
    expect(ev.join(' ')).not.toContain('Swift');
    expect(appErrors(issues)).toEqual([]);
  });

  test('Pro by keyboard: Enter on the Pro card, Enter on Home\'s Try a trick, Enter to start, the answer box takes focus and Enter checks', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="pro"]').focus();
    await page.keyboard.press('Enter');
    await page.locator('[data-try-open]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tyH')).toHaveText('Multiply numbers near 100');
    await expect(page.locator('.try-sutra b')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
    await expect(page.locator('.try-sutra .sutra-tag-m')).toHaveText('All from 9 and the last from 10');
    await expect(page.locator('.try-why')).toContainText('distance from 100');
    await expect(page.locator('.try-steps .star-step').last()).toContainText('So 97 × 96 = 9312.');
    await expect(page.locator('#tyStart')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.try-q .star-tag')).toHaveText('Question 1 of 3');
    await expect(page.locator('#tyQ')).toHaveText('98 × 97 = ?');
    await typeAnswer(page, 9506);
    await expect(page.locator('#tySay')).toContainText('Right!');
    await expect(page.locator('#tyNext')).toBeFocused();
    expect((await player(page)).mode).toBe('pro');
  });

  test('Explorer: the 11 sandwich under Ūrdhva-Tiryagbhyām, three big buttons, and no Star anywhere', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="explorer"]').click(); await page.locator('[data-try-open]').click(); /* the picker's card, then Home's Try a trick card (openspec change play-nav-by-mode) */
    await expect(page.locator('#tyH')).toHaveText('The 11 sandwich');
    await expect(page.locator('.try-sutra b')).toHaveText('Ūrdhva-Tiryagbhyām');
    await expect(page.locator('.try-sutra .sutra-tag-m')).toHaveText('Its name means straight down and across.');
    await expect(page.locator('.try-steps .star-step').first()).toContainText('Split 23 into 2 and 3.');
    await expect(page.locator('.try-steps .star-step').last()).toContainText('23 × 11 = 253.');
    await expect(page.locator('#tyStart')).toHaveText('My turn');
    await page.locator('#tyStart').click();
    await expect(page.locator('#tyQ')).toHaveText('34 × 11');
    await expect(page.locator('#tyQ')).toBeFocused();
    await expect(page.locator('.try-choices .pr-choice')).toHaveCount(3);
    const answers = ANSWERS.explorer;
    for (const a of answers) { await page.locator(`.pr-choice[data-v="${a}"]`).click(); await page.locator('#tyNext').click(); }
    await expect(page.locator('.try-end #tyQ')).toHaveText('You did it!');
    await expect(page.locator('#tyGoOn')).toHaveText('Back home');
    await expect(page.locator('#tyAgain')).toHaveText('Do it again');
    expect(await page.locator('#view').innerText()).not.toMatch(/\bStars?\b|\bBelts?\b/);
    expect((await player(page)).mode).toBe('explorer');
  });
});

test.describe('Challenger', () => {
  test('a right answer earns 10 Sparks; the end card offers Star 1, Back home and the deep dive; nothing else changes', async ({ page, issues }) => {
    await open(page, '#/try');
    const before = await progress(page);
    await page.locator('#tyStart').click();
    await expect(page.locator('#tyQ')).toHaveText('252 = ?');
    await typeAnswer(page, 625);
    await expect(page.locator('#tySay')).toContainText('Right! 25 squared = 625. +10 Sparks');
    expect((await progress(page)).sparks).toBe((before.sparks || 0) + 10);
    await page.locator('#tyNext').click();
    await typeAnswer(page, 2025); await page.locator('#tyNext').click();
    await typeAnswer(page, 4225); await page.locator('#tyNext').click();
    await expect(page.locator('.try-end #tyQ')).toHaveText('Trick learned!');
    await expect(page.locator('.try-end-n')).toContainText('3 of 3 right.');
    await expect(page.locator('#tyGoOn')).toHaveAttribute('href', pathTo('#/star/sq5/1'));
    await expect(page.locator('#tyHome')).toHaveAttribute('href', '#/');
    await expect(page.locator('#tySutra')).toHaveAttribute('href', pathTo('#/sutras/s1'));
    const after = await progress(page);
    expect(after.sparks).toBe((before.sparks || 0) + 30);
    expect(after.skills || {}).toEqual(before.skills || {});
    expect(after.ratings || {}).toEqual(before.ratings || {});
    expect(after.last ?? null).toBe(before.last ?? null);
    expect(after.sky?.lit || {}).toEqual({});
    expect((await events(page)).filter(e => e.startsWith('math/q_answered/'))).toEqual(['math/q_answered/try/right', 'math/q_answered/try/right', 'math/q_answered/try/right']);
    expect(appErrors(issues)).toEqual([]);
  });

  test('Play Star 1 from the end card opens the sq5 Star, and its Back goes home', async ({ page }) => {
    await open(page, '#/try');
    await page.locator('#tyStart').click();
    for (const a of ANSWERS.challenger) { await typeAnswer(page, a); await page.locator('#tyNext').click(); }
    await page.locator('#tyGoOn').click();
    await expect(page).toHaveURL(atRoute('#/star/sq5/1'));
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await page.locator('#stExit').click();
    await expect(page.locator('h1.home-h')).toHaveText('Learn a sutra, then use it');
  });

  test('Home shows the Try a trick card after the doors, with no primary button, until it is finished', async ({ page }) => {
    await open(page);
    const card = page.locator('.try-card');
    await expect(card).toContainText('Square numbers ending in 5');
    await expect(page.locator('#view .md-btn--primary')).toHaveText(['Play this Star']);
    const doors = (await page.locator('.home-doors').boundingBox())!, c = (await card.boundingBox())!;
    expect(c.y).toBeGreaterThanOrEqual(doors.y + doors.height);
    await card.getByRole('link', { name: 'Try a trick' }).click();
    await expect(page.locator('#tyH')).toHaveText('Square numbers ending in 5');
    expect((await events(page)).filter(e => e.startsWith('math/try/'))).toEqual(['math/try/start', 'math/try/mode/challenger']);
    await page.locator('#tyStart').click();
    for (const a of ANSWERS.challenger) { await typeAnswer(page, a); await page.locator('#tyNext').click(); }
    await page.locator('#tyHome').click();
    await expect(page.locator('h1.home-h')).toBeVisible();
    await expect(page.locator('.try-card')).toHaveCount(0);
    // Explorer has its own Try a trick, not finished yet: its card shows after the picture tiles
    await open(page, '#/me');
    await page.locator('.mode-pick--sm .mode-card[data-mode="explorer"]').click();
    await open(page, '#/');
    await expect(page.locator('.try-card')).toContainText('The 11 sandwich');
    const tiles = (await page.locator('.play-grid--big').boundingBox())!, e = (await page.locator('.try-card').boundingBox())!;
    expect(e.y).toBeGreaterThanOrEqual(tiles.y + tiles.height);
    await expect(page.locator('.play-grid--big .play-tile')).toHaveCount(8);
  });
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });
  test('a miss shows the near-100 steps on that question\'s numbers, ending in the answer, then Next', async ({ page }) => {
    await open(page, '#/try');
    await page.locator('#tyStart').click();
    await typeAnswer(page, 9000);
    await expect(page.locator('#tySay')).toContainText('Not quite. It is 9506.');
    await expect(page.locator('#tyShow .star-step').first()).toContainText('98 is −2 from it and 97 is −3.');
    await expect(page.locator('#tyShow .star-step').last()).toContainText('So 98 × 97 = 9506.');
    await expect(page.locator('#tyNext')).toHaveText('Next question');
    await expect(page.locator('#tyIn')).toBeDisabled();
    expect((await events(page)).filter(e => e.startsWith('math/q_answered/'))).toEqual(['math/q_answered/try/miss']);
  });

  test('Home: the card button opens the Pro Try a trick, and Play this Star stays the only primary button (the Sutra door leads since openspec change sutras-first)', async ({ page }) => {
    await open(page);
    await expect(page.locator('#view .md-btn--primary')).toHaveText(['Play this Star']);
    await page.locator('.try-card a').click();
    await expect(page.locator('#tyH')).toHaveText('Multiply numbers near 100');
  });

  test('Escape on the card starts, as Enter does', async ({ page }) => {
    await open(page, '#/try');
    await expect(page.locator('#tyStart')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.try-q .star-tag')).toHaveText('Question 1 of 3');
    await expect(page.locator('#tyIn')).toBeFocused();
  });

  test('the card is announced once in the polite live region', async ({ page }) => {
    await open(page, '#/try');
    await expect(page.locator('#vmLive')).toHaveText('Try a trick: Multiply numbers near 100. A worked example, then Your turn.');
    await expect(page.locator('#vmLive')).toHaveAttribute('aria-live', 'polite');
  });
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });

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

  test('a wrong tap: "Not quite. Try again!", that button off; a second miss shows the sum and the answer; nothing new is spoken', async ({ page }) => {
    await recordSpeech(page);
    await open(page, '#/try');
    await page.locator('#tyStart').click();
    const wrong = page.locator('.pr-choice:not([data-v="7"])');
    await wrong.first().click();
    await expect(page.locator('#tySay')).toHaveText('Not quite. Try again!');
    await expect(wrong.first()).toBeDisabled();
    await expect(page.locator('.pr-choice:not([disabled])')).toHaveCount(2);
    await wrong.nth(1).click();
    await expect(page.locator('#tySay')).toHaveText('It is 7. 3 + 4 = 7. So 34 × 11 = 374.');
    await expect(page.locator('.try-sw-mid')).toHaveText('7');
    await page.locator('#tyNext').click();
    await page.locator('.pr-choice[data-v="8"]').click();
    await expect(page.locator('#tySay')).toContainText('Yes! 2 + 6 = 8. So 26 × 11 = 286.');
    await expect.poll(() => page.evaluate(() => (window as any).__said.length)).toBeGreaterThanOrEqual(2);
    const said: string[] = await page.evaluate(() => (window as any).__said);
    expect(said.join(" ").replace(/Not quite\.?|Try again!?|You got it!?/gi, "").trim()).toBe(""); /* the voice says each sentence as its own utterance */
  });
});

for (const [what, key] of [['Calm', 'vm.calm'], ['Pause motion', 'motion-paused']] as const) {
  test.describe(`with ${what} on`, () => {
    test.use({ reducedMotion: 'no-preference' });
    test('every step shows at once, the card waits for its button, and a right answer draws no sparkles', async ({ page }) => {
      await page.addInitScript(k => { try { localStorage.setItem(k, '1'); } catch (e) { /* storage blocked */ } }, key);
      await page.clock.install();
      await open(page, '#/try');
      await expect(page.locator('.try-steps .star-step')).toHaveCount(3);
      expect(await page.locator('.try-steps .star-step').first().evaluate(e => getComputedStyle(e).animationName)).toBe('none');
      await page.clock.fastForward(300_000);
      await expect(page.locator('#tyStart')).toBeVisible();
      await page.locator('#tyStart').click();
      await typeAnswer(page, 625);
      await expect(page.locator('#tySay')).toContainText('Right!');
      expect(await page.locator('.fx-sparkles').count()).toBe(0);
    });
  });
}

test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('a right answer flies a few sparkles that remove themselves', async ({ page }) => {
    await open(page, '#/try');
    await page.locator('#tyStart').click();
    await typeAnswer(page, 625);
    await expect(page.locator('.fx-sparkles')).toHaveCount(1);
    await expect(page.locator('.fx-sparkles')).toHaveCount(0, { timeout: 3000 });
  });
});

test.describe('a record with a Mode guess from before', () => {
  test.use({ seedPlayer: { modeGuess: true } });
  test('the guess is still named on Home until a pick clears it', async ({ page }) => {
    await open(page);
    await expect(page.locator('.mode-line')).toContainText('Mode: Challenger, our guess for a first try');
    await open(page, '#/me');
    await page.locator('.mode-pick--sm .mode-card[data-mode="pro"]').click();
    await open(page, '#/');
    await expect(page.locator('.mode-line')).toHaveText(/Mode: Pro Change$/);
  });
});

test.describe('the Sky as Home', () => {
  test.use({ seedMode: 'challenger', seedPlayer: { sky: true } });
  test('the Sky Home shows the Try a trick card after the Sky until it is finished, and its button counts a start', async ({ page }) => {
    await open(page);
    await expect(page.locator('#skyHome')).toBeVisible();
    const card = page.locator('.try-card');
    await expect(card).toContainText('Square numbers ending in 5');
    await card.getByRole('link', { name: 'Try a trick' }).click();
    await expect(page.locator('#tyH')).toHaveText('Square numbers ending in 5');
    expect((await events(page)).filter(e => e.startsWith('math/try/'))).toEqual(['math/try/start', 'math/try/mode/challenger']);
    await page.locator('#tyStart').click();
    for (const a of ANSWERS.challenger) { await typeAnswer(page, a); await page.locator('#tyNext').click(); }
    await page.locator('#tyHome').click();
    await expect(page.locator('#skyHome')).toBeVisible();
    await expect(page.locator('.try-card')).toHaveCount(0);
  });
});
