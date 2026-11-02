import { test, expect, APP, chromiumOnly } from './fixtures';

/* Pages are prefetched between documents (openspec change render-performance, design D5, task 5.3, on the Legacy site):
   the landing and grown-up pages carry one Speculation Rules block, written by build.py, that prefetches a plain
   same-origin page link when it is hovered or touched. It lists no URL (one selector rule), so no game path, no query
   and no hash; its hash is in the page's content security policy, so the policy reports no violation for it. The game
   page carries none: its block, and the prerender of the game from the landing page, wait for a start-up that waits to
   be shown (design D6) on the React shell. */
test('the landing and grown-up pages prefetch plain same-origin page links on hover, by a rules block their policy allows; the game has none', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'Speculation Rules are Chromium\'s; other engines ignore the block');
  await page.addInitScript(() => {
    (window as any).__cspViolations = [] as string[];
    document.addEventListener('securitypolicyviolation', e => { if (e.disposition === 'enforce') (window as any).__cspViolations.push(`${e.violatedDirective} ${e.blockedURI} ${e.sample || ''}`); });
  });
  for (const url of ['/?home', '/parents/', '/privacy/']) {
    await page.goto(url);
    const blocks = await page.evaluate(() => [...document.querySelectorAll('script[type="speculationrules"]')].map(s => s.textContent || ''));
    expect(blocks, `${url} has one rules block`).toHaveLength(1);
    const rules = JSON.parse(blocks[0]!) as { prefetch: { where: { selector_matches: string }; eagerness: string }[] };
    expect(Object.keys(rules), `${url}: prefetch only`).toEqual(['prefetch']);
    expect(rules.prefetch).toHaveLength(1);
    expect(rules.prefetch[0]!.eagerness).toBe('moderate');
    /* One selector rule and no URL list, so no game path, query or hash is named */
    expect(Object.keys(rules.prefetch[0]!.where), `${url}: a selector rule`).toEqual(['selector_matches']);
    expect(JSON.stringify(rules), `${url}: no URL is listed`).not.toMatch(/\/play|\/learn|https?:|href_matches|"urls"/);
    /* What the rule matches on this page: plain same-origin page links, never one with a query or a hash */
    const matched = await page.evaluate(sel => [...document.querySelectorAll(sel)].map(a => a.getAttribute('href')), rules.prefetch[0]!.where.selector_matches);
    expect(matched.length, `${url}: the rule matches links on the page`).toBeGreaterThan(0);
    for (const h of matched) expect(h, `${h} is a plain same-origin page link`).toMatch(/^\/[^?#]*$/);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).__cspViolations as string[]), `${url}: the policy allows the block`).toEqual([]);
  }
  await page.goto(APP);
  await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
  expect(await page.locator('script[type="speculationrules"]').count(), 'the game page carries no rules block yet').toBe(0);
});
