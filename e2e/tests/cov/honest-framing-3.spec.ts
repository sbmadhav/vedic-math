import { test, expect, APP, open } from '../fixtures';

/* honest-framing spec, Requirement "Om is labelled as atmosphere": one test per scenario. */
const NOTE = 'Om is a sacred syllable added here for atmosphere. It is not part of the 1965 book.';

test('Me page: the Chanted Om switch shows the note beside it', async ({ page }) => {
  await open(page, '#/me');
  await expect(page.locator('#omNote')).toHaveText(NOTE);
  await expect(page.locator('#setOm')).toHaveAttribute('aria-describedby', 'omNote');
  const [sw, note] = await Promise.all([page.locator('#setOm').boundingBox(), page.locator('#omNote').boundingBox()]);
  expect(Math.abs(note!.y - sw!.y)).toBeLessThan(120);
});

test('Copy scan: the shipped scripts carry the Om note, and no string calls the Om or the ambience Vedic', async ({ page }) => {
  await open(page);
  const scripts = await page.evaluate(async () => {
    const map = JSON.parse(document.querySelector('script[type="importmap"]')?.textContent || '{"imports":{}}').imports as Record<string, string>;
    const urls = Object.keys(map).length ? Object.values(map) : ['/vedic-math/js/sutra-ambience.js', '/vedic-math/js/app.js'];
    const out: Record<string, string> = {};
    for (const u of urls) if (/sutra-ambience|app\.js/.test(u)) out[u] = await (await fetch(u)).text();
    return out;
  });
  const all = Object.values(scripts).join('\n');
  expect(all).toContain(NOTE);
  // No sentence puts "Vedic" together with the Om or the ambience
  const sentences = all.split(/(?<=[.!?'"`])\s+|\n/).filter(s => /\b(Om|ambience|bowl|hum)\b/i.test(s));
  expect(sentences.length).toBeGreaterThan(0);
  for (const s of sentences) expect(s, s.slice(0, 160)).not.toMatch(/vedic (om|chant|ambience|sound|bowl|hum)|(om|ambience|bowl|hum) (of|from) the vedas/i);
});
