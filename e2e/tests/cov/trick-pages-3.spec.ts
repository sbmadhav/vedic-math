import { test, expect } from '../fixtures';
import { TRICK_PAGES, INDEX, trickUrl } from '../trick-kit';

/* trick-pages spec, Requirement "Trick pages are findable": one test per scenario. The canonical names production
   whatever host serves the page. */
const ORIGIN = 'https://learnvedicmath.com';

test('Canonical and sitemap: every Trick page\'s canonical is its own URL, and sitemap.xml lists /tricks/ and all 15', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  expect(urls).toContain(`${ORIGIN}${INDEX}`);
  for (const t of TRICK_PAGES) {
    const url = `${ORIGIN}${trickUrl(t.slug)}`;
    expect(urls, `${url} is in the sitemap`).toContain(url);
    const html = await (await request.get(trickUrl(t.slug))).text();
    expect(html, t.slug).toContain(`<link rel="canonical" href="${url}">`);
    expect(html, t.slug).toContain(`<meta property="og:url" content="${url}">`);
    expect(html, t.slug).toMatch(/<title>[^<]+: the speed trick, step by step · Learn Vedic Math<\/title>/);
    expect(html, t.slug).toMatch(/<meta name="description" content="[^"]{20,159}">/);
    expect(html, t.slug).toContain('<meta property="og:image" content="https://learnvedicmath.com/icons/og.png">');
  }
  expect(urls.filter(u => u.includes('/tricks/'))).toHaveLength(16);
  expect((await (await request.get(INDEX)).text())).toContain(`<link rel="canonical" href="${ORIGIN}${INDEX}">`);
});

test('Structured data: a LearningResource named after the Trick and a BreadcrumbList of Home, Speed tricks and the Trick', async ({ page }) => {
  for (const t of TRICK_PAGES.slice(0, 3)) {
    await page.goto(trickUrl(t.slug));
    const blocks: unknown[] = await page.locator('script[type="application/ld+json"]').evaluateAll(els => els.map(e => JSON.parse(e.textContent || 'null')));
    expect(blocks).toHaveLength(1);
    const [resource, crumbs] = blocks[0] as [Record<string, unknown>, { '@type': string; itemListElement: { name: string; item: string; position: number }[] }];
    expect(resource['@type']).toBe('LearningResource');
    expect(resource.name).toBe(t.title);
    expect(resource.url).toBe(`${ORIGIN}${trickUrl(t.slug)}`);
    expect(resource.isAccessibleForFree).toBe(true);
    expect(resource.inLanguage).toBe('en');
    expect(resource.learningResourceType).toBe('interactive resource');
    expect(crumbs['@type']).toBe('BreadcrumbList');
    expect(crumbs.itemListElement.map(i => i.name)).toEqual(['Home', 'Speed tricks', t.title]);
    expect(crumbs.itemListElement.map(i => i.position)).toEqual([1, 2, 3]);
    expect(crumbs.itemListElement[2]?.item).toBe(`${ORIGIN}${trickUrl(t.slug)}`);
  }
});
