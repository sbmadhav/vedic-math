import { expect, type Page } from './fixtures';

/* Shared steps for the Family helper specs (openspec family-helpers): e2e/tests/family-helpers.spec.ts and the
   coverage specs in e2e/tests/cov/family-*.spec.ts. Practice runs on 3-mult (a × b), so a wrong answer is always
   a × b + 1, worked out from the question on screen. */
export const SKILL = '#/skill/3-mult';
export const ON = { family: true };
export const visit = (page: Page) => page.locator('.fh-visit');
export const friends = (page: Page) => page.locator('.fh-visit .fh-friend');
export const say = (page: Page) => page.locator('.fh-visit .fh-say');
export const who = (page: Page) => page.locator('.fh-visit .fh-who');
export const btn = (page: Page, name: string) => page.locator('.fh-visit .fh-btns button', { hasText: name });
export const ask = (page: Page) => page.locator('#practice [data-fh-ask]');

/** a and b of the a × b on screen */
export async function factors(page: Page) {
  const q = (await page.locator('#practice #prQ').textContent()) || '';
  const [a, b] = q.match(/\d+/g)!.map(Number);
  return { a, b, q };
}
/** One wrong try on the Practice question */
export async function miss(page: Page) {
  const { a, b } = await factors(page);
  await page.locator('#practice .ans-in').fill(String(a * b + 1));
  await page.locator('#practice #prCheck').click();
  await expect(page.locator('#practice #prSay')).toHaveClass(/\bno\b/);
}
/** Two wrong tries in a row on the same question */
export async function missTwice(page: Page) {
  await miss(page);
  await miss(page);
  await expect(page.locator('#practice #prSay')).toContainText('Hint');
}
/** Moves Practice to a new question: Show me, then Next */
export async function nextQuestion(page: Page) {
  const before = (await page.locator('#practice #prQ').textContent()) || '';
  if (await page.locator('#practice #prShow').isVisible()) await page.locator('#practice #prShow').click();
  await page.locator('#practice #prCheck').click();
  await expect(page.locator('#practice #prCheck')).toHaveText('Check');
  return before;
}
/** Closes the open Visit with Escape */
export async function closeVisit(page: Page) {
  await page.keyboard.press('Escape');
  await expect(visit(page)).toHaveCount(0);
}
/** Ask a friend, then the Visit is open */
export async function askFriend(page: Page) {
  await ask(page).click();
  await expect(visit(page)).toBeVisible();
}
/** Steps through a Visit's turns with Next, returning [speaker, words] for each */
export async function turns(page: Page) {
  const out: [string, string][] = [];
  for (let i = 0; i < 8; i++) {
    out.push([(await who(page).textContent()) || '', (await say(page).innerHTML()) || '']);
    const next = btn(page, 'Next');
    if (!(await next.count())) break;
    await next.click();
  }
  return out;
}
/** Whether two boxes overlap */
export const overlaps = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
