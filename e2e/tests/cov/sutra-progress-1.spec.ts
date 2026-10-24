import { test, expect, open } from '../fixtures';

/* sutra-progress spec (openspec change sutras-first), Requirement "Progress per Sutra comes from what the device
   keeps": one test per scenario. */

test('Same record, same progress: two of Ekādhikena\'s nine Stars lit and Square numbers ending in 5 mastered give 2 of 9 and 1 of 3, with the record unchanged', async ({ page }) => {
  await open(page, '#/');
  const out = await page.evaluate(async () => {
    const P = await e2eMod('sutra-progress'), S = await e2eMod('sutras');
    const rec = { lit: ['sq5:1', 'recip:2'], mastered: ['v-sq5'] }, frozen = JSON.stringify(rec);
    const p = P.progressOf(S.SUTRAS[0], { starState: (t: string, n: number) => (rec.lit.includes(`${t}:${n}`) ? 'lit' : 'open'), mastered: (id: string) => rec.mastered.includes(id), started: (id: string) => rec.mastered.includes(id), katasDone: () => 0, collected: () => false });
    return { line: P.progressLine(p, 'pro'), same: JSON.stringify(rec) === frozen };
  });
  expect(out).toEqual({ line: '2 of 9 Stars lit · 1 of 3 Tricks mastered', same: true });
});

test.describe('with a Star lit', () => {
  test.use({ seedProgress: { v: 3, skills: {}, sky: { lit: { 'sq5:1': 1 }, skipped: {}, last: {} } } });
  test('Nothing sent: the Sutras page, a Deep dive and Home send nothing about progress, and drawing them writes no progress', async ({ page }) => {
    const sent: string[] = [];
    page.on('request', r => { if (r.method() !== 'GET' || /[?&](p|t)=/.test(r.url())) sent.push(`${r.url()} ${r.postData() || ''}`); });
    await open(page, '#/');
    const keys = await page.evaluate(() => Object.keys(localStorage).sort());
    await page.evaluate(() => { location.hash = '#/sutras'; });
    await expect(page.locator('.sutra-card[data-id="s1"] .sutra-prog small')).toHaveText('1 of 9 Stars lit');
    await page.evaluate(() => { location.hash = '#/sutras/s1'; });
    await expect(page.locator('dialog.sutra-modal .sd-prog')).toBeVisible();
    expect(await page.evaluate(() => Object.keys(localStorage).sort())).toEqual(keys);
    expect(sent.filter(u => /Stars lit|progress|sq5/.test(u))).toEqual([]);
  });
});
