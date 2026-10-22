import { test, expect, APP, open, cloudLog, needsWorldBoards } from './fixtures';

/* Progress lives in localStorage (vm.players, mathquest.v1.<player>) and survives a reload. */

test('Sparks, collected sutra cards, answers and the nickname survive a reload', async ({ page }) => {
  await open(page, '#/sutras');
  const card = page.locator('.sutra-card').first();
  await card.locator('.sutra-face').click();
  await expect(card).toHaveClass(/got/);
  // One practice answer (Show me counts as answered)
  await page.goto(`${APP}#/skill/v-sq5`);
  await page.locator('#prShow').click();
  await expect(page.locator('#practice .pr-score')).toHaveText('0/1');

  await page.reload();
  await open(page, '#/me');
  await expect(page.locator('#view h1')).toHaveText('Swift Tiger 42');
  await expect(page.locator('.me-head')).toContainText('Number Rookie · 5 Sparks');
  await expect(page.locator('.me-head')).toContainText('295 Sparks to Digit Dasher');
  await expect(page.locator('.me-head')).not.toContainText('XP');
  // The nav chip names the Player and their Title, with no level number
  const chip = page.locator('#mqChip a.mq-chip');
  await expect(chip).toHaveAccessibleName('Swift Tiger 42, Number Rookie');
  expect(await chip.evaluate(e => [...e.children].filter(c => !c.classList.contains('md-sr-only')).map(c => c.textContent).join(''))).not.toMatch(/Lv|\d/); // on screen: the avatar and the bar
  await page.goto(`${APP}#/sutras`);
  await expect(page.locator('.sutra-card').first()).toHaveClass(/got/);
  await expect(page.locator('.sutra-card').first()).toContainText('Collected');
  await expect(page.locator('.md-lede')).toContainText('You have collected 1 of 29');
  // The skill shows as started on the Dojo map
  await page.goto(`${APP}#/dojo`);
  await expect(page.locator('a.dojo-node[href="#/skill/v-sq5"]')).toHaveClass(/mq-going/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || 'null'));
  expect(saved.sparks).toBe(5);
  expect(saved.v).toBe(3);
  expect(saved.skills['v-sq5'].n).toBe(1);
});

test('a new nickname, avatar color and a second player persist', async ({ page }) => {
  await open(page, '#/me');
  await page.locator('#meName').click();
  const name = (await page.locator('#view h1').textContent())!;
  expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/);
  await page.locator('.av-pick[data-c="plum"]').click();
  await expect(page.locator('.av-pick[data-c="plum"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#meAdd').click();
  // A new player starts with the mode picker
  await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
  await page.locator('.mode-card[data-mode="pro"]').click();
  await page.reload();
  await open(page, '#/me');
  await expect(page.locator('.players .player')).toHaveCount(2);
  await page.locator('.players [data-switch]').click();
  await expect(page.locator('#view h1')).toHaveText(name);
  await expect(page.locator('.av-pick[data-c="plum"]')).toHaveAttribute('aria-pressed', 'true');
});

test('the sound setting persists', async ({ page }) => {
  await open(page, '#/me');
  const sound = page.locator('#setSound');
  await expect(sound).not.toBeChecked(); // the fixture turns sound off
  await sound.check();
  await page.reload();
  await expect(page.locator('#setSound')).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('vm.sound'))).toBe('1');
});

/* Daily quests and badges (quests and badges specs) */
const badge = (page: import('@playwright/test').Page, name: string) => page.locator('.badge-grid .badge').filter({ has: page.locator('b', { hasText: new RegExp(`^${name}$`) }) });

test('day-1 quests: one right answer shows whole-number progress like 1/15', async ({ page }) => {
  await open(page, '#/skill/3-mult');
  const q = (await page.locator('#practice #prQ').textContent()) || '';
  const [a, b] = q.match(/\d+/g)!.map(Number);
  await page.locator('#practice .ans-in').fill(String(a * b));
  await page.locator('#practice #prCheck').click();
  await expect(page.locator('#practice #prSay')).toHaveClass(/\bok\b/);
  await page.goto(`${APP}#/`);
  const nums = page.locator('.quest-card .q-n');
  await expect(nums).toHaveCount(3);
  const texts = await nums.allTextContents();
  texts.forEach(t => { expect(t).toMatch(/^\d+\/\d+$/); expect(t).not.toContain('.'); });
  // The first quest is always an answer quest: one right answer counts once
  expect(texts[0]).toMatch(/^1\/\d+$/);
});

test('Sutra scholar: opening the Sutras page earns nothing, collecting 10 cards earns it', async ({ page }) => {
  await open(page, '#/sutras');
  await page.goto(`${APP}#/me`);
  await expect(badge(page, 'Sutra scholar')).not.toHaveClass(/\bgot\b/);
  await expect(badge(page, 'Sutra scholar')).toContainText('Collect 10 Sutra cards.');
  await page.goto(`${APP}#/sutras`);
  const cards = page.locator('.sutra-card');
  for (let i = 0; i < 10; i++) { await cards.nth(i).locator('.sutra-face').click(); await expect(cards.nth(i)).toHaveClass(/got/); }
  await page.goto(`${APP}#/me`);
  await expect(badge(page, 'Sutra scholar')).toHaveClass(/\bgot\b/);
});

test('Video learner: closing a video after 5 seconds earns nothing, a minute in the player earns it; videos earn no Sparks', async ({ page }) => {
  // The player's YouTube frame gets an empty page: no third-party load in the test
  await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
  await page.route(/^https:\/\/i\.ytimg\.com\//, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
  await page.clock.install();
  await open(page, '#/watch');
  const card = page.locator('button.watch-card.plays').first();
  const dlg = page.locator('dialog.vm-player');
  await card.click();
  await expect(dlg).toBeVisible();
  await page.clock.runFor(5_000);
  await dlg.locator('.vp-x').click();
  await expect(dlg).toBeHidden();
  await page.clock.runFor(70_000);
  const badges = () => page.evaluate(async () => (await e2eMod('store')).badges());
  expect((await badges()).watch).toBeUndefined();
  // Opening a video the Player never opened before earns no Sparks
  const sparks = () => page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1') || '{}').sparks || 0);
  expect(await sparks()).toBe(0);
  await card.click();
  await expect(dlg).toBeVisible();
  await page.clock.runFor(61_000);
  expect((await badges()).watch).toBeTruthy();
  await dlg.locator('.vp-x').click();
  await page.goto(`${APP}#/me`);
  await expect(badge(page, 'Video learner')).toHaveClass(/\bgot\b/);
});

/* Removing a Player forgets their World board identity on this device (openspec board-identity). The fake
   Firebase SDK keeps each app's session in e2e.fakeAuth, as the real one keeps it per app name. */
test.describe('removing a Player who posted', () => {
  test.use({ seedConsent: { age: 'adult' } });
  test('signs them out here and sends nothing; the next new Player gets a new identity', async ({ page }) => {
    await needsWorldBoards(page); // World boards off at launch (task 8.5): boards-off.spec.ts runs instead
    const PB = 'pbgone1', UID_B = `e2e-fake-vm-${PB}`;
    await page.addInitScript(([pb, uid]) => {
      if (localStorage.getItem('e2e.seeded2')) return;
      localStorage.setItem('e2e.seeded2', '1');
      const P = JSON.parse(localStorage.getItem('vm.players')!);
      P.list.push({ id: pb, name: 'Lucky Otter 17', avatar: 'plum', mode: 'challenger', created: 1, age: 'adult' });
      localStorage.setItem('vm.players', JSON.stringify(P));
      localStorage.setItem('vm.cloudUids', JSON.stringify({ [pb]: uid }));
      localStorage.setItem('e2e.fakeAuth', JSON.stringify({ [`vm-${pb}`]: uid })); // B posted on an earlier visit
    }, [PB, UID_B] as const);
    await open(page, '#/me');
    page.once('dialog', d => d.accept());
    await page.locator(`[data-del="${PB}"]`).click();
    await expect(page.locator('.players .player')).toHaveCount(1);
    await expect.poll(async () => (await cloudLog(page)).signOuts).toEqual([`vm-${PB}`]);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('e2e.fakeAuth') || '{}'))).toEqual({});
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vm.cloudUids') || '{}'))).toEqual({});
    let log = await cloudLog(page);
    expect(log.signIns).toBe(0);
    expect(log.writes).toEqual([]);
    // A new Player posts for the first time: a new identity, not the removed Player's
    const path = await page.evaluate(async () => {
      const store = await e2eMod('store'), cloud = await e2eMod('cloud');
      const c = store.addPlayer(); store.setAge('adult');
      await cloud.submit(`daily-${cloud.dayId()}-challenger`, { name: c.name, avatar: c.avatar, score: 120 });
      return { id: c.id as string };
    });
    log = await cloudLog(page);
    expect(log.signIns).toBe(1);
    expect(log.writes).toHaveLength(1);
    expect(log.writes[0].path.split('/').pop()).toBe(`e2e-fake-vm-${path.id}`);
    expect(log.writes[0].path).not.toContain(UID_B);
  });
});

/* Badges listed per Mode (openspec explorer-belts, sutras-first): Explorer is not offered Belts, so their badges are
   listed only once earned, and the count is earned of listed. Sutra cards are in every Mode, and so is Sutra scholar. */
test.describe('badges in Explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('no belt badge is listed, Sutra scholar is, and the total counts the listed badges', async ({ page }) => {
    await open(page, '#/me');
    const grid = page.locator('.badge-grid');
    const n = await grid.locator('.badge').count();
    expect(n).toBeGreaterThan(10);
    for (const name of ['White belt', 'Green belt', 'Black belt']) await expect(badge(page, name)).toHaveCount(0);
    await expect(badge(page, 'Sutra scholar')).toHaveCount(1);
    await expect(page.locator('.mq-strand', { hasText: 'Badges' })).toContainText(`0 of ${n}`);
    const all = await page.evaluate(async () => (await e2eMod('gamify')).BADGES.length);
    expect(n).toBe(all - 3);
  });
  test.describe('with the White belt earned before switching from Challenger', () => {
    test.use({ seedProgress: { v: 3, skills: {}, sparks: 0, days: {}, best: {}, last: null, grade: null, badges: { 'belt-white': 1700000000000 }, counts: {}, seen: {}, belts: { white: 1700000000000 } } });
    test('the White belt is listed as earned; Green and Black are not listed', async ({ page }) => {
      await open(page, '#/me');
      await expect(badge(page, 'White belt')).toHaveClass(/\bgot\b/);
      await expect(badge(page, 'Green belt')).toHaveCount(0);
      await expect(badge(page, 'Black belt')).toHaveCount(0);
      const n = await page.locator('.badge-grid .badge').count();
      await expect(page.locator('.mq-strand', { hasText: 'Badges' })).toContainText(`1 of ${n}`);
    });
  });
});

test('badges in Challenger: every badge is listed, belts included', async ({ page }) => {
  await open(page, '#/me');
  const all = await page.evaluate(async () => (await e2eMod('gamify')).BADGES.length);
  await expect(page.locator('.badge-grid .badge')).toHaveCount(all);
  await expect(badge(page, 'White belt')).toHaveCount(1);
});
