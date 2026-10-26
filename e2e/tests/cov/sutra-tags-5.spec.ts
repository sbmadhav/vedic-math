import { test, expect, open } from '../fixtures';

/* sutra-tags spec (openspec change sutras-first), Requirements "Every Trick maps to one Sutra and one relation" and
   "Honest notes, and no stretched tags": one test per scenario. The map's own rules are unit tests too
   (test/sutra-tag.test.mjs); here they are checked in the page the Player gets. */

test('Every Trick is mapped: each Trick has one card and one of the four relations, listed in its card, and the five honest ones are not "sutra"', async ({ page }) => {
  await open(page, '#/');
  const bad = await page.evaluate(async () => {
    const T = await e2eMod('sutra-tag'), V = await e2eMod('vedic');
    const out: string[] = [];
    for (const t of V.TRICKS) {
      const s = T.sutraOfTrick(t.id);
      if (!s || !T.CARDS[s.id] || !T.RELATIONS.includes(s.relation) || !T.CARDS[s.id].tricks.includes(t.id)) out.push(t.id);
    }
    for (const id of ['by11', 'div9', 'duplex', 'check9', 'times5']) if (T.RELATION[id] === 'sutra') out.push(id + ' is sutra');
    return out;
  });
  expect(bad).toEqual([]);
});

test.describe('Pro', () => {
  test.use({ seedMode: 'pro' });
  test('Digit sums: the Pro tag reads "Uses the idea of Guṇitasamuccayaḥ" and its note says casting out nines is much older than the 1965 book', async ({ page }) => {
    await open(page, '#/skill/v-check9');
    await expect(page.locator('.mq-sutra .sutra-tag-k')).toHaveText('Uses the idea of');
    await expect(page.locator('.mq-sutra b[lang="sa-Latn"]')).toHaveText('Guṇitasamuccayaḥ');
    await expect(page.locator('.mq-sutra .sutra-tag-note')).toContainText('The digit sum check, casting out nines, is much older than the 1965 book');
  });
});
