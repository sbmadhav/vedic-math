import { test, expect, open } from './fixtures';

/* A backup code is outside data. An old single-Player code is read the way the hand-off packer reads a device: only
   numbers where the record holds numbers, so a crafted code cannot put markup on the Me page, the home strip, the
   Endless Run or the Arena lobby. It is written only after the Restore prompt's choice (progress-handoff spec). */
const X = '<img src=x class=injected onerror=alert(1)>';

test.describe('restoring a crafted backup code', () => {
  test.use({ seedMode: 'challenger' });

  test('markup in Sparks and best scores is dropped, and nothing lands in the page', async ({ page }) => {
    await open(page, '#/me');
    const day = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
    const data = { skills: {}, sparks: X, best: { 'run-1': X, ['arena-' + day]: X, 'run-2': 7 }, last: X };
    const code = Buffer.from(JSON.stringify({ data }), 'utf8').toString('base64');
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.type()); d.type() === 'prompt' ? d.accept(code) : d.dismiss(); });
    const before = await page.evaluate(() => localStorage.getItem('mathquest.v1.p1'));
    await page.locator('#pImport').click();
    // The prompt lists what the code holds (textContent: the markup is text at most) and writes nothing until Bring it
    await expect(page.locator('#pOfferList li')).toHaveText([/^[A-Z][a-z]+ [A-Z][a-z]+ \d\d: 0 Sparks$/]);
    await expect(page.locator('img.injected')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('mathquest.v1.p1'))).toBe(before);
    await page.locator('#pBring').click();
    await expect(page.locator('.me-head')).toContainText('0 Sparks');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!));
    expect(saved.sparks ?? 0).toBe(0);
    expect(saved.best).toEqual({ 'run-2': 7 });
    expect(saved.last ?? null).toBeNull();
    for (const hash of ['#/', '#/me', '#/run/1', '#/arena']) {
      await page.goto('/learn/' + hash);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('img.injected')).toHaveCount(0);
    }
    await page.goto('/learn/run/1');
    await expect(page.locator('.md-lede')).toContainText('Your best: 0.');
    expect(dialogs).toEqual(['prompt']);
  });
});
