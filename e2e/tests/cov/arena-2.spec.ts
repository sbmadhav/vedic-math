import { test, expect, APP, open, cloudLog, appErrors, typeAnswer } from '../fixtures';
import type { Page } from '@playwright/test';

/* arena spec, Requirement: The switch-over never mixes a Board.
   Pro daily rounds dated before Monday 2026-10-19 keep the previous Pro question pool and seed; from that date
   on they use the mental arithmetic families. Every test leaves before the 60 second round ends, so no score
   is ever posted (the fake SDK would record it). */

/* A held clock at a fixed local time: time moves only when the test moves it */
async function heldAt(page: Page, local: string) {
  await page.addInitScript(() => { (window as any).goatcounter ||= { count() {} }; });
  const t = new Date(local);
  await page.clock.install({ time: t });
  await page.clock.pauseAt(t);
}

async function startDaily(page: Page) {
  await open(page, '#/arena');
  await expect(page.locator('[data-t="daily"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.g-best')).toContainText('League: Pro');
  await page.locator('#arGo').click();
  await page.clock.runFor(2200); // the 3, 2, 1 countdown
  await expect(page.locator('#arQ')).not.toBeEmpty();
}

/* The Pro daily round as it was dealt before the change (commit 860c963^), rebuilt here from the skill
   generators so the test does not lean on js/arena.js: the old Pro pool, the old seed text daily-<day>-pro,
   generator level 2, and the same seeded random. */
async function oldProDaily(page: Page, day: string) {
  return page.evaluate(async d => {
    const { byId } = await import('/js/skills/index.js' as string);
    const { shuffle } = await import('/js/lib.js' as string);
    const pool = ['v-near-base', 'v-duplex', '6-percent', '7-twostep', '8-exprules', 'v-sqroot', '6-exp', '8-multistep', '11-logs', 'v-square-near'];
    const mulberry32 = (a: number) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
    const real = Math.random; Math.random = mulberry32(hash(`daily-${d}-pro`));
    const out: { q: string; answer: number; skill: string }[] = [];
    try {
      let guard = 0;
      while (out.length < 80 && guard++ < 1600) {
        const s = byId[pool[Math.floor(Math.random() * pool.length)]]; if (!s) continue;
        const p = s.gen(2);
        if (p.kind !== 'num' || !Number.isInteger(p.answer) || Math.abs(p.answer) > 99999) continue;
        const near = [...new Set([p.answer, p.answer + 1, p.answer - 1, p.answer + 2, p.answer + 10, p.answer - 10])];
        shuffle([p.answer, ...shuffle(near.slice(1)).slice(0, 3)]); // consumes the same random draws as before
        const div = document.createElement('div'); div.innerHTML = p.q;
        out.push({ q: div.innerHTML, answer: p.answer, skill: s.id });
      }
    } finally { Math.random = real; }
    return out;
  }, day);
}

/* Plays n questions of the running round, answering each one right, and returns what was shown */
async function playOld(page: Page, expected: { q: string; answer: number }[], n: number) {
  const q = page.locator('#arQ');
  for (let k = 0; k < n; k++) {
    expect(await q.innerHTML(), `question ${k + 1} is the one dealt before the change`).toBe(expected[k].q);
    await expect(q, 'old Pro daily items have no difficulty step').not.toHaveAttribute('data-d', /.*/);
    const before = (await page.locator('#arScore').textContent()) || '';
    await typeAnswer(page, String(expected[k].answer));
    await page.locator('#arForm button').click();
    await expect(page.locator('#arScore'), 'the right answer scores').not.toHaveText(before);
    await expect(page.locator('#arSay')).toContainText('Right');
  }
}

const MENTAL = /^(\d+ × \d+ = \?|\d+2 = \?|What is \d+(\.5)?% of \d+\?|\d+ ÷ \d+ = \?)$/;
function mentalAnswer(text: string) {
  let m;
  if ((m = /^(\d+) × (\d+) = \?$/.exec(text))) return +m[1] * +m[2];
  if ((m = /^(\d+) ÷ (\d+) = \?$/.exec(text))) return +m[1] / +m[2];
  if ((m = /^What is (\d+(?:\.5)?)% of (\d+)\?$/.exec(text))) return Math.round(+m[1] * 10 * +m[2]) / 1000;
  if ((m = /^(\d+)2 = \?$/.exec(text))) return +m[1] * +m[1];
  throw new Error('not a mental arithmetic question: ' + text);
}

test.describe('pro switch-over', () => {
  test.use({ seedMode: 'pro' });

  test('the week before the switch: Thursday 2026-10-15 deals the same questions as before the change', async ({ page, issues }) => {
    await heldAt(page, '2026-10-15T10:00:00');
    await startDaily(page);
    const old = await oldProDaily(page, '2026-10-15');
    expect(old.length).toBe(80);
    await playOld(page, old, 8);
    await expect(page.locator('#arScore')).not.toHaveText('0');
    await page.goto(`${APP}#/learn`); // leave before the round ends: nothing is posted
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });

  test('the last evening of that week (Sunday 2026-10-18, 23:30 local) still deals the old questions', async ({ page }) => {
    await heldAt(page, '2026-10-18T23:30:00');
    await startDaily(page);
    const old = await oldProDaily(page, '2026-10-18');
    await playOld(page, old, 4);
    await page.goto(`${APP}#/learn`);
    expect((await cloudLog(page)).writes).toEqual([]);
  });

  test('the first day of the new set: Monday 2026-10-19 deals only mental arithmetic questions', async ({ page, issues }) => {
    await heldAt(page, '2026-10-19T00:05:00');
    await startDaily(page);
    const q = page.locator('#arQ');
    const old = await oldProDaily(page, '2026-10-19');
    let prevD = 0;
    for (let k = 0; k < 12; k++) {
      const text = (await q.textContent()) || '';
      expect(text, `question ${k + 1} is mental arithmetic`).toMatch(MENTAL);
      const d = Number(await q.getAttribute('data-d'));
      expect(d, 'mental items carry a difficulty step').toBeGreaterThanOrEqual(k === 0 ? 6 : prevD);
      if (k === 0) expect(d).toBe(6);
      prevD = d;
      expect(await q.innerHTML()).not.toBe(old[k].q);
      const before = (await page.locator('#arScore').textContent()) || '';
      await typeAnswer(page, String(mentalAnswer(text)));
      await page.locator('#arForm button').click();
      await expect(page.locator('#arScore'), 'the right answer scores').not.toHaveText(before);
      await expect(page.locator('#arSay')).toContainText('Right');
      if (k < 11) await expect(q).not.toHaveText(text);
    }
    // The whole 80 question round, as dealt for that date, comes from the five mental families
    const fams = await page.evaluate(async () => {
      const { dailySet } = await import('/js/arena.js' as string);
      const { FAMILIES } = await import('/js/mental.js' as string);
      const set = dailySet('pro', '2026-10-19') as { family?: string; skill?: string }[];
      return { n: set.length, bad: set.filter(it => !FAMILIES.includes(it.family) || it.skill).length, families: FAMILIES as string[] };
    });
    expect(fams.n).toBe(80);
    expect(fams.bad).toBe(0);
    expect(fams.families).toEqual(['mul2x2', 'square', 'percent', 'nearBase', 'divide']);
    await page.goto(`${APP}#/learn`);
    expect((await cloudLog(page)).writes).toEqual([]);
    expect(appErrors(issues), 'console errors').toEqual([]);
  });
});
