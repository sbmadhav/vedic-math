import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, open, APP, needsStudioVoice, studioVoiceOn, type Page } from './fixtures';

/* Listen buttons (openspec explanation-audio): every explanation can be heard. Like voice.spec.ts, the studio voice
   is a fake index with tiny tone files (e2e/fixtures/voice/) served through page.route, and the device voice is a
   recorder whose sentences end after `endAfter` ms, so a test can catch a button while it plays. js/voice.js writes
   the voice that said each line to window.__voiceLog. The shared analytics script is a stub recording siteTrack.
   On a deploy with no Studio voice (build.py --voice off) the voice host is not in the policy, so the cases where a
   recording plays skip (needsStudioVoice) and the device-voice cases run. */

const FIX = join(__dirname, '..', 'fixtures', 'voice');
const LINE_M4A = readFileSync(join(FIX, 'line.m4a')), PACK_M4A = readFileSync(join(FIX, 'pack.m4a'));
const VOICE = 'en-US-Chirp3-HD-Aoede';
const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path); };`;

async function setup(page: Page, { endAfter = 0 } = {}) {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(ms => {
    const w = window as any;
    w.__voiceLog = []; w.__spoken = [];
    const fake = {
      getVoices: () => [{ name: 'Ava', lang: 'en-US', voiceURI: 'com.apple.voice.enhanced.en-US.Ava', localService: true, default: false }],
      pending: false, speaking: false, paused: false,
      speak(u: any) { w.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), ms); },
      cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {}
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    class Utterance { text: string; voice: unknown = null; lang = ''; pitch = 1; rate = 1; volume = 1; onend: null | (() => void) = null; onerror = null; constructor(t: string) { this.text = t; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
  }, endAfter);
  /* The recorded lines: hashes filled in by recordLines() once the page can compute them */
  const recorded = new Set<string>();
  const index = { voice: VOICE, speed: 0.95, base: 'https://voice.learnvedicmath.com/', tag: 'voice-0123456789', sha256: '0'.repeat(64), lineSet: 'l/set.test.bin', dir: 'p/dir.test.json',
    packs: [{ name: 'core', audio: 'p/core.test.m4a', map: 'p/core.test.json', bytes: PACK_M4A.length, clips: 0 }], coveredSkills: [], counts: { lines: 0, clips: 0 } };
  await page.route('**/js/voice-index.js*', r => r.fulfill({ contentType: 'text/javascript', body: `export const STUDIO = ${JSON.stringify(index)};` }));
  await page.route('https://voice.learnvedicmath.com/**', r => {
    const u = new URL(r.request().url()).pathname.replace('/', '');
    if (u === 'l/set.test.bin') {
      const keys = Uint32Array.from([...recorded].map(h => parseInt(h.slice(0, 8), 16) >>> 0)).sort();
      return r.fulfill({ contentType: 'application/octet-stream', body: Buffer.from(keys.buffer) });
    }
    if (u === 'p/dir.test.json') return r.fulfill({ json: {} });
    if (u === 'p/core.test.json') return r.fulfill({ json: { rate: 24000, gap: 0.25, clips: {} } });
    if (u === 'p/core.test.m4a') return r.fulfill({ contentType: 'audio/mp4', body: PACK_M4A });
    const m = u.match(/^l\/([0-9a-f]{14})\.m4a$/);
    if (m && recorded.has(m[1])) return r.fulfill({ contentType: 'audio/mp4', body: LINE_M4A });
    return r.fulfill({ status: 404, body: 'not found' });
  });
  return {
    /* Marks the lines of a Listen key as recorded (hash computed in the page, as js/voice.js does) */
    async recordKey(key: string) {
      const hs: string[] = await page.evaluate(async ([k, v]) => {
        const { lineHash } = await e2eMod('voice-plan');
        const { normalize } = await e2eMod('voice');
        const { linesForKey } = await e2eMod('explain-lines');
        return linesForKey(k).map((t: string) => lineHash(v, normalize(t)));
      }, [key, VOICE]);
      hs.forEach(h => recorded.add(h));
      return hs.length;
    }
  };
}
const vlog = (page: Page) => page.evaluate(() => (window as any).__voiceLog as string[]);
const spoken = (page: Page) => page.evaluate(() => (window as any).__spoken as string[]);
const events = (page: Page) => page.evaluate(() => ((window as any).__events || []) as string[]);

test.describe('Listen', () => {
  test.use({ seedMode: 'challenger' }); // read aloud is off: Listen still plays, because it follows a tap

  test('a Skill page plays its recorded explanation, line by line, and the button shows it is playing', async ({ page }) => {
    await needsStudioVoice(page);
    const st = await setup(page);
    await open(page, '#/skill/3-mult');
    const n = await st.recordKey('skill:3-mult');
    const btn = page.getByRole('button', { name: 'Listen: the idea and how it works' });
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await vlog(page)).filter(e => e === 'studio:line').length, { timeout: 20_000 }).toBe(n);
    await expect(btn).toHaveAttribute('aria-pressed', 'false', { timeout: 10_000 });
    expect(await spoken(page)).toEqual([]); // the device voice said nothing
    expect((await events(page)).filter(e => e.startsWith('math/listen'))).toEqual(['math/listen/explanation']);
  });

  test('with no recording, the device voice reads the same lines', async ({ page }) => {
    await setup(page);
    await open(page, '#/skill/3-mult');
    const want = await page.evaluate(async () => {
      const { normalize } = await e2eMod('voice');
      const { linesForKey } = await e2eMod('explain-lines');
      return linesForKey('skill:3-mult').map((t: string) => normalize(t));
    });
    await page.getByRole('button', { name: 'Listen: the idea and how it works' }).click();
    await expect.poll(async () => (await vlog(page)).filter(e => e === 'builtin').length).toBe(want.length);
    await expect.poll(async () => (await spoken(page)).join(' ')).toContain(want[0].split('. ')[0]);
  });

  test('with Studio voice off in the build, the device voice reads and the voice host is never asked', async ({ page }) => {
    await setup(page);
    /* On a --voice off deploy (CI deploys this way until R2 is set up), the index it publishes; elsewhere the one
       build.py --voice off writes, taken from build.py itself */
    if (await studioVoiceOn(page)) {
      const off = readFileSync(join(__dirname, '..', '..', 'build.py'), 'utf8').match(/^VOICE_OFF_INDEX = """([\s\S]*?)"""/m)![1];
      await page.route('**/js/voice-index.js*', r => r.fulfill({ contentType: 'text/javascript', body: off }));
    } else {
      await page.unroute('**/js/voice-index.js*');
    }
    const asked: string[] = [];
    page.on('request', req => { if (req.url().startsWith('https://voice.learnvedicmath.com/')) asked.push(req.url()); });
    await open(page, '#/skill/3-mult');
    const n = await page.evaluate(async () => {
      const { linesForKey } = await e2eMod('explain-lines');
      return linesForKey('skill:3-mult').length;
    });
    const btn = page.getByRole('button', { name: 'Listen: the idea and how it works' });
    await btn.click();
    await expect.poll(async () => (await vlog(page)).filter(e => e === 'builtin').length).toBe(n);
    expect(await vlog(page)).not.toContain('studio:line');
    expect((await spoken(page)).length).toBeGreaterThan(0);
    expect(asked).toEqual([]);
  });

  test('one at a time: pressing another stops the first, pressing a playing one stops it', async ({ page }) => {
    await setup(page, { endAfter: 4000 });
    await open(page, '#/guide');
    const btns = page.locator('.gd-sec .listen-btn');
    const [a, b] = [btns.nth(0), btns.nth(1)];
    await a.click();
    await expect(a).toHaveAttribute('aria-pressed', 'true');
    await b.click();
    await expect(a).toHaveAttribute('aria-pressed', 'false');
    await expect(b).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.listen-btn[aria-pressed="true"]')).toHaveCount(1);
    await b.click();
    await expect(b).toHaveAttribute('aria-pressed', 'false');
    expect((await events(page)).filter(e => e === 'math/listen/explanation')).toHaveLength(2); // a stop is not a listen
  });

  test('works from the keyboard: Enter starts it, Space stops it', async ({ page }) => {
    await setup(page, { endAfter: 4000 });
    await open(page, '#/game/times-sprint');
    const btn = page.getByRole('button', { name: 'Listen: how to play' });
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Space');
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  test('leaving the page stops it', async ({ page }) => {
    await setup(page, { endAfter: 4000 });
    await open(page, '#/sutras');
    await page.getByRole('button', { name: 'Listen: where Vedic math comes from' }).click();
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
    const before = (await spoken(page)).length;
    await page.goto(`${APP}#/learn`);
    await expect(page.locator('#view h1').first()).toBeVisible();
    await page.waitForTimeout(5000); // past the first sentence's end: the next one must not start
    expect((await spoken(page)).length).toBe(before);
  });

  test('a Sutra deep dive reads a recorded section in the studio voice', async ({ page }) => {
    await needsStudioVoice(page);
    const st = await setup(page);
    await open(page, '#/sutras/s1');
    const dlg = page.locator('dialog.sutra-modal');
    await expect(dlg).toBeVisible();
    await st.recordKey('sutra:s1:why');
    await dlg.getByRole('button', { name: 'Listen: why it works' }).click();
    await expect.poll(() => vlog(page)).toContain('studio:line');
  });

  test('a Sutra deep dive reads each section, and the diagram step on screen', async ({ page }) => {
    await setup(page);
    await open(page, '#/sutras/s1');
    const dlg = page.locator('dialog.sutra-modal');
    await expect(dlg).toBeVisible();
    await dlg.getByRole('button', { name: 'Listen: why it works' }).click();
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
    await page.evaluate(() => { (window as any).__spoken.length = 0; }); // the diagram step's own reading next
    await dlg.getByRole('button', { name: 'Listen: this diagram step' }).click();
    const step = (await dlg.locator('.sc-say').innerText()).trim();
    await expect.poll(async () => (await spoken(page)).join(' ')).toContain(step.split(' ').slice(0, 2).join(' '));
  });

  test('the worked example is read from the page, its answer too', async ({ page }) => {
    await setup(page);
    await open(page, '#/skill/3-mult');
    const ans = page.locator('#view .mq-ans').first();
    await expect(ans).toBeVisible();
    const answer = (await ans.innerText()).trim();
    await page.getByRole('button', { name: 'Listen: the worked example' }).click();
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(1);
    await expect.poll(async () => (await spoken(page)).at(-1), { timeout: 15_000 }).toBe(answer);
  });

  test('stopped in the pause between lines and started again: the earlier start does not release the button', async ({ page }) => {
    await setup(page, { endAfter: 600 });
    await open(page, '#/skill/3-mult');
    const btn = page.getByRole('button', { name: 'Listen: the idea and how it works' });
    await expect(btn).toBeVisible();
    /* In the page, so the taps land inside the 250 ms pause after a line ends: a sentence ended and no next one
       started within 40 ms (the next sentence of the same line starts at once) */
    const pressed = await page.evaluate(async () => {
      const w = window as any, b = [...document.querySelectorAll<HTMLButtonElement>('.listen-btn')].find(x => x.getAttribute('aria-label') === 'Listen: the idea and how it works')!;
      const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
      let ends = 0; const speak = w.speechSynthesis.speak.bind(w.speechSynthesis);
      w.speechSynthesis.speak = (u: any) => { const end = u.onend; u.onend = () => { ends++; end && end(); }; speak(u); };
      b.click();
      for (;;) {
        const seen = ends; while (ends === seen) await wait(2);
        const said = w.__spoken.length; await wait(40);
        if (w.__spoken.length === said) break; // in the pause between lines
      }
      b.click(); // stop
      b.click(); // start again
      await wait(400); // past the end of the earlier pause
      return b.getAttribute('aria-pressed');
    });
    expect(pressed).toBe('true');
  });

  /* explanation-audio 4.4: today's quests on Home and the round formats on a tower chapter, each a recorded label */
  test("Home's daily quests are read, each label in turn", async ({ page }) => {
    await setup(page);
    await open(page, '#/');
    const want = await page.evaluate(async () => {
      const { normalize } = await e2eMod('voice');
      return [...document.querySelectorAll('.quest-card .q-l')].map(el => normalize(el.innerHTML));
    });
    expect(want).toHaveLength(3);
    await page.getByRole('button', { name: "Listen: today's quests" }).click();
    await expect.poll(async () => (await vlog(page)).filter(e => e === 'builtin').length).toBe(3);
    await expect.poll(async () => (await spoken(page)).join(' ')).toBe(want.join(' '));
  });

  test('a tower chapter reads the round format rules in the studio voice', async ({ page }) => {
    await needsStudioVoice(page);
    const st = await setup(page);
    await open(page, '#/tower/1');
    const n = await st.recordKey('formats');
    expect(n).toBe(5);
    const btn = page.getByRole('button', { name: 'Listen: the round formats' });
    await btn.click();
    await expect.poll(async () => (await vlog(page)).filter(e => e === 'studio:line').length, { timeout: 20_000 }).toBe(n);
    await expect(btn).toHaveAttribute('aria-pressed', 'false', { timeout: 10_000 });
    expect(await spoken(page)).toEqual([]);
  });

  test('a tower chapter reads the round format rules with the device voice when none is recorded', async ({ page }) => {
    await setup(page);
    await open(page, '#/tower/1');
    const want = await page.evaluate(async () => {
      const { normalize } = await e2eMod('voice');
      const { linesForKey } = await e2eMod('explain-lines');
      return linesForKey('formats').map((t: string) => normalize(t));
    });
    await page.getByRole('button', { name: 'Listen: the round formats' }).click();
    await expect.poll(async () => (await spoken(page)).join(' ')).toBe(want.join(' ')); // the device voice says a line sentence by sentence
  });

  /* explanation-audio 4.5: the Sutras page's "Older roots" card reads its intro, then each note as the list shows it */
  test('the Older roots card reads its notes in the studio voice once they are recorded', async ({ page }) => {
    await needsStudioVoice(page);
    const st = await setup(page);
    await open(page, '#/sutras');
    const n = await st.recordKey('roots');
    expect(n).toBe(8);
    const want: string[] = await page.evaluate(async v => {
      const { lineHash } = await e2eMod('voice-plan');
      const { normalize } = await e2eMod('voice');
      const { linesForKey } = await e2eMod('explain-lines');
      return linesForKey('roots').map((t: string) => lineHash(v, normalize(t)));
    }, VOICE);
    const asked: string[] = []; // the recordings asked for, in order (each line has its own file)
    page.on('request', r => { const m = r.url().match(/voice\.learnvedicmath\.com\/l\/([0-9a-f]{14})\.m4a/); if (m) asked.push(m[1]); });
    const btn = page.getByRole('button', { name: 'Listen: older roots' });
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await vlog(page)).filter(e => e === 'studio:line').length, { timeout: 20_000 }).toBe(n);
    expect(asked).toEqual(want); // the intro, then each note, in the card's order
    await expect(btn).toHaveAttribute('aria-pressed', 'false', { timeout: 10_000 });
    expect(await spoken(page)).toEqual([]);
  });

  test('the Older roots card reads what it shows with the device voice when none is recorded', async ({ page }) => {
    await setup(page);
    await open(page, '#/sutras');
    const [want, shown] = await page.evaluate(async () => {
      const { normalize } = await e2eMod('voice');
      const { linesForKey } = await e2eMod('explain-lines');
      const card = document.querySelector('.md-card.roots')!;
      return [linesForKey('roots').map((t: string) => normalize(t)), [...card.querySelectorAll('p:not(.listen-row), li')].map(el => normalize(el.innerHTML))];
    });
    expect(want).toEqual(shown); // the button reads the words on the card
    await page.getByRole('button', { name: 'Listen: older roots' }).click();
    await expect.poll(async () => (await spoken(page)).join(' ')).toBe(want.join(' '));
    expect((await events(page)).filter(e => e.startsWith('math/listen'))).toEqual(['math/listen/explanation']);
  });

  /* explanation-audio 4.2: a page introduction reads its fixed lines whole and the Player's own numbers as the page
     shows them; 4.3: a video's description, from the player (the Watch card is a button, so it cannot hold one);
     4.4: the rules of the badges still to earn */
  test('a page introduction plays its fixed lines in the studio voice and the Player\'s own numbers with the device voice', async ({ page }) => {
    await needsStudioVoice(page);
    const st = await setup(page);
    await open(page, '#/sutras');
    expect(await st.recordKey('lede:sutras')).toBe(1); // the fixed line; "You have collected 0 of 29." is the Player's own
    const btn = page.getByRole('button', { name: 'Listen: about this page' });
    const live = await page.evaluate(async key => {
      const { normalize } = await e2eMod('voice');
      const { linesForKey } = await e2eMod('explain-lines');
      return normalize(linesForKey(key).at(-1));
    }, (await btn.getAttribute('data-listen'))!);
    expect(live).toMatch(/^You have collected \d+ of 29\.$/);
    await btn.click();
    await expect.poll(async () => (await vlog(page)).filter(e => e === 'studio:line' || e === 'builtin'), { timeout: 20_000 }).toEqual(['studio:line', 'builtin']);
    await expect.poll(async () => (await spoken(page)).join(' ')).toBe(live);
    await expect(btn).toHaveAttribute('aria-pressed', 'false', { timeout: 10_000 });
  });

  test('a page introduction reads the words the page shows with the device voice when none is recorded', async ({ page }) => {
    await setup(page);
    for (const route of ['#/learn', '#/grade/3', '#/games', '#/guide']) {
      await open(page, route);
      await page.evaluate(() => { (window as any).__spoken.length = 0; });
      const btn = page.getByRole('button', { name: 'Listen: about this page' });
      const [want, shown] = await page.evaluate(async key => {
        const { normalize } = await e2eMod('voice');
        const { linesForKey } = await e2eMod('explain-lines');
        const lede = document.querySelector('#view .md-lede')!, kid = lede.querySelector(document.body.classList.contains('kidmode') ? '.kid' : '.pro');
        return [linesForKey(key).map((t: string) => normalize(t)).join(' '), normalize((kid || lede).innerHTML)];
      }, (await btn.getAttribute('data-listen'))!);
      expect(want, route).toBe(shown); // the button reads the words on the page
      await btn.click();
      await expect.poll(async () => (await spoken(page)).join(' '), route).toBe(want);
      await expect(btn).toHaveAttribute('aria-pressed', 'false');
    }
  });

  test('the player reads the video\'s description, and pressing play stops it', async ({ page }) => {
    await setup(page, { endAfter: 4000 });
    await page.route(/^https:\/\/(www\.)?youtube(-nocookie)?\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }));
    await open(page, '#/watch');
    await page.locator('.watch-card[data-watch]').first().click();
    const dlg = page.locator('dialog.vm-player');
    await expect(dlg).toBeVisible();
    const why = await dlg.locator('.vp-why').evaluate(async el => (await e2eMod('voice')).normalize(el.innerHTML));
    expect(why.length).toBeGreaterThan(10);
    await expect(dlg.locator('.vp-desc')).toHaveText(/^.+ \(.+\)$/); // the description, then its channel
    const btn = dlg.getByRole('button', { name: 'Listen: about this video' });
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await spoken(page)).join(' ')).toContain(why.split(' ').slice(0, 3).join(' '));
    await dlg.locator('.vp-play').click();
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await dlg.locator('.vp-x').click();
    await expect(dlg).toBeHidden();
  });

  test('the Me page reads the rules of the badges still to earn', async ({ page }) => {
    await setup(page);
    await open(page, '#/me');
    const want = await page.evaluate(async () => {
      const { normalize } = await e2eMod('voice');
      return [...document.querySelectorAll('.badge:not(.got) small')].map(el => normalize(el.innerHTML));
    });
    expect(want.length).toBeGreaterThan(5);
    await page.getByRole('button', { name: 'Listen: the badges to earn' }).click();
    await expect.poll(async () => (await vlog(page)).filter(e => e === 'builtin').length, { timeout: 20_000 }).toBe(want.length);
    await expect.poll(async () => (await spoken(page)).join(' ')).toBe(want.join(' '));
  });

  /* explanation-audio 4.1: the Star replay's steps, once they are all shown; ending the replay stops it */
  test('a Star replay reads its steps once they are all shown, and Escape stops it', async ({ page }) => {
    await setup(page, { endAfter: 4000 });
    await open(page, '#/star/sq5/1');
    await expect(page.locator('#stMain .star-tag')).toHaveText('Question 1 of 4');
    await page.keyboard.type('1'); await page.keyboard.press('Enter');
    await expect(page.locator('.star-replay')).toBeVisible();
    const btn = page.getByRole('button', { name: 'Listen: the steps' });
    await expect(btn).toHaveCount(0); // not while the steps are still appearing
    await expect(page.locator('#stRGo')).toBeVisible({ timeout: 20_000 });
    await expect(btn).toBeVisible();
    const first = (await page.locator('.star-step > p').first().innerText()).trim();
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await spoken(page)).join(' ')).toContain(first.split(' ').slice(0, 3).join(' '));
    const before = (await spoken(page)).length;
    await page.keyboard.press('Escape');
    await expect(page.locator('#stMain .star-tag')).toHaveText('Rematch');
    await page.waitForTimeout(5000); // past the first sentence's end: the next step must not start
    expect((await spoken(page)).length).toBe(before);
    expect((await events(page)).filter(e => e === 'math/listen/explanation')).toHaveLength(1);
  });

  test('a tour step has its own Listen button', async ({ page }) => {
    await setup(page, { endAfter: 4000 });
    await open(page, '#/guide');
    await page.locator('[data-gd="tour"]').first().click();
    const tour = page.locator('dialog.vm-tour');
    await expect(tour).toBeVisible();
    const btn = tour.getByRole('button', { name: 'Listen: this step' });
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await spoken(page)).join(' ')).toContain((await tour.locator('#tourB').innerText()).split(' ').slice(0, 3).join(' '));
    await tour.getByRole('button', { name: 'Next' }).click();
    await expect(tour.getByRole('button', { name: 'Listen: this step' })).toHaveAttribute('aria-pressed', 'false');
  });
});

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`Listen, ${scheme} scheme`, () => {
    test.use({ colorScheme: scheme, seedMode: 'challenger' });
    test('a playing button on a Skill page has no serious axe violations', async ({ page }) => {
      await setup(page, { endAfter: 8000 });
      await open(page, '#/skill/3-mult');
      const btn = page.getByRole('button', { name: 'Listen: the idea and how it works' });
      await btn.click();
      await expect(btn).toHaveAttribute('aria-pressed', 'true');
      const res = await new AxeBuilder({ page }).include('.listen-btn').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id + ': ' + v.nodes.map(n => n.failureSummary).join(' | '))).toEqual([]);
    });
  });
}
