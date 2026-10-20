import { test, expect, open, appErrors, type Page } from './fixtures';

/* Answer checking and revealed answers in skill Practice (answer-checking and answer-display specs). */

/* A fixed Math.random, so the same questions come up on every run and engine */
async function seedRandom(page: Page, seed: number) {
  await page.addInitScript(s => {
    let a = s;
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, seed);
}
const sparks = (page: Page) => page.evaluate(async () => (await e2eMod('store')).sparks() as number);

/* The like-fractions question on screen: a/d + b/d (or minus), as numbers */
async function fracQuestion(page: Page) {
  const q = page.locator('#practice #prQ');
  const parts = await q.locator('.fr').evaluateAll(els => els.map(e => [...e.children].map(c => Number(c.textContent))));
  const sub = (await q.textContent() || '').includes('−');
  const [[a, d], [b]] = parts;
  return { n: sub ? a - b : a + b, d };
}
/* Moves on until the question's answer is more than 1 (Show me, then Next) */
async function untilMoreThanOne(page: Page) {
  const box = page.locator('#practice');
  for (let k = 0; k < 15; k++) {
    const f = await fracQuestion(page);
    if (f.n > f.d && f.n % f.d !== 0) return f;
    await box.locator('#prShow').click();
    await box.locator('#prCheck').click();
  }
  throw new Error('no question above 1 came up');
}

test('a mixed number is a right answer to a like-fractions sum above 1', async ({ page }) => {
  await seedRandom(page, 7);
  await open(page, '#/skill/4-fracadd');
  const box = page.locator('#practice');
  const { n, d } = await untilMoreThanOne(page);
  const mixed = `${Math.floor(n / d)} ${n % d}/${d}`;
  await box.locator('.ans-in').fill(mixed);
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
});

test('Show me on a fraction sum reveals a fraction and its mixed number, not a decimal', async ({ page }) => {
  await seedRandom(page, 11);
  await open(page, '#/skill/4-fracadd');
  const box = page.locator('#practice');
  const { n, d } = await untilMoreThanOne(page);
  await box.locator('#prShow').click();
  const ans = box.locator('#prSol .mq-ans b');
  const g = (x: number, y: number): number => (y ? g(y, x % y) : x);
  const k = g(n, d), N = n / k, D = d / k;
  await expect(ans).toHaveText(`${N}/${D} = ${Math.floor(N / D)} ${N % D}/${D}`);
  await expect(ans).not.toContainText('.');
});

test('typing the question back is not an answer: no try, no score, no Sparks', async ({ page }) => {
  await seedRandom(page, 3);
  await open(page, '#/skill/3-mult');
  const box = page.locator('#practice');
  const before = await sparks(page);
  const q = (await box.locator('#prQ').textContent()) || '';
  const [a, b] = q.match(/\d+/g)!.map(Number);
  await box.locator('.ans-in').fill(`${a}*${b}`);
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toContainText('Type just the answer');
  await expect(box.locator('#prSay')).not.toHaveClass(/\bno\b/);
  await expect(box.locator('.pr-score')).toHaveText('0/0');
  await expect(box.locator('#prCheck')).toHaveText('Check');
  expect(await sparks(page)).toBe(before);
  // the plain answer still counts as a first try
  await box.locator('.ans-in').fill(String(a * b));
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
  await expect(box.locator('#prSay')).toContainText(/\+\d+ Sparks/);
  await expect(box.locator('.pr-score')).toHaveText('1/1');
});

test('factoring with negative roots reveals real signs', async ({ page }) => {
  await open(page, '#/skill/9-factor');
  const box = page.locator('#practice');
  // Keep drawing until a question has a negative root, then reveal it
  for (let k = 0; k < 25; k++) {
    const q = (await box.locator('#prQ').textContent()) || '';
    await box.locator('#prShow').click();
    const ans = box.locator('#prSol .mq-ans b');
    const t = (await ans.textContent()) || '';
    expect(t).not.toMatch(/\+\s*[-−]|[-−]\s*[-−]|(^|[^\d.])1x/);
    expect(t).toMatch(/^\((\dx|x) [+−] \d\)\(x [+−] \d\)$/);
    if (/−/.test(t) && /Factor/.test(q)) return;
    await box.locator('#prCheck').click();
  }
  throw new Error('no factoring question with a negative root came up');
});

/* view-lifecycle spec: one tap, one action, however many questions came before in the session */
test('after 5 Practice questions a symbol key inserts once and "Want a hint?" gives one hint', async ({ page, issues }) => {
  await seedRandom(page, 5);
  await open(page, '#/skill/4-fracadd');
  const box = page.locator('#practice');
  for (let i = 0; i < 5; i++) {
    await box.locator('#prShow').click();
    await expect(box.locator('#prCheck')).toHaveText('Next');
    await box.locator('#prCheck').click();
    await expect(box.locator('#prCheck')).toHaveText('Check');
  }
  await expect(box.locator('.pr-score')).toHaveText('0/5');
  const input = box.locator('.ans-in');
  await input.fill('');
  await box.locator('.pr-key[data-k="/"]').click();
  await expect(input).toHaveValue('/');
  // A wrong first try offers the hint link; one tap writes one hint
  await input.fill('999');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay [data-hint]')).toBeVisible();
  const writes = await page.evaluate(() => {
    const say = document.querySelector('#practice #prSay')!;
    const obs = new MutationObserver(() => {}); obs.observe(say, { childList: true, subtree: true });
    (document.querySelector('#practice [data-hint]') as HTMLElement).click();
    const n = obs.takeRecords().filter(r => [...r.addedNodes].some(x => (x.textContent || '').includes('Hint:'))).length;
    obs.disconnect(); return n;
  });
  expect(writes).toBe(1);
  await expect(box.locator('#prSay')).toContainText('Hint:');
  expect(appErrors(issues), 'console errors').toEqual([]);
});

test('hundredths show a 10 by 10 grid with the right squares shaded, in both schemes', async ({ page }, testInfo) => {
  await seedRandom(page, 5);
  await open(page, '#/skill/4-decimals');
  const box = page.locator('#practice');
  for (let k = 0; k < 40; k++) {
    const q = (await box.locator('#prQ').innerHTML());
    if (/<span>100<\/span>/.test(q) && /\d*\.\d+ =/.test(q)) break;
    await box.locator('#prShow').click();
    await box.locator('#prCheck').click();
  }
  expect(await box.locator('#prQ').innerHTML(), 'a hundredths question came up').toMatch(/\d*\.\d+ =.*<span>100<\/span>/);
  const dec = Number(((await box.locator('#prQ').textContent()) || '').match(/\d*\.\d+/)![0]);
  const viz = box.locator('.mq-viz svg');
  await expect(viz).toHaveAttribute('aria-label', `${Math.round(dec * 100)} out of 100 equal squares shaded`);
  await expect(viz.locator('rect')).toHaveCount(100);
  await expect(viz.locator('rect.vz-coral')).toHaveCount(Math.round(dec * 100));
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await testInfo.attach(`hundredths-${scheme}`, { body: await viz.screenshot(), contentType: 'image/png' });
  }
});

test.describe('explorer', () => {
  test.use({ seedMode: 'explorer' });
  test('a percent lesson links no counting videos; the counting lesson does', async ({ page }) => {
    await open(page, '#/skill/7-pctchange');
    await expect(page.locator('#view h1')).toHaveText(/Discounts, tax and percent change/);
    await page.waitForFunction(() => e2eMod('videos'));
    await expect(page.locator('.rel-links button', { hasText: /count/i })).toHaveCount(0);
    await open(page, '#/skill/k-count');
    await expect(page.locator('.rel-links')).toContainText(/Count/);
  });
});

/* Skill Ratings (ratings spec): the Rating picks each Practice question's generator level; mastery is unchanged */
const progress = (page: Page) => page.evaluate(async () => (await e2eMod('store')).load());
/* The times-table question on screen, answered right on the first try */
async function answerTimes(page: Page, ok = true) {
  const box = page.locator('#practice');
  const [a, b] = ((await box.locator('#prQ').textContent()) || '').match(/\d+/g)!.map(Number);
  await box.locator('.ans-in').fill(String(ok ? a * b : a * b + 1));
  await box.locator('#prCheck').click();
}
async function nextQuestion(page: Page) {
  const box = page.locator('#practice');
  await expect(box.locator('#prCheck')).toHaveText('Next');
  await box.locator('#prCheck').click();
  await expect(box.locator('#prCheck')).toHaveText('Check');
}

test('10 right answers raise the Skill Rating and move later questions to level 2', async ({ page }) => {
  await seedRandom(page, 21);
  await open(page, '#/skill/3-mult');
  const q = page.locator('#practice #prQ');
  await expect(q).toHaveAttribute('data-level', '1'); // Challenger starts at 5: level 1
  const levels: number[] = [];
  for (let i = 0; i < 10; i++) {
    levels.push(Number(await q.getAttribute('data-level')));
    await answerTimes(page);
    await expect(page.locator('#practice #prSay')).toHaveClass(/\bok\b/);
    await nextQuestion(page);
  }
  expect(levels[0]).toBe(1);
  expect(levels.slice(3).every(l => l >= 2), `levels ${levels}`).toBe(true);
  await expect(q).not.toHaveAttribute('data-level', '1');
  // Saved after 10 answers, in this Player's progress on the device
  const p = await progress(page);
  expect(p.ratings['skill:3-mult']).toBeGreaterThan(5);
  // Leaving the Skill keeps the Rating, and the next visit starts there
  await page.goto('/play/#/learn');
  await open(page, '#/skill/3-mult');
  await expect(q).not.toHaveAttribute('data-level', '1');
});

test('mastery moves exactly as before Skill Ratings: a fixed answer sequence gives the same value', async ({ page }) => {
  await seedRandom(page, 4);
  await open(page, '#/skill/3-mult');
  const box = page.locator('#practice');
  // right, right, Show me, right on the second try, right, a miss shown after three tries, right
  const seq = ['right', 'right', 'show', 'second', 'right', 'miss', 'right'] as const;
  for (const step of seq) {
    if (step === 'show') await box.locator('#prShow').click();
    else if (step === 'second') { await answerTimes(page, false); await answerTimes(page); }
    else if (step === 'miss') { for (let k = 0; k < 3; k++) await answerTimes(page, false); }
    else await answerTimes(page);
    await nextQuestion(page);
  }
  // The mastery formula before this change: score 1 (first try), 0.5 (with help) or 0, rate 0.35 for the first 5 answers then 0.22
  let m = 0;
  seq.forEach((step, n) => { const score = step === 'right' ? 1 : step === 'second' ? 0.5 : 0; m = Math.round((m + (n < 5 ? 0.35 : 0.22) * (score - m)) * 1000) / 1000; });
  expect((await progress(page)).skills['3-mult'].m).toBe(m);
});
