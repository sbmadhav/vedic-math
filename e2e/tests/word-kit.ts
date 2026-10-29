import { expect, type Page } from './fixtures';

/* Shared steps for the Word problem specs (openspec change word-problems). Word problems join a round once the Player
   has 20 saved answers (design D3), so these specs seed that progress; specs that read bare questions keep working
   because a fresh Player has none. */
export const READY = { v: 3, counts: { answers: 20, right: 20 } };

export const box = (page: Page) => page.locator('#practice');
export const label = (page: Page) => box(page).locator('#prStory');
export const question = (page: Page) => box(page).locator('#prQ');
const text = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Moves past the question on screen with Show me, then Next; n times. The score counts each one. */
export async function skip(page: Page, n = 1) {
  for (let i = 0; i < n; i++) {
    const before = (await box(page).locator('.pr-score').textContent()) || '0/0';
    const total = Number(before.split('/')[1]);
    const show = box(page).locator('#prShow');
    if (await show.isVisible()) await show.click();
    else for (let k = 0; k < 4 && (await box(page).locator('#prCheck').textContent()) !== 'Next'; k++) await box(page).locator('.pr-choice').nth(k).click(); /* Explorer: no Show me, so tap choices until the round moves on */
    await expect(box(page).locator('.pr-score')).toHaveText(new RegExp(`/${total + 1}$`));
    await box(page).locator('#prCheck').click();
    await expect(box(page).locator('#prCheck')).toHaveText('Check');
  }
}

/** The answer to a Two-step word problems question (the Challenger stories it draws from), from its words */
export function twoStepAnswer(q: string): number {
  const t = text(q).replace(/(\d),(\d{3})/g, '$1$2');
  let m = t.match(/buys (\d+) packs of \w+ with (\d+) in each pack, then gives (\d+) to friends/);
  if (m) return +m[1] * +m[2] - +m[3];
  m = t.match(/^(\d+) \w+ are shared equally among (\d+) friends/);
  if (m) return +m[1] / +m[2];
  m = t.match(/for (\d+) \w+ and a [\w ]+ for (\d+) \w+, and pays with 1000/);
  if (m) return 1000 - +m[1] - +m[2];
  m = t.match(/leaves at (\d+):(\d+) and arrives at (\d+):(\d+)/);
  if (m) return +m[3] * 60 + +m[4] - +m[1] * 60 - +m[2];
  throw new Error(`not a two-step story: ${t}`);
}

/** The whole numbers in a text, commas removed */
export const numbersIn = (s: string) => (s.match(/\d[\d,]*/g) || []).map(x => Number(x.replace(/,/g, '')));

/* ---------- Star rounds ---------- */
export const starTag = (page: Page) => page.locator('#stMain .star-tag');
export const starStory = (page: Page) => page.locator('#stMain #stStory');
/** The answer to the Star question on screen for Square numbers ending in 5: n² bare, or the square garden's area */
export async function sq5Answer(page: Page) {
  const html = await page.locator('#stQ').innerHTML();
  const m = html.match(/^(\d+)<sup>2<\/sup>/) || html.match(/is (\d+) m long on each side/);
  if (!m) throw new Error(`not a sq5 question: ${html}`);
  return String(+m[1] * +m[1]);
}
export async function enter(page: Page, v: string) { await page.keyboard.type(v); await page.keyboard.press('Enter'); }

/** Records what the Built-in voice is asked to say (the read-aloud spec's fake engine; the Studio voice is off) */
export async function recordSpeech(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__said = [];
    try { localStorage.setItem('vm.studioVoice', '0'); } catch (e) { /* storage blocked */ }
    const voice = { name: 'Samantha', lang: 'en-US', voiceURI: 'Samantha', localService: true, default: true };
    const fake = {
      getVoices: () => [voice], pending: false, speaking: false, paused: false,
      speak(u: any) { w.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 0); },
      cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {}
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    class Utterance { text: string; voice: unknown = null; lang = ''; pitch = 1; rate = 1; volume = 1; onend: null | (() => void) = null; onerror = null; constructor(t: string) { this.text = t; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
  });
}
export const said = (page: Page) => page.evaluate(() => ((window as any).__said as string[]).join(' '));
export const spoken = (page: Page, html: string) => page.evaluate(async h => (await e2eMod('voice')).normalize(h) as string, html);

/* ---------- Only Word problems and the Arena Word problems round (openspec change word-problems-more) ---------- */
export const onlyChoice = (page: Page, only: boolean) => page.locator(`#mixOnly [data-only="${only ? 1 : 0}"]`);
/** The Skill a mixed Practice question is from (the link over it) */
export const skillOf = async (page: Page) => ((await box(page).locator('.pr-meter small a').getAttribute('href')) || '').replace('#/skill/', '');

/** Records the answer of each story the Arena round deals (js/stories.js roundStory), so a spec can answer it right */
export async function watchRoundStories(page: Page) {
  await page.evaluate(async () => {
    const P = await e2eMod('story-plan'); await P.loadStories();
    const api = P.storiesNow(), real = api.roundStory, w = window as any;
    w.__storyAnswers = [];
    api.roundStory = (...a: unknown[]) => { const p = real(...a); w.__storyAnswers.push(p.answer); return p; };
  });
}
/** The answer to the Arena story on screen: the last one dealt */
export const roundAnswer = (page: Page) => page.evaluate(() => { const a = (window as any).__storyAnswers as number[]; return String(a[a.length - 1]); });
/** Starts the Arena's Word problems round from the lobby; chip: the Mode's word on it */
export async function startWordRound(page: Page, chip = 'Word problems') {
  await page.locator('[data-t="words"]').click();
  await expect(page.locator('[data-t="words"]')).toHaveText(chip);
  await expect(page.locator('[data-t="words"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#arGo').click();
  await expect(page.locator('#arQ')).not.toBeEmpty({ timeout: 6000 });
}
