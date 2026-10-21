import { test, expect, open } from '../fixtures';
import { fakeAudio, audioLog } from '../audio-fake';
import type { Page, Request } from '@playwright/test';

/* sutra-pronunciation spec, Requirements "Say it button" and "Respelling under the name": one test per scenario.
   Web Audio and speech are fakes (audio-fake.ts); the clips are the real files from sounds/sutras/. */
const SOUNDS = /\/sounds\//;
function soundRequests(page: Page) {
  const urls: string[] = [];
  page.on('request', (r: Request) => { if (SOUNDS.test(r.url())) urls.push(new URL(r.url()).pathname); });
  return urls;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('vm.sound', '0'); localStorage.setItem('vm.sutraAmb', '0'); } catch (e) { /* storage blocked */ } });
});

test('Deep dive: Say it on #/sutras/s1 plays the Ekādhikena Pūrveṇa clip and stays pressed until it ends', async ({ page }) => {
  await fakeAudio(page);
  const urls = soundRequests(page);
  await open(page, '#/sutras/s1');
  const btn = page.locator('dialog.sutra-modal').getByRole('button', { name: 'Hear how to say Ekādhikena Pūrveṇa' });
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => audioLog(page).then(l => l.decoded)).toBe(1);
  expect(urls[0]).toBe('/sounds/sutras/s1.m4a');
  await expect(btn).toHaveAttribute('aria-pressed', 'false', { timeout: 5000 });
  expect((await audioLog(page)).nodes.filter(n => n.kind === 'source' && n.started !== null)).toHaveLength(1);
});

test('Card does not flip: Say it on an unflipped card plays the clip and the card stays unflipped', async ({ page }) => {
  await fakeAudio(page);
  const urls = soundRequests(page);
  await open(page, '#/sutras');
  const card = page.locator('.sutra-card[data-id="s3"]');
  await expect(card).not.toHaveClass(/flipped/);
  await card.getByRole('button', { name: 'Hear how to say Ūrdhva-Tiryagbhyām' }).click();
  await expect.poll(() => urls[0]).toBe('/sounds/sutras/s3.m4a');
  await expect.poll(() => audioLog(page).then(l => l.decoded)).toBe(1);
  await expect(card).not.toHaveClass(/flipped/);
  await expect(card.locator('.sutra-face')).toHaveAttribute('aria-expanded', 'false');
});

test('Trick page with a bracketed Sutra: Say it on div9 ("Nikhilaṃ (division by 9)") plays the Sutra 2 clip', async ({ page }) => {
  await fakeAudio(page);
  const urls = soundRequests(page);
  await open(page, '#/skill/v-div9');
  await expect(page.locator('.mq-sutra b[lang="sa-Latn"]')).toHaveText('Nikhilaṃ (division by 9)');
  await page.locator('.mq-sutra').getByRole('button', { name: 'Hear how to say Nikhilaṃ Navataścaramaṃ Daśataḥ' }).click();
  await expect.poll(() => urls[0]).toBe('/sounds/sutras/s2.m4a');
});

test('All places: each of the 17 Constellation headings has one Say it button for its Sutra', async ({ page }) => {
  await open(page, '#/places');
  await expect(page.locator('.places-c')).toHaveCount(17);
  await expect(page.locator('.places-h .say-btn')).toHaveCount(17);
  for (const h of await page.locator('.places-h').all()) {
    await expect(h.locator('.say-btn')).toHaveCount(1);
    await expect(h.locator('.say-btn')).toHaveAttribute('data-say', /^[su]\d+$/);
  }
});

test('Deep dive text: #/sutras/s1 shows the name, "ay-kah-dhi-KAY-nuh poor-VAY-nuh" and "एकाधिकेन पूर्वेण"', async ({ page }) => {
  await open(page, '#/sutras/s1');
  const dlg = page.locator('dialog.sutra-modal');
  await expect(dlg.locator('#sdTitle')).toHaveText('Ekādhikena Pūrveṇa');
  await expect(dlg.locator('.sd-say .say-resp')).toContainText('ay-kah-dhi-KAY-nuh poor-VAY-nuh');
  await expect(dlg.locator('.say-deva')).toHaveText('एकाधिकेन पूर्वेण');
  await expect(dlg.locator('.say-deva')).toHaveAttribute('lang', 'sa');
});

test('Stored text matches the generator: the shipped names module carries a Respelling and Devanagari for all 29 cards, as the node test checks against the generator', async ({ page }) => {
  // test/say.test.mjs and test/sutra-names.test.mjs compare every say and deva in js/sutras.js with tools/sutra-voice/sanskrit.mjs;
  // the shipped module must carry exactly those 29 entries, and the s1 entry the spec quotes
  await open(page, '#/sutras');
  const names: Record<string, { say: string; deva: string }> = await page.evaluate(async () => {
    const m: any = await e2eMod('say');
    const out: Record<string, { say: string; deva: string }> = {};
    for (const [id, n] of Object.entries(m.NAMES as Record<string, any>)) out[id] = { say: n.say, deva: n.deva };
    return out;
  });
  expect(Object.keys(names)).toHaveLength(29);
  for (const [id, n] of Object.entries(names)) { expect(n.say, id).toMatch(/^[a-zA-Z- ]+$/); expect(n.deva, id).toMatch(/^[ऀ-ॿ\s]+$/); }
  expect(names.s1).toEqual({ say: 'ay-kah-dhi-KAY-nuh poor-VAY-nuh', deva: 'एकाधिकेन पूर्वेण' });
});
