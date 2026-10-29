import { expect, type Locator, type Page } from './fixtures';

/* Memory lock answer slots (openspec working-memory-scaffolds, split-answer spec): helpers shared by the specs */

/* The numbers in the question on screen ("98 × 97 = ?", "85<sup>2</sup> = ?"), without the square's 2 */
export async function questionVals(q: Locator): Promise<number[]> {
  const html = (await q.innerHTML()).replace(/<sup>\d<\/sup>/g, '').replace(/<[^>]+>/g, ' ').replace(/(\d),(\d)/g, '$1$2');
  return (html.match(/\d+/g) || []).map(Number);
}
/* The Trick's own left and right part for those numbers, worked out by the game's module */
export async function partsOf(page: Page, trick: string, vals: number[]): Promise<[string, string]> {
  return page.evaluate(async ([id, v]) => {
    const t = (await e2eMod('vedic')).TRICKS.find((x: { id: string }) => x.id === id);
    return t.parts(v) as [string, string];
  }, [trick, vals] as const);
}
/* The slots of the answer in root */
export const slots = (root: Locator) => ({
  group: root.getByRole('group', { name: 'Your answer in two parts' }),
  left: root.getByRole('textbox', { name: 'Left part' }),
  right: root.getByRole('textbox', { name: 'Right part' }),
  lock: root.getByRole('button', { name: 'Lock the left part' })
});
/* Types a whole answer into root's answer: the one box, or, where a Trick shows the two slots, every character but the
   last in the left slot and the last in the right (checking joins the two, so it is checked as the same answer) */
export async function fillAnswer(root: Locator, value: string) {
  const s = slots(root);
  if (await s.left.count()) { await s.left.fill(value.slice(0, -1)); await s.right.fill(value.slice(-1)); return; }
  await root.locator('.ans-in').fill(value);
}
/* Types the right answer into the slots and checks it with Enter, locking the left part on the way */
export async function answerInParts(page: Page, root: Locator, trick: string, q: Locator) {
  const [l, r] = await partsOf(page, trick, await questionVals(q));
  const s = slots(root);
  await s.left.fill(l);
  await s.left.press('Enter');
  await expect(s.right).toBeFocused();
  await s.right.fill(r);
  await s.right.press('Enter');
  return [l, r] as const;
}
