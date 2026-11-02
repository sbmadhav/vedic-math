import { test, expect, cloudLog } from '../fixtures';
import { WARM, openWarm, nextUntil } from '../warm-up-kit';

/* teacher-warm-up spec (change teacher-warm-up), Requirement "The warm-up stores and sends nothing about anyone",
   Scenarios "Nothing stored" and "Honest words". */
test.use({ seedMode: null });

const GOOGLE = /(^|\.)(google\.com|gstatic\.com|googleapis\.com|googlevideo\.com|firebaseapp\.com|youtube\.com|youtube-nocookie\.com)$/;

test('Nothing stored: a whole warm-up leaves localStorage and sessionStorage as they were, loads no Firebase and reaches no Google host', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', r => { if (/^https?:/.test(r.url())) urls.push(r.url()); });
  await openWarm(page, 'by11');
  const snap = () => page.evaluate(() => [JSON.stringify(Object.entries(localStorage).sort()), JSON.stringify(Object.entries(sessionStorage).sort())]);
  const before = await snap();
  await nextUntil(page, 'Practice at home'); // every reveal and every step on the way
  await page.locator('#wuPick').selectOption('sq5');
  await nextUntil(page, 'Problem 1 of 3');
  expect(await snap()).toEqual(before);
  expect(urls.map(u => new URL(u).host).filter(h => GOOGLE.test(h))).toEqual([]);
  expect(urls.filter(u => /\/vendor\/firebase\//.test(u))).toEqual([]);
  expect((await cloudLog(page)).apps).toEqual([]);
});

test('Honest words: the warm-up and /teachers/ say the no sign-in sentence, link the privacy policy, claim nothing about privacy reviews or COPPA, and have no em dash', async ({ page }) => {
  for (const url of [WARM, '/teachers/']) {
    await page.goto(url);
    const text = await page.locator('body').innerText();
    expect(text, url).toContain('No sign-in and no student accounts. This page stores nothing on this device.');
    expect(text, url).not.toMatch(/privacy review|district review|IT approval|COPPA/i);
    expect(text, url).not.toContain('—');
    await expect(page.locator('main a[href="/privacy/"]').first(), url).toBeVisible();
  }
  await page.goto(WARM);
  await expect(page.locator('main')).toContainText("in Bharati Krishna Tirtha's 1965 book Vedic Mathematics");
});
