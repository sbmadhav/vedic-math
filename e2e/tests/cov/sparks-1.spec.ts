import { test, expect, open, type Page } from '../fixtures';

/* sparks spec, requirement "Sparks are the only progress number":
   - A right Practice answer: a first-try right answer with a streak of 2 earns 12 Sparks and says "+12 Sparks"
   - Copy scan: the shipped HTML and every string in the app's scripts never show "XP" */

/* Answers the 3-mult question on screen right (it reads "a × b"), first try, no hint */
async function answerRight(page: Page) {
  const box = page.locator('#practice');
  const q = (await box.locator('#prQ').textContent()) || '';
  const [a, b] = q.match(/\d+/g)!.map(Number);
  await box.locator('.ans-in').fill(String(a * b));
  await box.locator('#prCheck').click();
  await expect(box.locator('#prSay')).toHaveClass(/\bok\b/);
}

test('a right first-try Practice answer with a streak of 2 earns 12 Sparks and says "+12 Sparks"', async ({ page }) => {
  await open(page, '#/skill/3-mult');
  // Record every Sparks gain with its reason, so a quest bonus cannot blur the answer's own gain
  await page.evaluate(async () => {
    const store = await e2eMod('store');
    (window as any).__gains = [];
    store.on((type: string, d: any) => { if (type === 'sparks') (window as any).__gains.push({ n: d.n, why: d.why }); });
  });
  const box = page.locator('#practice');

  // First right answer: streak 1
  await answerRight(page);
  await expect(box.locator('#prSay .pr-sparks')).toHaveText('+11 Sparks');
  await box.locator('#prCheck').click(); // Next
  await expect(box.locator('#prCheck')).toHaveText('Check');

  // Second right answer in a row: streak of 2, 10 + 2 = 12 Sparks
  await answerRight(page);
  await expect(box.locator('#prSay .pr-sparks')).toHaveText('+12 Sparks');
  await expect(box.locator('#prSay')).toContainText('+12 Sparks');
  await expect(box.locator('#prSay')).not.toContainText(/\bXP\b/);
  const gains = await page.evaluate(() => (window as any).__gains as { n: number; why: string }[]);
  expect(gains.filter(g => g.why === 'answer').map(g => g.n)).toEqual([11, 12]);
  const streak = await page.evaluate(async () => (await e2eMod('store')).skill('3-mult').streak as number);
  expect(streak).toBe(2);
});

test('copy scan: the shipped HTML and every string in the app\'s scripts never show "XP"', async ({ page }) => {
  await open(page, '#/');
  const result = await page.evaluate(async () => {
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
    const saysXP = (l: string) => /\bXP\b/.test(l) || /experience points/i.test(l);
    const hits: string[] = [];
    const seen = new Set<string>();
    const base = location.origin;
    const html = await (await fetch('/learn/', { cache: 'no-store' })).text();
    strip(html).split('\n').forEach(l => { if (saysXP(l)) hits.push('index.html: ' + l.trim().slice(0, 120)); });
    const manifest = await (await fetch('/manifest.webmanifest', { cache: 'no-store' })).text();
    if (saysXP(manifest)) hits.push('manifest.webmanifest');
    // Every module the page can load: the entry script, then each static or dynamic import, recursively
    const queue = [...html.matchAll(/<script[^>]+src="([^"]*\/js\/[^"]+)"/g)].map(m => new URL(m[1], base).href);
    queue.push(new URL('/js/app.js', base).href);
    while (queue.length) {
      const url = queue.shift()!.split('?')[0];
      if (seen.has(url)) continue;
      seen.add(url);
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) { hits.push('missing ' + url); continue; }
      const src = await r.text();
      strip(src).split('\n').forEach(l => { if (saysXP(l)) hits.push(url.replace(base, '') + ': ' + l.trim().slice(0, 120)); });
      for (const m of src.matchAll(/(?:import|export)\s*(?:[\w*{}\s,$]+from\s*)?\(?\s*['"]([^'"]+\.js)(?:\?[^'"]*)?['"]/g)) {
        const next = new URL(m[1], url).href;
        if (next.startsWith(base + '/js/')) queue.push(next);
      }
    }
    return { hits, scanned: [...seen].map(u => u.replace(base, '')) };
  });
  // The scan really crawled the app: the entry, the store and the Practice code paths
  expect(result.scanned).toContain('/js/app.js');
  expect(result.scanned).toContain('/js/store.js');
  expect(result.scanned.length).toBeGreaterThan(5);
  expect(result.hits).toEqual([]);
  // And the rendered page itself shows no XP
  await expect(page.locator('body')).not.toContainText(/\bXP\b/);
});
