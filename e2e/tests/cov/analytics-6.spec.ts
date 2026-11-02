import { test, expect, open, heldClock, typeAnswer, worldBoardsOn, go } from '../fixtures';

/* openspec/specs/analytics/spec.md
   - Requirement: Share clicks / Scenario: Share button
   - Requirement: Events carry no identifiers / Scenario: Event contents
   This site's /js/analytics.js is replaced by a stub that records every window.siteTrack(path, title) call
   in window.__events, so nothing is ever sent to GoatCounter. */
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push([path, title]); };`;
type Page = import('@playwright/test').Page;
type Ev = [string, string];
const events = (page: Page): Promise<Ev[]> => page.evaluate(() => (globalThis as any).__events || []);

test.beforeEach(async ({ page }) => {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
});

/* The documented vocabulary (js/metrics.js and the track() calls in js/app.js): fixed words, route names,
   catalog ids, Leagues and the documented buckets. */
const LEAGUE = '(explorer|challenger|pro)';
const ID = '[a-z0-9][a-z0-9_-]*';
const GRAMMAR: RegExp[] = [
  new RegExp(`^math/view/(pick-mode|other|${ID}(/${ID})*)$`),
  /^math\/q_answered\/(practice|run|kata|star)\/(right|miss)$/,
  new RegExp(`^math/round_end/(arena|game|tower|duel)/${LEAGUE}/(r1|r2|r3plus)$`),
  /^math\/round2_start\/(arena|game|tower|duel)$/,
  /^math\/first_win\/(under-30|30-60|60-90|90-180|over-180)$/,
  /^math\/return_d(1|7)$/,
  /^math\/share_click\/(result|challenge-link)$/,
  new RegExp(`^math/(mastered|kata|sutra|trick|challenge|watch)/${ID}$`),
  new RegExp(`^math/arena/${LEAGUE}/${ID}$`),
  new RegExp(`^math/duel/${LEAGUE}$`),
  // Play experiences (openspec play-experiences, analytics delta): math/play/<experience>/<action>, fixed words
  new RegExp(`^math/play/${ID}/${ID}$`),
  // Star events (js/metrics.js STAR_EVENTS, documented by the sky-home change)
  new RegExp(`^math/star/(lit|skipped|comeback|dare_taken|dare_won)/${ID}$`),
  new RegExp(`^math/game/${ID}/${ID}$`),
  /^math\/age-answer$/,
];

/** Checks every recorded event against the vocabulary and against the identifying values seen on the page. */
function checkContents(ev: Ev[], secrets: string[]) {
  expect(ev.length).toBeGreaterThan(0);
  for (const [path, title] of ev) {
    expect(GRAMMAR.some(re => re.test(path)), `path outside the documented vocabulary: ${path}`).toBe(true);
    // No segment is a bare number (a level, Star, seed, score or count); only grade ids (K, 1 to 12) are numbers
    const segs = path.split('/');
    segs.forEach((seg, i) => { if (!/^math\/view\/(grade|mix|run)\/\d+$/.test(path) || i !== 3) expect(seg, `numeric segment in ${path}`).not.toMatch(/^\d+$/); });
    expect(typeof title, `title of ${path}`).toBe('string');
    // No path word is a word of a Nickname (Nicknames are fixed-list words plus a number)
    const words = path.split(/[/_-]/);
    for (const s of secrets) for (const w of s.split(/\s+/)) if (/^[a-z]{3,}$/i.test(w)) expect(words, `${path} carries the Nickname word "${w}"`).not.toContain(w.toLowerCase());
    for (const s of secrets) {
      const low = s.toLowerCase();
      expect(path.toLowerCase(), `${path} carries "${s}"`).not.toContain(low);
      expect(title.toLowerCase(), `title "${title}" of ${path} carries "${s}"`).not.toContain(low);
    }
  }
}

/** The active Player's identity as stored on this device: id, Nickname words and avatar. */
async function playerSecrets(page: Page): Promise<string[]> {
  const p = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('vm.players') || '{}'); return (s.list || []).find((x: any) => x.id === s.active) || {}; });
  return [String(p.name), `/${p.avatar}`, `${p.id}/`, `/${p.id}`];
}

test.describe('Share clicks: Share button', () => {
  test('a share tap on a result sends exactly one share_click/<surface> event', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/arena');
    await page.locator('[data-t="practice"]').click();
    await page.locator('#arGo').click();
    await page.clock.runFor(2_500);
    await expect(page.locator('#arType')).toBeVisible();
    await page.clock.fastForward(61_000);
    await expect(page.locator('.ar-result')).toBeVisible();

    // Every share control the result offers sends one event when used
    // The result's share controls (not the Arena's shelf of play experiences below it, whose cards mention sharing)
    const share = page.locator('#view').locator('button, a, [role="button"]').filter({ hasText: /share/i }).and(page.locator(':not(.play-card)'));
    const n = await share.count();
    for (let i = 0; i < n; i++) {
      const before = (await events(page)).filter(([p]) => p.startsWith('math/share_click/')).length;
      await page.evaluate(() => { (navigator as any).share = async () => {}; try { (navigator as any).clipboard.writeText = async () => {}; } catch (e) {} });
      await share.nth(i).click();
      await expect.poll(async () => (await events(page)).filter(([p]) => p.startsWith('math/share_click/')).length).toBe(before + 1);
    }

    // The share hook the app's share actions call: one tap, one event, with a documented surface only
    const ev0 = (await events(page)).length;
    await page.evaluate(async () => { const m = await e2eMod('metrics'); m.shareClick('result'); });
    let added = (await events(page)).slice(ev0);
    expect(added.map(e => e[0])).toEqual(['math/share_click/result']);
    await page.evaluate(async () => { const m = await e2eMod('metrics'); m.shareClick('challenge-link'); m.shareClick('Swift Tiger 42'); m.shareClick('result?id=p1'); });
    added = (await events(page)).slice(ev0 + 1);
    expect(added.map(e => e[0])).toEqual(['math/share_click/challenge-link']);
    checkContents(await events(page), await playerSecrets(page));
  });
});

test.describe('Events carry no identifiers: Event contents', () => {
  test('a tour of untimed play, the Me page and the Age answer sends only fixed vocabulary', async ({ page }) => {
    test.slow();
    const secrets = new Set<string>();
    await open(page);
    for (const s of await playerSecrets(page)) secrets.add(s);

    // Me page: the Age answer, then a new Nickname (first, before any score asks for the Age answer)
    await open(page, '#/me');
    // The Me page asks the Age question only while World boards are on (the launch has them off until task 8.5)
    const asksAge = await worldBoardsOn(page);
    if (asksAge) {
      await page.locator('#wbAsk').click();
      await expect(page.locator('dialog[open] [data-age="9"]')).toBeVisible();
      await page.locator('dialog[open] [data-age="9"]').click();
      await page.locator('dialog[open] .vs-foot [data-close]').click(); // under 13: Device boards only, the sheet just says so
    }
    await page.locator('#meName').click();
    for (const s of await playerSecrets(page)) secrets.add(s);

    // Practice: a typed wrong answer, Show me (a miss), then a right answer computed from the page
    await open(page, '#/skill/3-mult');
    await page.locator('#practice .ans-in').fill('987654');
    secrets.add('987654');
    await page.locator('#practice #prCheck').click();
    await page.locator('#practice #prShow').click();
    await page.locator('#practice #prCheck').click(); // Next
    const q = (await page.locator('#practice #prQ').textContent()) || '';
    const [a, b] = q.match(/\d+/g)!.map(Number);
    await page.locator('#practice .ans-in').fill(String(a * b));
    await page.locator('#practice #prCheck').click();
    await expect(page.locator('#practice #prSay')).toHaveClass(/\bok\b/);

    // A Star: a miss then the rematch right
    await open(page, '#/star/sq5/2');
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await page.keyboard.type('1'); await page.keyboard.press('Enter');
    await expect(page.locator('.star-step').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#stMain .star-tag')).toHaveText('Rematch');
    const sq = Number((await page.locator('#stQ').innerHTML()).match(/^(\d+)<sup>/)![1]);
    await page.keyboard.type(String(sq * sq)); await page.keyboard.press('Enter');
    await expect(page.locator('#stSay')).toContainText('Comeback');

    // Other routes, including numbered ones and a typed id not in the catalog
    for (const h of ['#/learn', '#/dojo', '#/tricks', '#/sutras', '#/games', '#/watch', '#/progress', '#/game/times-sprint/7', '#/katas/sq5']) await open(page, h);
    await go(page, '#/skill/my-secret-name');
    await page.waitForTimeout(300);
    secrets.add('my-secret-name');

    const ev = await events(page);
    const paths = ev.map(e => e[0]);
    // The tour really produced the event kinds it is meant to cover
    expect(paths).toEqual(expect.arrayContaining([
      'math/view/home', 'math/view/skill/3-mult', 'math/q_answered/practice/miss', 'math/q_answered/practice/right',
      'math/q_answered/star/miss', 'math/q_answered/star/right', 'math/view/star/sq5/star', 'math/view/game/times-sprint/level',
      'math/view/katas/sq5', 'math/view/skill/unknown', 'math/view/me', ...(asksAge ? ['math/age-answer'] : []),
    ]));
    expect(paths.filter(p => p.startsWith('math/parent-step')), 'the Parent step is retired (docs/adr/0006)').toEqual([]);
    checkContents(ev, [...secrets]);
    // The Age answer is never a path segment
    for (const p of paths) expect(p.split('/')).not.toContain('9');
  });

  test('timed rounds (Arena and a stopped game) send only fixed vocabulary, never the Score', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/arena');
    await page.locator('[data-t="practice"]').click();
    await page.locator('#arGo').click();
    await page.clock.runFor(2_500);
    await expect(page.locator('#arType')).toBeVisible();
    for (let i = 0; i < 3; i++) { await typeAnswer(page, '424242'); await page.locator('#arForm button').click(); }
    await page.clock.fastForward(61_000);
    await expect(page.locator('.ar-result')).toBeVisible();
    await open(page, '#/game/times-sprint');
    await page.locator('#gStart').click();
    await expect(page.locator('#gQuit')).toBeVisible();
    await page.locator('#gQuit').click();
    await expect(page.locator('#gStart')).toBeVisible();

    const ev = await events(page);
    const paths = ev.map(e => e[0]);
    expect(paths).toEqual(expect.arrayContaining(['math/view/arena', 'math/round_end/arena/challenger/r1', 'math/view/game/times-sprint']));
    expect(paths.some(p => /^math\/arena\/challenger\//.test(p))).toBe(true);
    expect(paths.some(p => /^math\/game\/times-sprint\//.test(p))).toBe(true);
    checkContents(ev, [...await playerSecrets(page), '424242']);
  });
});
