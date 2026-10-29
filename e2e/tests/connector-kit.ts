import { expect, open, type Page } from './fixtures';

/* Digit connectors (openspec working-memory-scaffolds, trick-connectors spec): helpers shared by the specs */

/* Opens a Trick page and shows the animator's steps for these numbers */
export async function animate(page: Page, trick: string, a: number, b: number) {
  await open(page, `#/skill/v-${trick}`);
  const anim = page.locator('#anim');
  await anim.getByLabel('First number').fill(String(a));
  await anim.getByLabel('Second number').fill(String(b));
  await anim.getByRole('button', { name: 'Show steps' }).click();
  await expect(page.locator('#animPos')).toHaveText(/^1 \/ \d+$/);
  return anim;
}
/* The diagram on show: its text alternative and its lines' colours, in order */
export async function diagram(page: Page) {
  const svg = page.locator('#animLinks svg.cx');
  await expect(svg).toBeVisible();
  const colors = await svg.locator('line.cx-line').evaluateAll(ls => ls.map(l => [...l.classList].find(c => /^cx-(coral|teal|sky|sun|plum)$/.test(c))!.slice(3)));
  return { svg, label: await svg.getAttribute('aria-label'), colors };
}
export const next = (page: Page) => page.locator('#animNext').click();
