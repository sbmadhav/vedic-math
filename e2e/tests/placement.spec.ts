import { test, expect, APP, open, appErrors, cloudLog, type Page, type Mode, atRoute, pathTo } from './fixtures';

/* Placement (openspec placement): the offer after the Mode pick, Skip, the untimed climb with Explorer's three big buttons
   and the usual entry elsewhere, the result in steps (never a grade), what the level sets (Practice starts, the Skill
   map's Suggested for you, Explorer's Start here tile, Bolt's start Belt), the card for existing Players, raise-only,
   Retake, Me and the parent note, and that nothing leaves the device. Analytics is stubbed so events can be read back.
   The climb is seeded (window.__vmSeed) so a scripted run gets the same questions every time; the right answer comes from
   the app's own engine (e2eMod('placement'), driven in the page with the same seed), never guessed. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;
const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as any).__events || []);
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}'));
const player = (page: Page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}'); return (p.list || []).find((x: any) => x.id === p.active) || p.list?.[0]; });
const seeded = (page: Page, seed = 7) => page.addInitScript(s => { (window as any).__vmSeed = s; }, seed);

const step = (page: Page) => page.locator('#plStep');

test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

/* ---------- The offer after the Mode pick (3.1) ---------- */
test.describe('a new visitor', () => {
  test.use({ seedMode: null });

  test('picking Challenger shows the Placement offer before Home, with Start and Skip, just play; Skip lands Home with nothing saved', async ({ page, issues }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="challenger"]').click();
    await expect(page).toHaveURL(atRoute('#/placement'));
    await expect(page.locator('#plH')).toHaveText('Want to find your level?');
    await expect(page.locator('.place-lede')).toHaveText('About 3 minutes. No clock.');
    await expect(page.locator('#plStart')).toHaveText('Start');
    await expect(page.locator('#plSkip')).toHaveText('Skip, just play');
    await expect(page.locator('#plH')).toBeFocused();
    expect((await events(page)).filter(e => e.startsWith('math/view/'))).toEqual(['math/view/pick-mode', 'math/view/placement']);
    await page.locator('#plSkip').click();
    await expect(page.locator('h1.home-h')).toHaveText('Learn a sutra, then use it');
    const d = await saved(page);
    expect(d.placement).toBeUndefined();
    expect(d.placementCard).toBe('done');
    expect((await events(page)).filter(e => e.startsWith('math/placement/'))).toEqual([]);
    await expect(page.locator('.place-home')).toHaveCount(0);
    // the offer does not come back on its own
    await page.goto(`${APP}#/learn`); await page.goto(`${APP}#/`);
    await expect(page.locator('h1.home-h')).toBeVisible();
    await expect(page).not.toHaveURL(/placement/);
    expect(appErrors(issues)).toEqual([]);
  });

  test('Skip as Pro: the first Arena Practice round starts at 9, as before', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="pro"]').click();
    await page.locator('#plSkip').click();
    await expect(page.locator('h1.home-h')).toHaveText('Mental math, the sutra way');
    await open(page, '#/arena');
    await expect(page.locator('#arRating')).toHaveAttribute('data-rating', '9');
  });

  test('a first-time visitor opening #/placement meets the Mode picker, and the offer follows the pick', async ({ page }) => {
    await page.goto(`${APP}#/placement`);
    await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
    await page.locator('.mode-card[data-mode="explorer"]').click();
    await expect(page.locator('#plH')).toHaveText('Want to find your level?');
    await expect(page.locator('body')).toHaveClass(/mode-explorer/);
  });

  test('leaving mid-climb saves nothing, and Home shows no offer and no card', async ({ page }) => {
    await page.goto(APP);
    await page.locator('.mode-card[data-mode="challenger"]').click();
    await page.locator('#plStart').click();
    await expect(step(page)).toHaveText('Step 1');
    await page.locator('#plUnsure').click(); /* one miss: the climb goes on */
    await expect(page.locator('#plSay')).toHaveText("Let's try a different one.");
    await page.goto(`${APP}#/`);
    await expect(page.locator('h1.home-h')).toBeVisible();
    const d = await saved(page);
    expect(d.placement).toBeUndefined();
    expect(d.placementCard).toBe('done');
    await expect(page.locator('.place-home')).toHaveCount(0);
  });
});

test('a new Player added in Me gets the Mode picker, then the offer', async ({ page }) => {
  await open(page, '#/me');
  await page.locator('#meAdd').click();
  await page.locator('dialog.vm-grade #gqSkip').click(); // the grade question comes first (openspec change age-bands)
  await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
  await page.locator('.mode-card[data-mode="explorer"]').click();
  await expect(page.locator('#plH')).toHaveText('Want to find your level?');
});

/* ---------- The climb (3.2, 3.3, 3.4) ---------- */
/** Runs a scripted climb from the offer: fn(i) says whether answer i is right. Reads the right answer through the app's
    own engine: the test re-plays the same seeded draw with the module, question by question. */
async function climbWith(page: Page, mode: Mode, script: boolean[], seed = 7, { start = true } = {}) {
  // The engine, driven in the page with the same seed, gives the test each question's answer as the climb goes
  if (start) {
    await page.evaluate(async ([m, s]) => {
      const P = await e2eMod('placement');
      const w = window as any; w.__plEngine = { st: null, P, rand: P.rng(s), mode: m };
    }, [mode, seed] as const);
    await page.locator('#plStart').click();
  }
  for (let i = 0; i < script.length; i++) {
    await expect(step(page)).toBeVisible();
    const right: string = await page.evaluate(() => {
      const w = window as any, E = w.__plEngine;
      if (!E.st) E.st = E.P.placementStart({ mode: E.mode, rand: E.rand });
      const p = E.mode === 'explorer' ? E.P.asChoice(E.st.current.p, E.rand) : E.st.current.p;
      E.p = p; return String(p.answer);
    });
    const choices = page.locator('#plMain .pr-choice');
    if (await choices.count()) {
      const esc = right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const ok = choices.filter({ hasText: new RegExp(`^${esc}$`) }), wrong = choices.filter({ hasNotText: new RegExp(`^${esc}$`) });
      await (script[i] ? ok : wrong).first().click();
    } else {
      await page.locator('#plIn').fill(script[i] ? right : '999999');
      await page.locator('#plCheck').click();
    }
    await page.evaluate(ok => { const w = window as any, E = w.__plEngine; E.st = E.P.placementAnswer(E.st, ok); }, script[i]);
  }
}

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer' });

  test('every question has exactly 3 big buttons, one right, and no text field; a miss shows a neutral line and no answer; reaching grade 6 still shows 3 buttons', async ({ page }) => {
    await seeded(page);
    await open(page, '#/placement');
    await climbWith(page, 'explorer', [true, true, true, true, true, true]); // K to 5 right: the next question is grade 6
    await expect(step(page)).toHaveText('Step 7');
    await expect(page.locator('#plMain .pr-choice')).toHaveCount(3);
    await expect(page.locator('#plMain input')).toHaveCount(0);
    await expect(page.locator('.star-pad, .star-key')).toHaveCount(0);
    const values = await page.locator('#plMain .pr-choice').allTextContents();
    expect(new Set(values).size).toBe(3);
    const right: string = await page.evaluate(() => { const E = (window as any).__plEngine; E.p = E.P.asChoice(E.st.current.p, E.rand); return String(E.p.answer); }); /* the seventh question, as the engine draws it */
    expect(values).toContain(right);
    // a miss: a neutral line, the answer never shown, the next question on the same step from another Skill
    const miss = page.locator('#plMain .pr-choice').filter({ hasNotText: new RegExp(`^${right}$`) }).first();
    await miss.click();
    await expect(page.locator('#plSay')).toHaveText("Let's try a different one.");
    expect(await page.locator('#plSay').textContent()).not.toContain(right);
    await expect(step(page)).toHaveText('Step 7');
    await expect(page.locator('#plMain .pr-choice')).toHaveCount(3);
  });

  test('no clock: after five minutes the question still waits', async ({ page }) => {
    await seeded(page);
    await page.clock.install();
    await open(page, '#/placement');
    await page.locator('#plStart').click();
    await expect(step(page)).toHaveText('Step 1');
    await page.clock.fastForward(300_000);
    await expect(step(page)).toHaveText('Step 1');
    await expect(page.locator('#plMain .pr-choice')).toHaveCount(3);
    await expect(page.locator('.ar-count, .g-timer, .star-clock')).toHaveCount(0);
  });

  test('the result in steps, never a grade; Explorer Home then starts with a Start here tile that opens a Skill of the level; the Skill map suggests around it', async ({ page }) => {
    await seeded(page);
    await open(page, '#/placement');
    await climbWith(page, 'explorer', [true, true, true, false, false]); // K, 1, 2 right, two misses at 3: grade 2, 3 steps
    await expect(page.locator('#plH')).toHaveText('You climbed 3 steps!');
    await expect(page.locator('.place-lede')).toHaveText('Bolt will start you there.');
    const text = (await page.locator('#view').innerText()).toLowerCase();
    expect(text).not.toMatch(/grade|test|missed/);
    await expect(page.locator('#plH')).toBeFocused();
    const d = await saved(page);
    expect(d.placement).toMatchObject({ grade: '2', steps: 3 });
    expect(d.counts?.answers || 0).toBe(0);
    expect(d.sparks || 0).toBe(0);
    expect((await events(page)).filter(e => e.startsWith('math/placement/'))).toEqual(['math/placement/done']);
    expect((await events(page)).filter(e => /q_answered|first_win/.test(e))).toEqual([]);
    await page.locator('#plGo').click();
    await expect(page.locator('h1.home-h')).toHaveText('What do you want to play?');
    const first = page.locator('.play-grid--big .play-tile').first();
    await expect(first).toHaveText(/Start here/);
    await expect(first).toHaveAttribute('href', new RegExp(`^${APP}skill/2-`));
    await expect(page.locator('.play-grid--big .play-tile')).toHaveCount(9);
    await open(page, '#/learn');
    await expect(page.locator('.mq-strand').first()).toHaveText('Suggested for you');
    expect(await page.locator('.mq-strand').first().locator('+ .mq-grades .mq-grade-n').allTextContents()).toEqual(['1', '2', '3']);
  });
});

test.describe('a seeded Explorer at grade 3', () => {
  test.use({ seedMode: 'explorer', seedProgress: { v: 3, skills: {}, placement: { grade: '3', steps: 4, at: 1_700_000_000_000 } } });
  test('Home shows Start here first, opening a grade 3 Skill; Endless practice in Make ten starts at 5 while a Ranked round starts at 1', async ({ page }) => {
    await open(page);
    const first = page.locator('.play-grid--big .play-tile').first();
    await expect(first).toContainText('Start here');
    await expect(first).toHaveAttribute('href', new RegExp(`^${APP}skill/3-`));
    await first.click();
    await expect(page.locator('.mq-crumbs')).toContainText('Grade 3');
    // Practice reads the level when there is no Rating; a Ranked round keeps Explorer's start (ADR 0007)
    const [practice, ranked] = await page.evaluate(async () => { const A = await e2eMod('adapt'); return [A.rating('game:make-ten', 'explorer', 0, { practice: true }), A.rating('game:make-ten', 'explorer')]; });
    expect(practice).toBe(5); expect(ranked).toBe(1);
  });
});

test.describe('a seeded Challenger at grade 6', () => {
  test.use({ seedProgress: { v: 3, skills: {}, placement: { grade: '6', steps: 3, at: 1_700_000_000_000 } } });
  test('the Skill map lists grades 5, 6 and 7 under Suggested for you; 4-mult2 practice starts at level 2; Me shows about grade 6 with Retake', async ({ page }) => {
    await open(page, '#/learn');
    await expect(page.locator('.mq-strand').first()).toHaveText('Suggested for you');
    expect(await page.locator('.mq-strand').first().locator('+ .mq-grades .mq-grade-n').allTextContents()).toEqual(['5', '6', '7']);
    await open(page, '#/skill/4-mult2');
    await expect(page.locator('#practice #prQ')).toHaveAttribute('data-level', '2');
    await open(page, '#/me');
    await expect(page.locator('#mePlace')).toContainText('Placement: about grade 6');
    await expect(page.locator('#mePlaceGo')).toHaveText('Retake');
    await expect(page.locator('#mePlaceGo')).toHaveAttribute('href', pathTo('#/placement'));
  });
});

test('an unplaced Challenger still sees Suggested for Challenger, and Me offers Find your level', async ({ page }) => {
  await open(page, '#/learn');
  await expect(page.locator('.mq-strand').first()).toHaveText('Suggested for Challenger');
  await open(page, '#/me');
  await expect(page.locator('#mePlace')).toContainText('No Placement yet');
  await expect(page.locator('#mePlaceGo')).toHaveText('Find your level');
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });
  test('a Pro gets the one answer box and Check, no big buttons; the first question is grade 8; Hear it is a button', async ({ page }) => {
    await seeded(page);
    await open(page, '#/placement');
    await page.locator('#plStart').click();
    await expect(step(page)).toHaveText('Step 1');
    await expect(page.locator('#plIn')).toBeVisible();
    await expect(page.locator('#plCheck')).toHaveText('Check');
    await expect(page.locator('#plHear')).toHaveText(/Hear it$/);
    await expect(page.locator('#plUnsure')).toHaveText("I'm not sure");
    const grade = await page.evaluate(async () => { const P = await e2eMod('placement'); const st = P.placementStart({ mode: 'pro', rand: P.rng(7) }); return String(st.current.grade); });
    expect(grade).toBe('8');
    // I'm not sure counts as a miss and shows no answer
    await page.locator('#plUnsure').click();
    await expect(page.locator('#plSay')).toHaveText("Let's try a different one.");
    await expect(step(page)).toHaveText('Step 1');
  });
});

/* ---------- Existing Players: the card, raise-only, Retake (3.5) ---------- */
test.describe('an existing Challenger with progress', () => {
  test.use({ seedProgress: { v: 3, skills: {}, sparks: 40, counts: { answers: 4 }, ratings: { 'game:times-sprint': 12, 'game:make-ten': 2, 'arena:challenger': 3, 'skill:3-mult': 2 }, medals: { 'g:times-sprint:1': 2 } } });

  test('Home shows the Find your level card once: Not now retires it, and Me still offers Find your level', async ({ page }) => {
    await open(page);
    const card = page.locator('.place-home');
    await expect(card).toBeVisible();
    await expect(card.locator('#placeStart')).toHaveAttribute('href', pathTo('#/placement'));
    await expect(page.locator('#view .md-btn--primary')).toHaveCount(1); // the card's Start is not a primary button
    await card.locator('#placeNotNow').click();
    await expect(page.locator('.place-home')).toHaveCount(0);
    await page.reload(); await expect(page.locator('h1.home-h')).toBeVisible();
    await expect(page.locator('.place-home')).toHaveCount(0);
    await open(page, '#/me');
    await expect(page.locator('#mePlaceGo')).toHaveText('Find your level');
  });

  test('a climb to grade 5 raises Make ten from 2 to 7 and leaves Times sprint at 12 and the Medal as it was; a lower retake changes no Rating', async ({ page }) => {
    await seeded(page);
    await open(page, '#/placement');
    await climbWith(page, 'challenger', [true, true, true, false, false]); // 3, 4, 5 right, two misses at 6
    await expect(page.locator('#plH')).toHaveText('You climbed 3 steps!');
    let d = await saved(page);
    expect(d.placement).toMatchObject({ grade: '5', steps: 3 });
    expect(d.ratings['game:make-ten']).toBe(7);
    expect(d.ratings['game:times-sprint']).toBe(12);
    expect(d.ratings['arena:challenger']).toBe(7);
    expect(d.ratings['skill:3-mult']).toBe(10); // a grade 3 Skill below the level
    expect(d.medals).toEqual({ 'g:times-sprint:1': 2 });
    expect(d.sparks).toBe(40); expect(d.counts.answers).toBe(4);
    expect((await player(page)).placedBelt).toBe('yellow');
    await open(page, '#/me');
    await expect(page.locator('#mePlace')).toContainText('about grade 5');
    // a lower retake: the new level is shown, no Rating goes down
    await page.locator('#mePlaceGo').click();
    await expect(page.locator('#plH')).toHaveText('Want to find your level?');
    await climbWith(page, 'challenger', [true, false, false]); // grade 3 right, two misses at 4 (the page's seed is the same, so the same questions)
    await expect(page.locator('#plH')).toHaveText('You climbed 1 step!');
    d = await saved(page);
    expect(d.placement).toMatchObject({ grade: '3', steps: 1 });
    expect(d.ratings).toEqual({ 'game:times-sprint': 12, 'game:make-ten': 7, 'arena:challenger': 7, 'skill:3-mult': 10 });
    expect((await player(page)).placedBelt).toBe('yellow'); // Bolt's start Belt never moves back
    await open(page, '#/me');
    await expect(page.locator('#mePlace')).toContainText('about grade 3');
    expect((await events(page)).filter(e => e === 'math/placement/done')).toHaveLength(2);
  });
});

/* ---------- The first Star at the level (4.1) ---------- */
test.describe('a new Challenger placed at grade 5', () => {
  test.use({ seedPlayer: { placedBelt: 'yellow', sky: true }, seedProgress: { v: 3, skills: {}, placement: { grade: '5', steps: 3, at: 1_700_000_000_000 } } });
  test('Bolt waits at sq5 Star 1 on the Sky, and the Dojo card offers it', async ({ page }) => {
    await open(page);
    await expect(page.locator('.sky-bolt')).toHaveAttribute('data-at', 'sq5:1');
    await open(page, '#/tiles');
    await expect(page.locator('.dojo-card')).toContainText('Next Star: Square numbers ending in 5, Star 1');
    await expect(page.locator('.dojo-card a.md-btn--primary')).toHaveAttribute('href', pathTo('#/star/sq5/1'));
  });
});
test.describe('a new Pro placed at grade 8', () => {
  test.use({ seedMode: 'pro', seedPlayer: { placedBelt: 'purple' }, seedProgress: { v: 3, skills: {}, placement: { grade: '8', steps: 1, at: 1_700_000_000_000 } } });
  test('the Sutra door offers a purple belt Trick\'s Star 1', async ({ page }) => {
    await open(page);
    await expect(page.locator('.sutra-door a.md-btn--primary')).toHaveAttribute('href', pathTo('#/star/sqroot/1'));
  });
});

/* ---------- Grown-ups: the parent note (3.4) ---------- */
test.describe('the parent note of a Player placed at grade 9', () => {
  test.use({ seedMode: 'pro', seedProgress: { v: 3, skills: {}, placement: { grade: '9', steps: 2, at: 1_700_000_000_000 } } });
  test('says Algebra 1 (grade 9), that it only sets where practice starts, and that it stays on this device', async ({ page }) => {
    await open(page, '#/me');
    const note = page.locator('details.pn').first();
    await note.locator('summary').click();
    await expect(note.locator('.pn-place')).toHaveText(/^Placement: Swift Tiger 42 placed at about Algebra 1 \(grade 9\)\. It only sets where practice starts, and it stays on this device\.$/);
    await expect(page.locator('#mePlace')).toContainText('about Algebra 1 (grade 9)');
  });
});
test('an unplaced Player\'s parent note says nothing about Placement', async ({ page }) => {
  await open(page, '#/me');
  const note = page.locator('details.pn').first();
  await note.locator('summary').click();
  await expect(note).not.toContainText('Placement');
});

/* ---------- Calm, motion and screen readers (3.6) ---------- */
test.describe('Calm and reduced motion', () => {
  test.use({ seedMode: 'explorer', reducedMotion: 'reduce' });
  test('nothing animates while climbing; focus moves to each question heading; the live region announces the step and the result', async ({ page }) => {
    await seeded(page);
    await page.addInitScript(() => { localStorage.setItem('vm.calm', '1'); });
    await open(page, '#/placement');
    await climbWith(page, 'explorer', [true]);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expect(page.locator('#plQ')).toBeFocused();
    await expect(page.locator('#vmLive')).toContainText('Step 2.');
    await expect(page.locator('.place')).toHaveClass(/still/);
    await climbWith(page, 'explorer', [false, false], 7, { start: false });
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expect(page.locator('#vmLive')).toContainText('You climbed 1 step! Bolt will start you there.');
    await expect(page.locator('#plH')).toBeFocused();
  });
});

/* ---------- Nothing leaves the device (5.2) ---------- */
test('during and after a Placement no request carries the grade, the steps or an answer, no cookie is set, and the fake Firebase records no write', async ({ page, context }) => {
  const reqs: string[] = [];
  page.on('request', r => { const u = r.url(); if (!/\/(js|css|ds|theme|fonts|icons|sounds|vendor)\//.test(u)) reqs.push(`${r.method()} ${u} ${r.postData() || ''}`); });
  await seeded(page);
  await open(page, '#/placement');
  await climbWith(page, 'challenger', [true, true, true, false, false]);
  await expect(page.locator('#plH')).toHaveText('You climbed 3 steps!');
  await page.locator('#plGo').click();
  await expect(page.locator('h1.home-h')).toBeVisible();
  const log = await cloudLog(page);
  expect(log.writes).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  /* The screen's own address is its path since the move to /learn/ (indexable-routes): that bare page load is the one request naming it */
  for (const r of reqs.filter(r => !/^GET \S+\/learn\/placement $/.test(r))) expect(r).not.toMatch(/placement|grade=|steps|answer/i);
  const ev = await events(page);
  expect(ev.filter(e => e.startsWith('math/placement/'))).toEqual(['math/placement/done']);
  expect(ev.some(e => /\/5\b|grade|steps/.test(e.replace('math/view/', '')))).toBe(false);
});
