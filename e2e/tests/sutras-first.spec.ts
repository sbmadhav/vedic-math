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
    test('a special case says so in Explorer too', async ({ page }) => {
      await open(page, '#/skill/v-by11');
      await expect(page.locator('.mq-sutra .sutra-tag-k')).toHaveText('Special case of');
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
  test("Try a trick: the worked example carries the Sutra's tag as a link, and Start the Star stays on screen at 390 by 844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(APP);
    await page.locator('#tryBtn').click();
    await expect(page.locator('#stStart')).toBeInViewport();
    const tag = page.locator('.star-intro .sutra-tag');
    await expect(tag.locator('b[lang="sa-Latn"]')).toHaveText('Nikhilaṃ Navataścaramaṃ Daśataḥ');
    await expect(tag.locator('a.sutra-tag-a')).toHaveAttribute('href', '#/sutras/s2');
  });

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
