import { test, expect } from '../fixtures';
import { TRICK_PAGES, INDEX, trickUrl } from '../trick-kit';

/* trick-pages spec, Requirement "Trick pages credit the 1965 book": the Copy scan scenario, over the served pages
   (test/copy.test.mjs scans the sources). A sentence may name the Vedas only to say the sutras are not in them. */
const BANNED = [/vedic sutras?\b/i, /traditional vedic mathematics/i];
const denies = (sentence: string) => /\bnot\b|\bnever\b/i.test(sentence);

test('Copy scan: each Trick page credits the 1965 book, and no page has a banned phrase or an em dash', async ({ request }) => {
  const pages = [INDEX, ...TRICK_PAGES.map(t => trickUrl(t.slug))];
  for (const url of pages) {
    const html = await (await request.get(url)).text();
    // The page's words: tags become spaces, so "book <i>Vedic Mathematics</i>." reads "book Vedic Mathematics ."
    const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    if (url !== INDEX) expect(text, url).toMatch(/From the (sub-)?sutra [^,]+ , .+? , in Bharati Krishna Tirtha's 1965 book Vedic Mathematics \./);
    expect(text, url).toContain("Bharati Krishna Tirtha's 1965 book");
    for (const re of BANNED) expect(text, `${url}: ${re}`).not.toMatch(re);
    for (const m of text.matchAll(/from the vedas/gi)) {
      const start = Math.max(text.lastIndexOf('.', m.index) + 1, 0), end = text.indexOf('.', m.index);
      expect(denies(text.slice(start, end < 0 ? undefined : end)), `${url}: "${text.slice(start, end).trim()}"`).toBe(true);
    }
    expect(html, `${url}: no em dash`).not.toMatch(new RegExp(`${String.fromCharCode(8212)}|&mdash;`));
  }
});
