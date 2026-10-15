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
  expect(issues.console, 'console errors').toEqual([]);
});
