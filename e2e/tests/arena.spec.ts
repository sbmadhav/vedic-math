import { test, expect, APP, open, cloudLog, heldClock, appErrors, typeAnswer, showWorld, needsWorldBoards, mod } from './fixtures';
import { fakeAudio } from './audio-fake';

/* Arena rounds start and take answers. Every test leaves before the 60 second round ends,
   so no score is ever submitted (and the fake SDK would record it if one were). */

test('daily round: countdown, keypad answer, then leaving stops the round with nothing posted', async ({ page }) => {
  await open(page, '#/arena');
  await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.g-best')).toContainText('League: Challenger');
  await page.locator('#arGo').click();
  await expect(page.locator('.ar-count')).toBeVisible();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
  await expect(page.locator('#arTime')).toHaveText(/^(60|59|58|57)$/);
  // Type on the on-screen keypad, then Go: the question moves on
  await page.locator('.ar-key[data-k="1"]').click();
  await page.locator('.ar-key[data-k="2"]').click();
  await expect(page.locator('#arEntry')).toHaveText('12');
  await page.locator('#arForm button').click();
  // A right answer pops "+10", a wrong one pops the correct answer
  await expect(page.locator('#arPop')).toHaveText(/^(\+\d+|-?\d+)$/);
  // Leave mid-round: the timer stops and nothing reaches any board
  await page.goto(`${APP}#/learn`);
  await expect(page.locator('#view h1')).toHaveText('Pick a level');
  await page.waitForTimeout(500);
  const log = await cloudLog(page);
  expect(log.writes).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.board') || '[]'))).toEqual([]);
});

test.describe('explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('practice round uses big tap choices', async ({ page }) => {
    await open(page, '#/arena');
    await page.locator('[data-t="practice"]').click();
    await expect(page.locator('[data-t="practice"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#arGo').click();
    const choices = page.locator('.ar-choice');
    await expect(choices.first()).toBeVisible({ timeout: 6000 });
    expect(await choices.count()).toBeGreaterThanOrEqual(2);
    await choices.first().click();
    await expect(page.locator('#arPop')).toHaveText(/^(\+\d+|-?\d+)$/);
    await page.goto(`${APP}#/`);
    expect((await cloudLog(page)).writes).toEqual([]);
  });
});

test.describe('a Player 13 or over', () => {
  test.use({ seedConsent: { age: 'adult' } });
test('the lobby shows today, this week and weekly Sparks boards; Show World board brings World and This device tabs', async ({ page }) => {
  await needsWorldBoards(page); // World boards off at launch (task 8.5): boards-off.spec.ts runs instead
  await open(page, '#/arena');
  await expect(page.locator('#arShell h2').filter({ hasText: 'Most Sparks this week' })).toBeVisible();
  await expect(page.locator('#arShell')).not.toContainText('XP');
  for (const id of ['#lbDay', '#lbWeek', '#lbSparks']) {
    await expect(page.locator(`${id} [data-src="device"]`)).toHaveAttribute('aria-selected', 'true');
    await showWorld(page, id);
    await page.locator(`${id} [data-src="device"]`).click();
    await expect(page.locator(`${id} [data-src="device"]`)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(`${id} .lb-body`)).toContainText('No scores yet');
  }
});
test('a World answer that arrives after This device was picked leaves the Device board showing', async ({ page }) => {
  await needsWorldBoards(page); // World boards off at launch (task 8.5): boards-off.spec.ts runs instead
  await page.addInitScript(() => {
    const w = globalThis as any;
    w.__e2eRows = [['u1', 'Late World Row', 900]];
    w.__e2eHold = new Promise(r => { w.__e2eRelease = r; });
  });
  await open(page, '#/arena');
  const day = page.locator('#lbDay');
  await day.locator('[data-show-world]').click();
  await expect(day.locator('.lb-body')).toContainText('Loading world scores');
  await day.locator('[data-src="device"]').click();
  await expect(day.locator('.lb-body')).toContainText('No scores yet');
  // The World read is waiting on the hold; let it answer now, after the pick
  await expect.poll(async () => (await cloudLog(page)).reads.length).toBeGreaterThanOrEqual(1);
  await page.evaluate(() => (globalThis as any).__e2eRelease());
  await page.waitForTimeout(300);
  await expect(day.locator('[data-src="device"]')).toHaveAttribute('aria-selected', 'true');
  await expect(day.locator('.lb-body')).toContainText('No scores yet');
  await expect(day.locator('.lb-body')).not.toContainText('Late World Row');
  // Picking World again shows the World rows
  await day.locator('[data-src="world"]').click();
  await expect(day.locator('.lb-body')).toContainText('Late World Row');
});
/* The World and This device tabs are the design system's segmented control (.md-seg; design audit fix plan, part A):
   the picked tab is filled with the scheme's ink. The served config has no Firebase project until task 8.5, so this
   test serves a stand-in config; the fake SDK answers every call and nothing leaves the page. */
for (const scheme of ['light', 'dark'] as const) {
  test(`the World and This device tabs are the design system's segmented control (${scheme})`, async ({ page }) => {
    const config = new URL(await mod(page, 'cloud-config'), 'http://x').pathname;
    await page.route(u => u.pathname === config, r => r.fulfill({ contentType: 'text/javascript', body: "export const FIREBASE = { apiKey: 'e2e', authDomain: 'e2e.invalid', projectId: 'e2e-fake', appId: 'e2e' };\nexport const appCheckSiteKey = '';\nexport const appCheckProvider = 'enterprise';\n" }));
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, '#/arena');
    const day = page.locator('#lbDay');
    await showWorld(page, '#lbDay');
    await expect(day.locator('.md-seg[role="tablist"] [role="tab"]')).toHaveCount(2);
    const [want, picked, other] = await page.evaluate(() => {
      const probe = document.createElement('i');
      probe.style.backgroundColor = 'var(--ink)'; probe.style.color = 'var(--bg)';
      document.body.append(probe);
      const p = getComputedStyle(probe), c = (s: string) => { const e = getComputedStyle(document.querySelector(`#lbDay ${s}`)!); return [e.backgroundColor, e.color]; };
      const out = [[p.backgroundColor, p.color], c('[data-src="world"]'), c('[data-src="device"]')];
      probe.remove();
      return out;
    });
    expect(picked).toEqual(want);
    expect(other).not.toEqual(want);
    await day.locator('[data-src="device"]').click();
    await expect(day.locator('[data-src="device"]')).toHaveCSS('background-color', want[0]);
    // A keyboard focus ring is drawn inside the tab, where the control's rounded edge does not clip it
    await page.keyboard.press('Tab');
    await day.locator('[data-src="world"]').focus();
    expect(await day.locator('[data-src="world"]').evaluate(e => e.matches(':focus-visible'))).toBe(true);
    await expect(day.locator('[data-src="world"]')).toHaveCSS('outline-offset', '-3px');
    // On the picked tab's ink fill the ring takes the page background, so it stays visible in both schemes
    await day.locator('[data-src="device"]').focus();
    await expect(day.locator('[data-src="device"]')).toHaveCSS('outline-color', want[1]);
  });
}
});

test('challenge tower: challenge 1 starts and takes an answer', async ({ page }) => {
  await open(page, '#/challenge/1');
  await page.locator('#chGo').click();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
  const choice = page.locator('.ar-choice').first();
  if (await choice.count()) await choice.click();
  else { await page.locator('.ar-key[data-k="7"]').click(); await page.locator('#arForm button').click(); }
  // Right pops "+N"; wrong shows the answer underneath
  await expect.poll(async () => `${await page.locator('#arPop').textContent()}${await page.locator('#arFix').textContent()}`).toMatch(/^\+\d+$|Answer:/);
  await page.goto(`${APP}#/tower`);
  expect((await cloudLog(page)).writes).toEqual([]);
});

/* A tower question about a picture ("How many dots are there?") shows the picture, with its text alternative, in
   every Mode, not only Explorer (Muse review, item 5). Challenge 1's set is seeded and starts with a ten frame. */
test.describe('a Challenger in the tower', () => {
  test.use({ seedMode: 'challenger' });
  test('a picture question shows its picture and names it for a screen reader', async ({ page }) => {
    await open(page, '#/challenge/1');
    const first = await page.evaluate(async () => { const LV = await e2eMod('levels'); return LV.challengeSet(LV.challenge(1))[0]; });
    expect(first.viz, 'challenge 1 still starts with a picture question').toMatch(/<svg/);
    await page.locator('#chGo').click();
    await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
    const pic = page.locator('#arViz svg[role="img"]');
    await expect(pic).toBeVisible();
    await expect(pic).toHaveAttribute('aria-label', /\S/);
    await page.goto(`${APP}#/tower`);
    expect((await cloudLog(page)).writes).toEqual([]);
  });
});

/* The Duel became Party Mode (openspec play-experiences); its tests live in play.spec.ts */

/* view-lifecycle spec: rounds run under their own signal, so a second round on the same page handles each
   tap once. page.clock runs the 60 second rounds in milliseconds; Practice rounds never post a score. */
/* Jumps past the end of a 60 second round, then lets a frame or two run so the round clock sees it */
async function endRound(page: import('@playwright/test').Page) {
  await page.clock.fastForward(61_000);
  await page.clock.runFor(100);
}
async function practiceRound(page: import('@playwright/test').Page) {
  await page.locator('[data-t="practice"]').click();
  await page.locator('#arGo').click();
  await page.clock.runFor(2200); // the 3, 2, 1 countdown
  await expect(page.locator('#arQ')).not.toBeEmpty();
}

test('second Arena round: keypad taps 1 then 2 enter 12', async ({ page, issues }) => {
  await heldClock(page);
  await open(page, '#/arena');
  await practiceRound(page);
  await endRound(page);
  await expect(page.locator('.play-shell .ar-result')).toBeVisible();
  await page.locator('#arDone').click(); // the result shows in the play shell; Back to the Arena
  await practiceRound(page);
  await page.locator('.ar-key[data-k="1"]').click();
  await page.locator('.ar-key[data-k="2"]').click();
  await expect(page.locator('#arEntry')).toHaveText('12');
  expect((await cloudLog(page)).writes).toEqual([]);
  expect(appErrors(issues), 'console errors').toEqual([]);
});

test.describe('explorer, second round', () => {
  test.use({ seedMode: 'explorer' });
  test('one tap answers exactly one question', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/arena');
    await practiceRound(page);
    await endRound(page);
    await expect(page.locator('.play-shell .ar-result')).toBeVisible();
    await page.locator('#arDone').click();
    await practiceRound(page);
    await page.locator('.ar-choice').first().click();
    await expect(page.locator('#arPop')).toHaveText(/^(\+\d+|-?\d+)$/);
    await endRound(page);
    await expect(page.locator('.ar-result p').first()).toHaveText(/^(1 right · 0 missed|0 right · 1 missed)/);
    expect((await cloudLog(page)).writes).toEqual([]);
  });
});

test.describe('explorer, toast over the choices', () => {
  test.use({ seedMode: 'explorer' });
  /* A "Badge earned" toast sits at the bottom of a phone screen, over the answer choices; it must not swallow taps */
  test('a tap on a choice under a toast still answers', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/arena');
    await practiceRound(page);
    await page.evaluate(async () => {
      const fx = await e2eMod('fx');
      fx.toast('<b>Badge earned:</b> a long toast that covers the bottom of a small screen', 'win');
    });
    const toast = page.locator('.fx-toast');
    await expect(toast).toBeVisible();
    /* Where the toast lands depends on the screen and the round's layout (toastSide moves it up off the choices), so pin it over the first choice */
    const choice = page.locator('.ar-choice').first();
    const c = (await choice.boundingBox())!;
    await page.evaluate(y => { const box = document.querySelector('.fx-toasts') as HTMLElement; box.style.top = 'auto'; box.style.bottom = `${innerHeight - y}px`; }, c.y + c.height);
    const t = (await toast.boundingBox())!;
    expect(t.y < c.y + c.height / 2 && t.y + t.height > c.y + c.height / 2, 'the toast covers the choice').toBe(true);
    await choice.click();
    await expect(page.locator('#arPop')).toHaveText(/^(\+\d+|-?\d+)$/);
    expect((await cloudLog(page)).writes).toEqual([]);
  });
});

test('challenge tower: Play again, then one keypad tap enters one digit', async ({ page }) => {
  await heldClock(page);
  await open(page, '#/challenge/1');
  await page.locator('#chGo').click();
  await page.clock.runFor(2000);
  await expect(page.locator('#arQ')).not.toBeEmpty();
  await endRound(page); // challenge 1 is a 60 second Sprint
  await page.locator('.lv-result [data-retry]').click();
  await page.locator('#chGo').click();
  await page.clock.runFor(2000);
  await expect(page.locator('#arQ')).not.toBeEmpty();
  for (let k = 0; k < 30 && !(await page.locator('.ar-key').count()); k++) await page.locator('.ar-choice').first().click();
  await page.locator('.ar-key[data-k="7"]').click();
  await expect(page.locator('#arEntry')).toHaveText('7');
  expect((await cloudLog(page)).writes).toEqual([]);
});

/* Pro Arena: mental arithmetic, identical daily rounds and adaptive Practice rounds (arena and ratings specs) */
const MENTAL = /^(\d+ × \d+ = \?|\d+2 = \?|What is \d+(\.5)?% of \d+\?|\d+ ÷ \d+ = \?)$/;
/* Works out the answer to a Pro Arena question from its text */
function mentalAnswer(text: string) {
  let m;
  if ((m = /^(\d+) × (\d+) = \?$/.exec(text))) return +m[1] * +m[2];
  if ((m = /^(\d+) ÷ (\d+) = \?$/.exec(text))) return +m[1] / +m[2];
  if ((m = /^What is (\d+(?:\.5)?)% of (\d+)\?$/.exec(text))) return Math.round(+m[1] * 10 * +m[2]) / 1000;
  if ((m = /^(\d+)2 = \?$/.exec(text))) return +m[1] * +m[1];
  throw new Error('not a Pro Arena question: ' + text);
}
/* A Player's saved progress before the page loads (only on a fresh profile, like the fixtures' Player) */
async function seedProgress(page: import('@playwright/test').Page, id: string, data: Record<string, unknown>) {
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [`mathquest.v1.${id}`, JSON.stringify(data)] as const);
}
const savedRating = (page: import('@playwright/test').Page, key: string) =>
  page.evaluate(async k => (await e2eMod('store')).rating(k) as number, key);

test.describe('pro', () => {
  test.use({ seedMode: 'pro' });

  test('Practice round starts at the Arena Rating, adapts, and the lobby shows the new Rating', async ({ page, issues }) => {
    await seedProgress(page, 'p1', { ratings: { 'arena:pro': 15 } });
    await heldClock(page);
    await open(page, '#/arena');
    await expect(page.locator('#arRating')).toHaveAttribute('data-rating', '15');
    await expect(page.locator('#arRating')).toContainText('Arena Rating: 15/20');
    await practiceRound(page);
    const q = page.locator('#arQ');
    await expect(q).toHaveAttribute('data-d', '15');
    // Six right answers in a row: the questions get harder
    for (let k = 0; k < 6; k++) {
      const text = (await q.textContent()) || '';
      expect(text).toMatch(MENTAL);
      await typeAnswer(page, String(mentalAnswer(text)));
      await page.locator('#arForm button').click();
      await expect(q).not.toHaveText(text);
    }
    expect(Number(await q.getAttribute('data-d'))).toBeGreaterThan(15);
    await endRound(page);
    await expect(page.locator('.ar-result')).toContainText('6 right · 0 missed');
    await expect(page.locator('.ar-result')).toContainText(/Arena Rating up to (1[6-9]|20)\./);
    await page.locator('#arDone').click();
    const after = await savedRating(page, 'arena:pro');
    expect(after).toBeGreaterThan(15);
    await expect(page.locator('#arRating')).toHaveAttribute('data-rating', String(Math.round(after)));
    // Practice rounds never leave the device
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.board') || '[]'))).toEqual([]);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });

  test('a new Pro Player starts Practice at difficulty 9', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/arena');
    await expect(page.locator('#arRating')).toHaveAttribute('data-rating', '9');
    await practiceRound(page);
    await expect(page.locator('#arQ')).toHaveAttribute('data-d', '9');
  });

  test('the daily round deals the same questions to two Players with different Arena Ratings', async ({ page }) => {
    // A date after the switch to mental arithmetic (MENTAL_FROM, Monday 2026-10-19), the same for both Players
    await page.clock.setFixedTime(new Date('2026-10-21T10:00:00'));
    await seedProgress(page, 'p1', { ratings: { 'arena:pro': 3 } });
    await seedProgress(page, 'p2', { ratings: { 'arena:pro': 18 } });
    const firstQuestions = async () => {
      await open(page, '#/arena');
      await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
      await page.locator('#arGo').click();
      const q = page.locator('#arQ');
      await expect(q).not.toBeEmpty({ timeout: 6000 });
      const seen: string[] = [];
      for (let k = 0; k < 3; k++) {
        const text = (await q.textContent()) || '';
        expect(text).toMatch(MENTAL);
        seen.push(`${await q.getAttribute('data-d')} ${text}`);
        await typeAnswer(page, String(mentalAnswer(text)));
        await page.locator('#arForm button').click();
        await expect(q).not.toHaveText(text);
      }
      await page.goto(`${APP}#/learn`); // leave before the round ends: nothing is posted
      return seen;
    };
    const one = await firstQuestions();
    expect(one[0].startsWith('6 '), 'the daily ramp starts at 6 whatever the Rating').toBe(true);
    // A second Player on this device with a much higher Arena Rating
    await page.evaluate(() => {
      const P = JSON.parse(localStorage.getItem('vm.players')!);
      P.list.push({ id: 'p2', name: 'Calm Otter 17', avatar: 'sky', mode: 'pro', created: Date.now() }); P.active = 'p2';
      localStorage.setItem('vm.players', JSON.stringify(P));
    });
    await page.reload();
    const two = await firstQuestions();
    expect(two).toEqual(one);
    expect(await savedRating(page, 'arena:pro')).toBe(18);
    expect((await cloudLog(page)).writes).toEqual([]);
  });

  test('before the switch day, the Pro daily round keeps the old questions for this week\'s Boards', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-15T10:00:00'));
    await open(page, '#/arena');
    await page.locator('#arGo').click();
    await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
    // Old Pro daily items are skill questions with no difficulty step
    await expect(page.locator('#arQ')).not.toHaveAttribute('data-d', /.*/);
    const expected = await page.evaluate(async () => (await e2eMod('arena')).dailySet('pro', '2026-10-15')[0].q as string);
    const html = await page.evaluate(h => { const d = document.createElement('div'); d.innerHTML = h; return d.innerHTML; }, expected);
    expect(await page.locator('#arQ').innerHTML()).toBe(html);
    await page.goto(`${APP}#/learn`);
    expect((await cloudLog(page)).writes).toEqual([]);
  });
});

/* Untimed Arena Practice (openspec game-shell-and-calm, arena spec): 20 questions, no clock, Finish at any time,
   never posted. With Calm on it is the default, and the lobby says the daily challenge keeps its clock. */
test('Practice, no clock: no timer, ends after 20 answers, nothing is posted', async ({ page, issues }) => {
  await open(page, '#/arena');
  await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#arCalmNote')).toHaveCount(0);
  await page.locator('[data-t="untimed"]').click();
  await expect(page.locator('[data-t="untimed"]')).toHaveText('Practice, no clock');
  await page.locator('#arGo').click();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
  await expect(page.locator('#arTime')).toHaveCount(0);
  await expect(page.locator('.ar-bar')).toHaveCount(0);
  await expect(page.locator('#arNum')).toHaveText('1/20');
  for (let k = 0; k < 20; k++) {
    if (k < 19) await expect(page.locator('#arNum')).toHaveText(`${k + 1}/20`);
    await page.locator('.ar-key[data-k="1"]').click();
    await page.locator('#arForm button').click();
  }
  await expect(page.locator('.play-shell .ar-result')).toContainText('Practice rounds do not count for the leaderboard.');
  const [, right, missed] = (await page.locator('.play-shell .ar-result .md-stat p').textContent())!.match(/^(\d+) right · (\d+) missed/)!;
  expect(Number(right) + Number(missed), 'every one of the 20 answers counted').toBe(20);
  await page.locator('#arDone').click();
  await expect(page.locator('#arGo')).toBeFocused();
  expect((await cloudLog(page)).writes.filter(w => /^boards\/(daily|week)-/.test(w.path))).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.board') || '[]'))).toEqual([]);
  expect(appErrors(issues), 'console errors').toEqual([]);
});

test('Practice, no clock: Finish ends the round at once', async ({ page }) => {
  await open(page, '#/arena');
  await page.locator('[data-t="untimed"]').click();
  await page.locator('#arGo').click();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
  await page.locator('.ar-key[data-k="4"]').click();
  await page.locator('#arForm button').click();
  await expect(page.locator('#arNum')).toHaveText('2/20');
  await page.locator('#arFinish').click();
  await expect(page.locator('.play-shell .ar-result .md-stat p')).toHaveText(/^(1 right · 0 missed|0 right · 1 missed)/);
  expect((await cloudLog(page)).writes).toEqual([]);
});

test.describe('Calm on', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('vm.calm', '1')); });
  test('the lobby picks Practice, no clock, and says the daily challenge is a timed race', async ({ page }) => {
    await open(page, '#/arena');
    await expect(page.locator('[data-t="untimed"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#arCalmNote')).toHaveText('The daily challenge is a timed race for everyone. Practice has no clock in Calm.');
    // The daily challenge keeps its clock in Calm
    await page.locator('[data-t="daily"]').click();
    await expect(page.locator('#arCalmNote')).toBeVisible();
    await page.locator('#arGo').click();
    await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
    await expect(page.locator('#arTime')).toHaveText(/^(60|59|58|57)$/);
    await page.locator('#arStop').click();
    // A timed Practice round loses its clock in Calm
    await page.locator('[data-t="practice"]').click();
    await page.locator('#arGo').click();
    await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
    await expect(page.locator('#arTime')).toHaveCount(0);
    await expect(page.locator('#arNum')).toHaveText('1/20');
    await page.locator('#arStop').click();
    expect((await cloudLog(page)).writes).toEqual([]);
  });
});

/* Timers by Reading band (openspec change age-bands, task 4.4): a Growing Player's Arena Practice keeps its clock as a bar
   with no tick sound; an Early Challenger's daily round keeps the Challenger keypad and 60 second clock, as a bar with no
   ticks; a Player with no band hears the countdown ticks (the sound spy works). Sound is on for these, through the fake
   Web Audio engine of audio-fake.ts, which records every oscillator: a tick is the 1000 Hz square. */
const ticks = (page: import('@playwright/test').Page) => page.evaluate(() => ((window as any).__audio.nodes as { kind: string; frequency: { value: number } }[]).filter(n => n.kind === 'osc' && n.frequency.value === 1000).length);
const soundOn = (page: import('@playwright/test').Page) => page.addInitScript(() => { try { localStorage.setItem('vm.sound', '1'); } catch (e) { /* blocked */ } });

test.describe('a Growing Challenger', () => {
  test.use({ seedPlayer: { reading: { grade: '3', at: 1 } } });
  test('Arena Practice has its clock as a bar, the seconds for screen readers only, and no tick sound', async ({ page }) => {
    await soundOn(page); await fakeAudio(page);
    await open(page, '#/arena');
    await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-t="practice"]').click();
    await page.locator('#arGo').click();
    await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
    await expect(page.locator('.ar')).toHaveClass(/ar--bar/);
    await expect(page.locator('.ar-bar')).toBeVisible();
    await expect(page.locator('#arTime')).toBeAttached();
    await expect(page.locator('.ar-time')).toHaveClass(/md-sr-only/); // for screen readers only
    await expect(page.locator('.ar-pad')).toBeVisible();
    expect(await ticks(page)).toBe(0);
    await page.goto(`${APP}#/learn`);
    expect((await cloudLog(page)).writes).toEqual([]);
  });
});

test.describe('an Early Challenger', () => {
  test.use({ seedPlayer: { reading: { grade: 'k', at: 1 } } });
  test('the daily round keeps the Challenger keypad and clock length, drawn as a bar with no ticks; Practice has no clock and 3 choices', async ({ page }) => {
    await soundOn(page); await fakeAudio(page);
    await open(page, '#/arena');
    await expect(page.locator('[data-t="untimed"]')).toHaveAttribute('aria-pressed', 'true'); // Practice, no clock comes first
    await expect(page.locator('#arCalmNote')).toHaveText('The daily race has a clock. Practice has no clock.');
    await page.locator('[data-t="daily"]').click();
    await page.locator('#arGo').click();
    await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
    await expect(page.locator('.ar-pad')).toBeVisible();
    await expect(page.locator('.ar-choice')).toHaveCount(0);
    await expect(page.locator('.ar-bar')).toBeVisible();
    await expect(page.locator('#arTime')).toHaveText(/^(60|59|58|57|56)$/);
    await expect(page.locator('.ar-time')).toHaveClass(/md-sr-only/); // for screen readers only
    expect(await ticks(page)).toBe(0);
    await page.locator('#arStop').click(); // leave the round with nothing posted
    await page.locator('[data-t="untimed"]').click();
    await page.locator('#arGo').click();
    await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
    await expect(page.locator('.ar-choice')).toHaveCount(3);
    await expect(page.locator('.ar-bar')).toHaveCount(0);
    await expect(page.locator('#arNum')).toHaveText('1/20');
    expect((await cloudLog(page)).writes).toEqual([]);
  });
});

test('a Player with no band hears the countdown ticks', async ({ page }) => {
  await soundOn(page); await fakeAudio(page);
  await open(page, '#/arena');
  await page.locator('#arGo').click();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
  expect(await ticks(page)).toBeGreaterThan(0);
  await expect(page.locator('#arTime')).toBeVisible();
  await page.goto(`${APP}#/learn`);
});
