import { test, expect, open, type Page } from './fixtures';

/* Answer checking and revealed answers in skill Practice (answer-checking and answer-display specs). */

/* A fixed Math.random, so the same questions come up on every run and engine */
async function seedRandom(page: Page, seed: number) {
  await page.addInitScript(s => {
    let a = s;
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, seed);
}
const xp = (page: Page) => page.evaluate(async () => (await import('/vedic-math/js/store.js' as string)).load().xp as number);

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

test('typing the question back is not an answer: no try, no score, no XP', async ({ page }) => {
  await seedRandom(page, 3);
  await open(page, '#/skill/3-mult');
  const box = page.locator('#practice');
  const before = await xp(page);
  const q = (await box.locator('#prQ').textContent()) || '';
  const [a, b] = q.match(/\d+/g)!.map(Number);
  await box.locator('.ans-in').fill(`${a}*${b}`);
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toContainText('Type just the answer');
  await expect(box.locator('#prSay')).not.toHaveClass(/\bno\b/);
  await expect(box.locator('.pr-score')).toHaveText('0/0');
  await expect(box.locator('#prCheck')).toHaveText('Check');
  expect(await xp(page)).toBe(before);
  // the plain answer still counts as a first try
  await box.locator('.ans-in').fill(String(a * b));
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
  await expect(box.locator('#prSay')).toContainText(/\+\d+ XP/);
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

test('a percent lesson links no counting videos', async ({ page }) => {
  await open(page, '#/skill/7-pctchange');
  await expect(page.locator('#view h1')).toBeVisible();
  await expect(page.locator('#view h1')).toHaveText(/Discounts, tax and percent change/);
  await expect(page.locator('.rel-links a', { hasText: /Numberblocks/i })).toHaveCount(0);
  await open(page, '#/skill/k-count');
  await expect(page.locator('.rel-links')).toContainText(/Numberblocks/);
});
