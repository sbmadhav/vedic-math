import { test, expect, open } from './fixtures';

/* A backup code is outside data. Restoring one keeps only numbers where the record holds numbers, so a crafted
   code cannot put markup on the Me page, the home strip, the Endless Run or the Arena lobby. */
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
    await page.locator('#pImport').click();
    await expect(page.locator('.me-head')).toContainText('0 Sparks');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mathquest.v1.p1')!));
    expect(saved.sparks).toBe(0);
    expect(saved.best).toEqual({ 'run-2': 7 });
    expect(saved.last).toBeNull();
    for (const hash of ['#/', '#/me']) {
      await page.goto('/vedic-math/' + hash);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('img.injected')).toHaveCount(0);
    }
    expect(dialogs).toEqual(['prompt']);
  });
});
