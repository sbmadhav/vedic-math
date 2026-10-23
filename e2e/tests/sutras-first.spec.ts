import { test, expect, APP, open } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

/* openspec change sutras-first: Sutra tags where methods are taught, one tap to the Deep dive and back, a Deep dive
   without a Mode, and the tag event. The shared analytics.js is replaced by a stub that records window.siteTrack. */
type Page = import('@playwright/test').Page;
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push([path, title]); };`;
const events = (page: Page): Promise<[string, string][]> => page.evaluate(() => (globalThis as any).__events || []);
const stubAnalytics = (page: Page) => page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

test.describe('Trick page', () => {
  test('Challenger: the tag names the Sutra and its meaning, with Say it, and links to its Deep dive', async ({ page }) => {
    await open(page, '#/skill/v-sq5');
    const tag = page.locator('.mq-sutra.sutra-tag--full');
    await expect(tag.locator('.sutra-tag-k')).toHaveText('Sutra');
    await expect(tag.locator('b[lang="sa-Latn"]')).toHaveText('Ekādhikena Pūrveṇa');
    await expect(tag.locator('.sutra-tag-m')).toHaveText('By one more than the one before');
    await expect(tag.getByRole('button', { name: 'Hear how to say Ekādhikena Pūrveṇa' })).toBeVisible();
    await expect(tag.locator('a.sutra-tag-a')).toHaveAttribute('href', '#/sutras/s1');
    await expect(tag.getByRole('link', { name: /Ekādhikena Pūrveṇa.*By one more than the one before.*open its deep dive/ })).toBeVisible();
  });

  test('A special case says so, and only Pro reads why', async ({ page }) => {
    await open(page, '#/skill/v-by11');
    await expect(page.locator('.mq-sutra .sutra-tag-k')).toHaveText('A special case of');
    await expect(page.locator('.mq-sutra b[lang="sa-Latn"]')).toHaveText('Ūrdhva-Tiryagbhyām');
    await expect(page.locator('.mq-sutra .sutra-tag-note')).toHaveCount(0);
  });

  test.describe('Explorer', () => {
    test.use({ seedMode: 'explorer' });
    test('the meaning is in Explorer words', async ({ page }) => {
      await open(page, '#/skill/v-sq5');
      await expect(page.locator('.mq-sutra .sutra-tag-m')).toHaveText('One more than the number before');
    });
  });

  test.describe('Pro', () => {
    test.use({ seedMode: 'pro' });
    test('Digit sums: "Uses the idea of Guṇitasamuccayaḥ" with the note that casting out nines is older than the book', async ({ page }) => {
      await open(page, '#/skill/v-check9');
      await expect(page.locator('.mq-sutra .sutra-tag-k')).toHaveText('Uses the idea of');
      await expect(page.locator('.mq-sutra b[lang="sa-Latn"]')).toHaveText('Guṇitasamuccayaḥ');
      await expect(page.locator('.mq-sutra .sutra-tag-note')).toContainText('casting out nines, is much older than the 1965 book');
    });
  });
});

test('From a Trick and back: following the tag opens the Deep dive, closing it shows the Trick page, and one tag event names only the surface', async ({ page }) => {
  await stubAnalytics(page);
  await open(page, '#/learn');
  await page.evaluate(() => { location.hash = '#/skill/v-sq5'; });
  await expect(page.locator('.mq-sutra')).toBeVisible();
  await page.locator('.mq-sutra a.sutra-tag-a').click();
  const dlg = page.locator('dialog.sutra-modal');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('#sdTitle')).toHaveText('Ekādhikena Pūrveṇa');
  await expect(page).toHaveURL(/#\/sutras\/s1$/);
  await dlg.locator('.sd-x').click();
  await expect(dlg).not.toBeVisible();
  await expect(page).toHaveURL(/#\/skill\/v-sq5$/);
  await expect(page.locator('.mq-sutra')).toBeVisible();
  const ev = await events(page);
  expect(ev.filter(([p]) => p.startsWith('math/sutra_tag/'))).toEqual([['math/sutra_tag/trick', 'Sutra tag: trick']]);
  expect(ev.some(([p]) => p === 'math/sutra/s1')).toBe(true);
});

test('Opened from outside the app, closing a Deep dive still shows the Sutras page', async ({ page }) => {
  await open(page, '#/sutras/s1');
  await page.locator('dialog.sutra-modal .sd-x').click();
  await expect(page).toHaveURL(/#\/sutras$/);
  await expect(page.locator('.sutra-grid').first()).toBeVisible();
});

test('Dojo: each of the 21 Trick cells has a tag link to its Sutra', async ({ page }) => {
  await open(page, '#/dojo');
  const tags = page.locator('.dojo-cell a.sutra-tag-a');
  await expect(tags).toHaveCount(21);
  await expect(page.locator('.dojo-cell').filter({ has: page.locator('a[href="#/skill/v-from9"]') }).locator('a.sutra-tag-a')).toHaveAttribute('href', '#/sutras/s2');
});

test('Katas list and a Kata: the tag is under the heading, and on the result', async ({ page }) => {
  await open(page, '#/katas/from9');
  await expect(page.locator('#view .sutra-tag--line b[lang="sa-Latn"]')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
  await open(page, '#/kata/from9/1');
  const tag = page.locator('#view h1 + .sutra-tag');
  await expect(tag.locator('b[lang="sa-Latn"]')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
  await expect(tag.locator('.sutra-tag-m')).toHaveText('All from 9 and the last from 10');
});

test('A Kata result carries the tag as a link', async ({ page }) => {
  await open(page, '#/kata/from9/1');
  for (let k = 0; k < 12 && !(await page.locator('.lv-result').count()); k++) {
    const input = page.locator('#kata .ans-in');
    if (await input.count()) await input.fill('1'); else await page.locator('#kata .pr-choice').first().click();
    await page.locator('#kGo').click();
    await page.locator('#kGo').click();
  }
  await expect(page.locator('.lv-result a.sutra-tag-a')).toHaveAttribute('href', '#/sutras/s2');
});

test('Star: the header names the Sutra as text, the replay names it, and the end screen links to it', async ({ page }) => {
  await open(page, '#/star/by11/1');
  const head = page.locator('.star-top .star-sutra');
  await expect(head.locator('.sutra-tag-k')).toHaveText('A special case of');
  await expect(head.locator('b[lang="sa-Latn"]')).toHaveText('Ūrdhva-Tiryagbhyām');
  await expect(head.locator('a')).toHaveCount(0);
  await page.locator('.star-key[data-k="0"]').click();
  await page.locator('.star-key[data-k="go"]').click();
  await expect(page.locator('.star-replay .star-tag--trick')).toHaveText('The Trick · Ūrdhva-Tiryagbhyām');
  await page.keyboard.press('Escape');
  await page.locator('#stSkip').click();
  await expect(page.locator('.star-end a.sutra-tag-a')).toHaveAttribute('href', '#/sutras/s3');
});

test.describe('a new visitor', () => {
  test.use({ seedMode: null });
  test('A Deep dive opens without a Mode, and no Mode is stored', async ({ page }) => {
    await page.goto(`${APP}#/sutras/s2`);
    await expect(page.locator('dialog.sutra-modal #sdTitle')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
    await expect(page.locator('.mode-pick')).toHaveCount(0);
    const mode = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || 'null'); return p && p.list && p.list[0] ? p.list[0].mode : null; });
    expect(mode ?? null).toBeNull();
  });
});

test.describe('Pro Arena', () => {
  test.use({ seedMode: 'pro' });
  test('The round review lists the Sutras that answered its products and squares, with right of asked, and none for percents or divisions', async ({ page }) => {
    await open(page, '#/arena');
    await page.locator('[data-t="untimed"]').click();
    await page.locator('#arGo').click();
    await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
    const qs: string[] = [];
    for (let k = 0; k < 20; k++) {
      if (k < 19) await expect(page.locator('#arNum')).toHaveText(`${k + 1}/20`);
      qs.push((await page.locator('#arQ').innerHTML()).trim());
      await page.locator('.ar-key[data-k="1"]').click();
      await page.locator('#arForm button').click();
    }
    await expect(page.locator('.play-shell .ar-result')).toBeVisible();
    const tagged = qs.filter(q => /×|&times;|<sup>2<\/sup>/.test(q) && !/÷|&divide;|%/.test(q)).length;
    const near = qs.some(q => { const n = (q.match(/\d+/g) || []).map(Number); return /×|&times;/.test(q) && n.length >= 2 && n[0] >= 80 && n[1] >= 80; }); /* near-base; Pro products of two factors over 80 come only at a Rating near 18, far above a new Pro's */
    const review = page.locator('.play-shell .ar-sutras');
    if (!tagged) { await expect(review).toHaveCount(0); return; }
    const rows = review.locator('.sutra-tag');
    const counts = await rows.locator('.sutra-tag-x').allInnerTexts();
    const asked = counts.map(c => Number(c.match(/of (\d+) right/)![1])).reduce((a, b) => a + b, 0);
    expect(asked, `questions: ${qs.join(' | ')}`).toBe(tagged);
    const names = await rows.locator('b[lang="sa-Latn"]').allInnerTexts();
    for (const n of names) expect(['Ekādhikena Pūrveṇa', 'Nikhilaṃ Navataścaramaṃ Daśataḥ', 'Ūrdhva-Tiryagbhyām', 'Yāvadūnam', "Antyayordaśake'pi"]).toContain(n);
    expect(names.includes('Nikhilaṃ Navataścaramaṃ Daśataḥ')).toBe(near);
  });
});

test('Watch: a Trick video names its Sutra, and its player shows the tag as a link that closes the player', async ({ page }) => {
  await open(page, '#/watch');
  await page.locator('[data-k="tricks"][data-v="true"]').click();
  const card = page.locator('.watch-card[data-tricks~="sq5"]').first();
  await expect(card.locator('.tagv--sutra')).toHaveText('Ekādhikena Pūrveṇa');
  await card.click();
  const player = page.locator('dialog.vm-player');
  await expect(player).toBeVisible();
  const tag = player.locator('.vp-foot a.sutra-tag-a');
  await expect(tag).toHaveAttribute('href', '#/sutras/s1');
  await tag.click();
  await expect(player).not.toBeVisible();
  await expect(page.locator('dialog.sutra-modal #sdTitle')).toHaveText('Ekādhikena Pūrveṇa');
});

test('Answer checker: the page says it uses the idea of Guṇitasamuccayaḥ, and its games list card names it', async ({ page }) => {
  await open(page, '#/game/check-it');
  const tag = page.locator('#view h1 + .sutra-tag');
  await expect(tag.locator('.sutra-tag-k')).toHaveText('Uses the idea of');
  await expect(tag.locator('b[lang="sa-Latn"]')).toHaveText('Guṇitasamuccayaḥ');
  await open(page, '#/games');
  await expect(page.locator('a.mq-game[href="#/game/check-it"] .sutra-tag b')).toHaveText('Guṇitasamuccayaḥ');
});

test.describe('Explorer, Read aloud on by default', () => {
  test.use({ seedMode: 'explorer' });
  test('nothing from the tag is spoken on a Trick page', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__said = [];
    const fake = { speak: (u: any) => (window as any).__said.push(u.text), cancel() {}, getVoices: () => [], pending: false, speaking: false, paused: false, addEventListener() {}, removeEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  });
  await open(page, '#/skill/v-sq5');
  await page.waitForTimeout(800);
  const said: string[] = await page.evaluate(() => (window as any).__said);
  expect(said.join(' ')).not.toMatch(/Ekādhikena|one more than the number before|open its deep dive/i);
  });
});

for (const scheme of ['light', 'dark'] as const) {
  test(`320 px in ${scheme === 'light' ? 'Daybreak' : 'Deep Space'}: Trick page, Kata and Dojo do not scroll sideways, and axe finds nothing serious in the tags`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 320, height: 720 });
    for (const hash of ['#/skill/v-by11', '#/kata/from9/1', '#/dojo']) {
      await open(page, hash);
      expect(await noSideScroll(page), hash).toBe(true);
      const r = await new AxeBuilder({ page }).include('.sutra-tag').analyze();
      expect(r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${hash}: ${v.id}`)).toEqual([]);
    }
  });
}

/* Home leads with the Sutras (openspec change sutras-first, design decision 7; first-visit and sutra-progress specs):
   Challenger and Pro open with the Sutra door, then "Your sutras", then the Player strip; Explorer gets "A sutra to say". */
test.describe('Home', () => {
  test('Challenger: the Sutra door names the next Star\'s Sutra as text; Learn the sutra opens its Deep dive with one home tag event, and closing it returns Home', async ({ page }) => {
    await stubAnalytics(page);
    await open(page);
    const door = page.locator('.home-doors .door').first();
    await expect(door).toHaveClass(/sutra-door/);
    await expect(door.locator('.md-tag')).toHaveText('Your next sutra');
    const tag = door.locator('.sutra-tag');
    await expect(tag.locator('.sutra-tag-k')).toHaveText('Sutra');
    await expect(tag.locator('.sutra-tag-n')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
    await expect(tag.locator('.sutra-tag-m')).toHaveText('All from 9 and the last from 10');
    await expect(tag.locator('a')).toHaveCount(0);
    await expect(door).toContainText('Next Star: Subtract from 100, 1000, 10000, Star 1');
    await expect(door.getByRole('link', { name: 'Play this Star' })).toHaveAttribute('href', '#/star/from9/1');
    await expect(door.locator('.belts-mini .belt-mini')).toHaveCount(7);
    const learn = door.getByRole('link', { name: 'Learn the sutra' });
    await expect(learn).toHaveAttribute('href', '#/sutras/s2');
    await learn.click();
    const dlg = page.locator('dialog.sutra-modal');
    await expect(dlg.locator('#sdTitle')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
    await dlg.locator('.sd-x').click();
    await expect(dlg).not.toBeVisible();
    await expect(page.locator('h1.home-h')).toHaveText('Learn a sutra, then use it');
    await expect(page).toHaveURL(/\/play\/(#\/)?$/);
    expect((await events(page)).filter(([p]) => p.startsWith('math/sutra_tag/'))).toEqual([['math/sutra_tag/home', 'Sutra tag: home']]);
  });

  test.describe('a Challenger with a Star lit on two other Sutras', () => {
    test.use({ seedProgress: { v: 3, skills: {}, sky: { lit: { 'sq5:1': 1, 'by11:1': 1 }, skipped: {}, last: {} } } });
    test('"Your sutras": the next Star\'s Sutra first, then the started ones in Bolt\'s path order, each a link to its Deep dive with its progress', async ({ page }) => {
      await open(page);
      const rows = page.locator('.your-sutras a.your-sutra');
      await expect(rows).toHaveCount(3);
      await expect(rows.locator('b[lang="sa-Latn"]')).toHaveText(['Nikhilaṃ Navataścaramaṃ Daśataḥ', 'Ūrdhva-Tiryagbhyām', 'Ekādhikena Pūrveṇa']);
      await expect(rows.locator('.sutra-prog small')).toHaveText(['0 of 9 Stars lit', '1 of 9 Stars lit', '1 of 9 Stars lit']);
      await expect(rows.nth(1)).toHaveAttribute('href', '#/sutras/s3');
      await expect(rows.first()).toHaveAccessibleName(/the sutra of your next Star/);
      await rows.nth(2).click();
      await expect(page.locator('dialog.sutra-modal #sdTitle')).toHaveText('Ekādhikena Pūrveṇa');
    });
  });

  test.describe('Pro', () => {
    test.use({ seedMode: 'pro' });
    test('the Sutra door leads with its 1965 line and the belts, the Arena is the second door, and "Your sutras" counts Stars and mastery', async ({ page }) => {
      await open(page);
      const doors = page.locator('.home-doors .door');
      await expect(doors.nth(0).locator('.md-tag')).toHaveText('Next sutra');
      await expect(doors.nth(0).locator('.door-line')).toContainText("A sutra is a one-line rule from Bharati Krishna Tirtha's 1965 book that replaces a long method.");
      await expect(doors.nth(0)).toContainText('0 of 7 belts, 0 of 63 Stars');
      await expect(doors.nth(1)).toHaveAttribute('href', '#/arena');
      await expect(page.locator('.your-sutras a.your-sutra .sutra-prog small').first()).toHaveText('0 of 9 Stars lit · 0 of 3 Tricks mastered');
      await expect(page.locator('#view .md-btn--primary')).toHaveText(['Play this Star']);
    });
  });

  test.describe('Explorer', () => {
    test.use({ seedMode: 'explorer' });
    test('"A sutra to say": one Sutra a day from the five with a plain-number idea, with Say it, its Explorer meaning, and See how it works to its Deep dive', async ({ page }) => {
      await stubAnalytics(page);
      const SAY = ['s1', 's14', 's2', 'u8', 'u12'], NAMES: Record<string, string> = { s1: 'Ekādhikena Pūrveṇa', s14: 'Ekanyūnena Pūrveṇa', s2: 'Nikhilaṃ Navataścaramaṃ Daśataḥ', u8: "Antyayordaśake'pi", u12: 'Vilokanam' };
      const day = Math.floor(Date.UTC(2026, 9, 22) / 86400000); /* the local day number of 2026-10-22, as Home counts days */
      await page.clock.install({ time: new Date(2026, 9, 22, 12) });
      await open(page);
      const card = page.locator('.sutra-say'), today = SAY[day % SAY.length];
      await expect(card.locator('.md-tag')).toHaveText('A sutra to say');
      await expect(card.locator('.sutra-say-name b[lang="sa-Latn"]')).toHaveText(NAMES[today]);
      await expect(card.locator('.sutra-say-name [data-say]')).toHaveAttribute('aria-label', `Hear how to say ${NAMES[today]}`);
      await expect(card.locator('.say-resp')).toBeVisible();
      const kid: string = await page.evaluate(async id => { const S = await e2eMod('sutras'); return [...S.SUTRAS.map((c: any) => ({ ...c, id: 's' + c.n })), ...S.SUBSUTRAS.map((c: any) => ({ ...c, id: 'u' + c.n }))].find((c: any) => c.id === id).kid; }, today);
      await expect(card.locator('.sutra-say-kid')).toHaveText(kid);
      const go = card.getByRole('link', { name: 'See how it works' });
      await expect(go).toHaveAttribute('href', `#/sutras/${today}`);
      const c = (await card.boundingBox())!, tiles = (await page.locator('.play-grid--big').boundingBox())!;
      expect(c.y + c.height).toBeLessThanOrEqual(tiles.y);
      await go.click();
      await expect(page.locator('dialog.sutra-modal #sdTitle')).toHaveText(NAMES[today]);
      expect((await events(page)).filter(([p]) => p.startsWith('math/sutra_tag/'))).toEqual([['math/sutra_tag/home', 'Sutra tag: home']]);
      /* the next day brings the next Sutra of the five */
      await page.clock.setSystemTime(new Date(2026, 9, 23, 12));
      await open(page);
      await expect(card.locator('.sutra-say-name b[lang="sa-Latn"]')).toHaveText(NAMES[SAY[(day + 1) % SAY.length]]);
    });
  });

  for (const mode of ['challenger', 'pro'] as const) {
    test.describe(`${mode} on a 390 px phone`, () => {
      test.use({ seedMode: mode, viewport: { width: 390, height: 844 } });
      test('Play this Star is on screen, the Player strip with Sparks follows the doors and "Your sutras", and nothing scrolls sideways', async ({ page }) => {
        await open(page);
        const play = page.locator('#view .md-btn--primary');
        await expect(play).toHaveText('Play this Star');
        const b = (await play.boundingBox())!;
        expect(b.y + b.height).toBeLessThanOrEqual(844);
        const doors = (await page.locator('.home-doors').boundingBox())!, yours = (await page.locator('.your-sutras').boundingBox())!, strip = (await page.locator('.me-strip').boundingBox())!;
        expect(yours.y).toBeGreaterThanOrEqual(doors.y + doors.height);
        expect(strip.y).toBeGreaterThanOrEqual(yours.y + yours.height);
        expect(await noSideScroll(page)).toBe(true);
      });
    });
  }

  for (const scheme of ['light', 'dark'] as const) {
    for (const mode of ['explorer', 'challenger', 'pro'] as const) {
      test.describe(`${mode} at 320 px in ${scheme === 'light' ? 'Daybreak' : 'Deep Space'}`, () => {
        test.use({ seedMode: mode });
        test('Home does not scroll sideways, and axe finds nothing serious in its Sutra cards', async ({ page }) => {
          await page.emulateMedia({ colorScheme: scheme });
          await page.setViewportSize({ width: 320, height: 720 });
          await open(page);
          expect(await noSideScroll(page)).toBe(true);
          const axe = mode === 'explorer' ? new AxeBuilder({ page }).include('.sutra-say') : new AxeBuilder({ page }).include('.sutra-door').include('.your-sutras');
          const r = await axe.analyze();
          expect(r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id)).toEqual([]);
        });
      });
    }
  }
});
