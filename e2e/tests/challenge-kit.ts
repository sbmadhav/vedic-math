import { expect, mod, type Page } from './fixtures';

/* Shared by the challenge link specs (openspec change arena-challenge-link): a fixed local date, the link forms, a fake
   share sheet and clipboard, a stand-in World boards config (the fixtures' fake SDK answers it; nothing leaves the page)
   and the round helpers under a held clock. */

export const DAY = '2026-10-21'; // a Wednesday after the Pro switch to mental arithmetic (MENTAL_FROM 2026-10-19)
export const YESTERDAY = '2026-10-20';
export const WEEK = '2026-W43';
export const NOW = new Date(`${DAY}T10:00:00`);
/* The link's hash, with or without its Score part */
export const link = (day: string, league: string, score?: string) => `#/arena/day/${day}/${league}${score === undefined ? '' : `/${score}`}`;
/* The one canonical link the app writes (design D1): the live site, whatever host built it */
export const siteLink = (day: string, league: string, score: number) => `https://learnvedicmath.com/learn/arena/day/${day}/${league}/${score}`;

/* A fake clock held at a fixed local date, moved only by the test (as arena-5 does) */
export async function clockAt(page: Page, when: Date) {
  await page.addInitScript(() => { (window as any).goatcounter ||= { count() {} }; });
  await page.clock.install({ time: when });
  await page.clock.pauseAt(new Date(when.getTime() + 1000));
}
/* Jumps past the end of a 60 second round, then lets a frame or two run so the round clock sees it */
export async function endRound(page: Page) {
  await page.clock.fastForward(61_000);
  await page.clock.runFor(100);
}
/* Start, the 3, 2, 1 countdown, and the first question */
export async function pressStart(page: Page) {
  await page.locator('#arGo').click();
  await page.clock.runFor(2200);
  await expect(page.locator('#arQ')).not.toBeEmpty();
}
/* The Score after n right answers in a row: 10 each plus a combo bonus of 2 per answer in a row (up to 20) */
export const scoreAfter = (n: number) => { let s = 0; for (let c = 1; c <= n; c++) s += 10 + Math.min(c - 1, 10) * 2; return s; };

/* A League's daily set on a date, as the app deals it: each question's HTML and answer */
export async function dailyItems(page: Page, league: string, day: string): Promise<{ q: string; answer: number }[]> {
  return page.evaluate(async ([lg, d]) => {
    const A = await e2eMod('arena');
    const html = (h: string) => { const el = document.createElement('div'); el.innerHTML = h; return el.innerHTML; };
    return A.dailySet(lg, d).map((p: any) => ({ q: html(p.q), answer: p.answer }));
  }, [league, day] as const);
}
/* Answers the next n questions of a known set right, on the keypad (physical keys on a touch screen, see typeAnswer) */
export async function answerRight(page: Page, items: { q: string; answer: number }[], from: number, n: number) {
  const q = page.locator('#arQ');
  for (let i = from; i < from + n; i++) {
    expect(await q.innerHTML(), `question ${i + 1} is the set's`).toBe(items[i].q);
    const typ = page.locator('#arType');
    if (await typ.evaluate(e => (e as HTMLInputElement).readOnly)) await page.keyboard.type(String(items[i].answer));
    else await typ.fill(String(items[i].answer));
    await page.locator('#arForm button').click();
    await expect(q).not.toHaveText(items[i].q.replace(/<[^>]+>/g, ''));
  }
}

/* A share sheet that records what it was handed */
export async function fakeShareSheet(page: Page) {
  await page.addInitScript(() => {
    (window as any).__shared = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (d: unknown) => { (window as any).__shared.push(d); } });
  });
}
export const shared = (page: Page): Promise<{ title: string; text: string; url: string }[]> => page.evaluate(() => (window as any).__shared || []);
/* No share sheet, and a clipboard that records what was written */
export async function noShareSheet(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    (window as any).__copied = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t: string) => { (window as any).__copied.push(t); } } });
  });
}
export const copied = (page: Page): Promise<string[]> => page.evaluate(() => (window as any).__copied || []);

/* A stand-in Firebase config, so cloud.enabled() is true and the fixtures' fake SDK answers; the served config has no
   project until task 8.5 (device-only launch). Call before open(). */
export async function worldBoardsStandIn(page: Page) {
  const config = new URL(await mod(page, 'cloud-config'), 'http://x').pathname;
  await page.route(u => u.pathname === config, r => r.fulfill({ contentType: 'text/javascript', body: "export const FIREBASE = { apiKey: 'e2e', authDomain: 'e2e.invalid', projectId: 'e2e-fake', appId: 'e2e' };\nexport const appCheckSiteKey = '';\nexport const appCheckProvider = 'enterprise';\n" }));
}
/* Writes to a Score board (daily or weekly Arena, a game); the weekly Sparks board (xp-week-) is any Practice's */
export const scoreWrites = (writes: { path: string }[]) => writes.filter(w => /^boards\/(daily|week|g_)/.test(w.path));
export const deviceBoard = (page: Page): Promise<{ board: string; score: number }[]> => page.evaluate(() => JSON.parse(localStorage.getItem('vm.board') || '[]'));
