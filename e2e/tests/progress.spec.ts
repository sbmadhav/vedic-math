import { test, expect, APP, open, cloudLog, needsWorldBoards, pickMode } from './fixtures';

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
  // A new player starts with the grade question (openspec change age-bands), then the mode picker
  await page.locator('dialog.vm-grade #gqSkip').click();
  await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
  await pickMode(page, 'pro');
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
  await dlg.locator('.vp-play').click(); // the facade: the minute counts from the press on play
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
  await dlg.locator('.vp-play').click();
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

/* The backup code (openspec change learnvedicmath, progress-handoff spec "Backup code for every Player"; task 10.3):
   Copy backup code holds every Player on the device in the hand-off payload format, and Restore from code accepts it,
   and old single-Player codes, only through the same checks and the same prompt as /import/. */
test.describe('backup code', () => {
  type Page = import('@playwright/test').Page;
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64');
  const stored = (page: Page) => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => !k.startsWith('e2e.')).map(k => [k, localStorage.getItem(k)])));
  const names = (page: Page) => page.locator('.players .player b').allTextContents();

  test('Copy backup code holds every Player; Restore from code lists them and writes only after a choice', async ({ page }) => {
    // The clipboard is a recorder, in every engine
    await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t: string) => { (window as any).__copied = t; return Promise.resolve(); } } }); });
    await open(page, '#/me');
    const ids: string[] = await page.evaluate(async () => { const s = await e2eMod('store'); s.addSparks(30); const b = s.addPlayer(); s.addSparks(70); const c = s.addPlayer(); s.addSparks(5); s.switchPlayer('p1'); return ['p1', b.id, c.id]; });
    await page.reload();
    await expect(page.locator('.players .player')).toHaveCount(3);
    await page.locator('#pExport').click();
    await expect(page.locator('#pMsg')).toContainText('every Player on this device');
    const code: string = await page.evaluate(() => (window as any).__copied);
    const payload = JSON.parse(Buffer.from(code, 'base64').toString('utf8'));
    expect(payload.v).toBe(1);
    expect(payload.from).toBe('learnvedicmath.com');
    expect(payload.players.list.map((p: any) => p.id)).toEqual(ids);
    expect(ids.map(id => payload.records[id].sparks)).toEqual([30, 70, 5]);
    expect(Object.keys(payload).sort()).toEqual(['at', 'from', 'players', 'records', 'settings', 'v']);
    // Two Players are removed; the code brings them back, but only after Use the code's
    await page.evaluate(async ([b, c]) => { const s = await e2eMod('store'); s.removePlayer(b); s.removePlayer(c); }, [ids[1], ids[2]]);
    await page.reload();
    await expect(page.locator('.players .player')).toHaveCount(1);
    const before = await stored(page);
    await page.locator('#pImport').click();
    await page.locator('#pPaste').fill(code);
    await page.locator('#pCheck').click();
    const offer = page.locator('#pOffer');
    await expect(offer).toBeVisible();
    await expect(page.locator('#pPasteBox')).toBeHidden();
    await expect(offer.locator('#pOfferList li')).toHaveText(['Swift Tiger 42: 30 Sparks', /^[A-Z][a-z]+ [A-Z][a-z]+ \d\d: 70 Sparks$/, /^[A-Z][a-z]+ [A-Z][a-z]+ \d\d: 5 Sparks$/]);
    await expect(offer.locator('#pOfferHere')).toContainText('This device already has progress: Swift Tiger 42.');
    await expect(offer.locator('#pBring')).toBeHidden();
    await expect(offer.locator('#pBoth')).toBeVisible();
    expect(await stored(page), 'nothing is written before a choice').toEqual(before);
    await offer.locator('#pKeep').click();
    await expect(offer).toBeHidden();
    await expect(page.locator('#pMsg')).toHaveText('Nothing was changed.');
    expect(await stored(page)).toEqual(before);
    await page.locator('#pImport').click();
    await page.locator('#pPaste').fill(code);
    await page.locator('#pCheck').click();
    await expect(offer).toBeVisible();
    await expect(offer.locator('#pOfferHere')).toContainText('Use the code\'s replaces every Player and all progress on this device');
    await offer.locator('#pUse').click();
    await expect(page.locator('.players .player')).toHaveCount(3);
    const s = await stored(page);
    expect(JSON.parse(s['vm.players']!).list.map((p: any) => p.id)).toEqual(ids);
    expect(JSON.parse(s['mathquest.v1.' + ids[1]]!).sparks).toBe(70);
    expect(JSON.parse(s['mathquest.v1.p1']!).sparks).toBe(30);
    expect(s['vm.migratedAt']).toBeUndefined();
  });

  test('an old single-Player code is offered as one Player, and Keep both adds them next to this device\'s', async ({ page }) => {
    await open(page, '#/me');
    await page.evaluate(async () => { const s = await e2eMod('store'); s.addSparks(12); });
    const code = b64({ player: { id: 'p1', name: 'Bold Yak 55', avatar: 'plum', mode: 'pro', parentOk: 1 }, data: { skills: {}, sparks: 250, best: { 'run-1': 9 } } });
    await page.locator('#pImport').click();
    await page.locator('#pPaste').fill(code);
    await page.locator('#pCheck').click();
    await expect(page.locator('#pOfferList li')).toHaveText(['Bold Yak 55: 250 Sparks']);
    await page.locator('#pBoth').click();
    await expect(page.locator('.players .player')).toHaveCount(2);
    expect(await names(page)).toEqual(['Swift Tiger 42', 'Bold Yak 55']);
    const s = await stored(page), P = JSON.parse(s['vm.players']!);
    const yak = P.list[1];
    expect(yak.id).not.toBe('p1');
    expect(yak.parentOk).toBeUndefined();
    expect(JSON.parse(s['mathquest.v1.p1']!).sparks).toBe(12);
    expect(JSON.parse(s['mathquest.v1.' + yak.id]!).sparks).toBe(250);
    expect(JSON.parse(s['mathquest.v1.' + yak.id]!).best).toEqual({ 'run-1': 9 });
    await expect(page.locator('#view h1')).toHaveText('Bold Yak 55');
  });

  test('a device with more Players than one code holds is told, and nothing is copied', async ({ page }) => {
    await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t: string) => { (window as any).__copied = t; return Promise.resolve(); } } }); });
    await open(page, '#/me');
    const n = await page.evaluate(async () => { const s = await e2eMod('store'); while (s.allPlayers().length <= s.MAX_PLAYERS) s.addPlayer(); s.switchPlayer('p1'); return s.allPlayers().length as number; });
    expect(n).toBe(13);
    await page.reload();
    await expect(page.locator('.players .player')).toHaveCount(13);
    await page.locator('#pExport').click();
    await expect(page.locator('#pMsg')).toHaveText('One backup code holds up to 12 Players, and this device has more. Remove a Player you no longer need, then try again.');
    expect(await page.evaluate(() => (window as any).__copied ?? null)).toBeNull();
    await expect(page.locator('#pCodeBox')).toBeHidden();
  });

  /* Muse review round 2, item 3: the code is shown as well as copied, so it can be checked or written down; where the
     clipboard is refused the field is the copy; Restore from code opens a field, and Cancel closes it with nothing changed */
  test('Copy backup code shows the code it copied, and shows it alone when the clipboard is refused', async ({ page }) => {
    await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t: string) => { (window as any).__copied = t; return Promise.resolve(); } } }); });
    await open(page, '#/me');
    await page.locator('#pExport').click();
    await expect(page.locator('#pMsg')).toContainText('It is also shown below');
    const field = page.locator('#pCode');
    await expect(field).toBeVisible();
    await expect(field).toHaveAttribute('readonly', '');
    expect(await field.inputValue()).toBe(await page.evaluate(() => (window as any).__copied));
    expect(await field.evaluate((f: HTMLTextAreaElement) => f.selectionEnd - f.selectionStart), 'the code is selected, ready to copy by hand').toBeGreaterThan(20);
    // The clipboard refuses: the field is the copy
    await page.evaluate(() => { (navigator as any).clipboard.writeText = () => Promise.reject(new Error('no')); });
    await page.locator('#pExport').click();
    await expect(page.locator('#pMsg')).toContainText('Select the code below and copy it yourself');
    await expect(field).toBeVisible();
    expect(await field.inputValue()).toMatch(/^[A-Za-z0-9+/=]+$/);
    // Restore opens its own field and hides the code; Cancel closes it with nothing changed
    const before = await stored(page);
    await page.locator('#pImport').click();
    await expect(page.locator('#pPasteBox')).toBeVisible();
    await expect(page.locator('#pPaste')).toBeFocused();
    await expect(page.locator('#pCodeBox')).toBeHidden();
    await page.locator('#pCheck').click();
    await expect(page.locator('#pMsg')).toHaveText('Paste a backup code first.');
    await page.locator('#pPasteCancel').click();
    await expect(page.locator('#pPasteBox')).toBeHidden();
    expect(await stored(page)).toEqual(before);
  });

  test('a code that is not a backup, or does not match the schema, changes nothing and says so', async ({ page }) => {
    await open(page, '#/me');
    const before = await stored(page);
    const player = { id: 'p1', name: 'Bold Yak 55', avatar: 'plum', mode: null, created: 1 };
    const payload = { v: 1, from: 'learnvedicmath.com', at: 1, players: { active: 'p1', list: [player] }, records: {}, settings: {} };
    const codes = ['not a code', b64({ ...payload, extra: 1 }), b64({ ...payload, v: 2 }), b64({ ...payload, players: { active: 'p1', list: [{ ...player, name: '<img src=x onerror=alert(1)>' }] } })];
    for (const code of codes) {
      await page.locator('#pMsg').evaluate(e => { e.textContent = ''; });
      await page.locator('#pImport').click();
      await page.locator('#pPaste').fill(code);
      await page.locator('#pCheck').click();
      await expect(page.locator('#pMsg')).toHaveText('That code could not be used. Check that it was copied in full.');
      await expect(page.locator('#pOffer')).toBeHidden();
      await expect(page.locator('#pPasteBox'), 'the field stays open to fix the code').toBeVisible();
    }
    expect(await stored(page)).toEqual(before);
    await expect(page.locator('main img')).toHaveCount(0);
  });
});
