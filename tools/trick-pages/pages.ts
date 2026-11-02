/* The Trick pages (openspec change trick-pages): the 15 rows of design D2 and the renderers that turn a Trick from
   shared/src/vedic.ts (the catalog, js/vedic.js re-exports it) into site/tricks/<slug>/index.html and
   site/tricks/index.html. generate.ts writes them (pnpm gen:tricks); test/trick-pages.test.mjs checks the rows against
   the catalog and fails when a committed page is stale. Every string a page shows follows the copy rules (GLOSSARY
   words, the 1965 book wherever the source is named, no em dash). */
import { TRICKS } from '../../shared/src/vedic.ts';
import type { Trick, Vals } from '../../shared/src/vedic.ts';

export const ORIGIN = 'https://learnvedicmath.com';
export const SITE = 'Learn Vedic Math';
export const INDEX_URL = '/tricks/';
export const BOOK = "Bharati Krishna Tirtha's 1965 book <i>Vedic Mathematics</i>";

/** One Trick page: its Trick, its slug (lowercase words of what the Trick does, never changed once published), the
    worked example's numbers with the result the Trick's answer() must give, the sum as the page writes it, and the
    meta description (one sentence, under 160 characters). */
export interface TrickPage {
  trick: string;
  slug: string;
  example: number[];
  expected: number;
  question: string;
  description: string;
}

export const PAGES: readonly TrickPage[] = [
  { trick: 'sq5', slug: 'square-numbers-ending-in-5', example: [65], expected: 4225, question: '65²',
    description: 'Square any number ending in 5 in your head: multiply the part before the 5 by one more than itself, then write 25. Try it with your own numbers.' },
  { trick: 'near-base', slug: 'multiply-numbers-near-100', example: [97, 94], expected: 9118, question: '97 × 94',
    description: 'Multiply numbers near 10, 100 or 1000 in one line: write how far each is from the base, cross-subtract, multiply the distances. Step by step on your numbers.' },
  { trick: 'crosswise', slug: 'multiply-any-two-numbers-in-one-line', example: [21, 13], expected: 273, question: '21 × 13',
    description: 'Multiply any two numbers in one line, vertically and crosswise, with every column worked out on the numbers you type.' },
  { trick: 'from9', slug: 'subtract-from-100-or-1000', example: [387], expected: 613, question: '1000 − 387',
    description: 'Subtract from 100, 1000 or 10000 with no borrowing: all from 9 and the last from 10. See the steps for any number you type.' },
  { trick: 'by9s', slug: 'multiply-by-9-99-or-999', example: [42, 99], expected: 4158, question: '42 × 99',
    description: 'Multiply by 9, 99 or 999 in two steps: one less than the number on the left, and all from 9 on the right. Step by step on your numbers.' },
  { trick: 'ends10', slug: 'multiply-when-last-digits-add-to-10', example: [43, 47], expected: 2021, question: '43 × 47',
    description: 'Multiply two numbers that start the same and whose last digits add to 10, like 43 × 47, in two short steps on your own numbers.' },
  { trick: 'square-near', slug: 'square-numbers-near-100', example: [97], expected: 9409, question: '97²',
    description: 'Square a number near 10, 100 or 1000 in your head: move the distance from the base again, then square the distance. Try your own numbers.' },
  { trick: 'by11', slug: 'multiply-by-11', example: [23], expected: 253, question: '23 × 11',
    description: 'Multiply any number by 11 in your head: keep the outside digits and fill the middle with neighbour sums. See every step on a number you type.' },
  { trick: 'div9', slug: 'divide-by-9', example: [2301], expected: 255, question: '2301 ÷ 9',
    description: 'Divide any number by 9 with running sums of its digits: the quotient and the remainder, worked out step by step on your own number.' },
  { trick: 'check9', slug: 'check-answers-with-digit-sums', example: [23, 14], expected: 7, question: '23 × 14 = 322',
    description: 'Check a multiplication in seconds with digit sums (casting out nines): the digit sums must multiply to the digit sum of the answer. Try it on yours.' },
  { trick: 'times5', slug: 'multiply-by-5-25-50-or-125', example: [48, 25], expected: 1200, question: '48 × 25',
    description: 'Multiply by 5, 25, 50 or 125 in your head: multiply by 10, 100 or 1000, then halve or divide by 4 or 8. Step by step on your numbers.' },
  { trick: 'sub-base', slug: 'multiply-with-a-working-base', example: [46, 43], expected: 1978, question: '46 × 43',
    description: 'Multiply numbers near 20, 30, 40 or 50 with a working base: the near-base trick, scaled. See the steps for two numbers you type.' },
  { trick: 'duplex', slug: 'square-any-two-digit-number', example: [47], expected: 2209, question: '47²',
    description: 'Square any two-digit number in one line with the duplex: a², then 2ab, then b², carrying right to left. Try it on your own number.' },
  { trick: 'sqroot', slug: 'square-roots-in-your-head', example: [5329], expected: 73, question: '√5329',
    description: 'Find the square root of a perfect square by looking: the last digit gives two choices, the front gives the tens, one comparison picks the root.' },
  { trick: 'cuberoot', slug: 'cube-roots-in-your-head', example: [74088], expected: 42, question: '∛74088',
    description: 'Find the cube root of a perfect cube in two seconds: the last digit gives the last digit of the root, the thousands give the tens.' },
];

/** The header's nav on a Trick page: the same links every site page has, none of them the current page */
export const NAV = '<nav class="md-nav" aria-label="Learn Vedic Math"><a href="/play/">Learn</a><a href="/parents/">For parents</a><a href="/teachers/">For teachers</a></nav>';

/** The composed header block, written exactly as vendor/design-system/2.2.0/compose.py writes it from theme/header.html
    (the markers, the partial with its trailing newline normalized, the nav slot filled), so the build's header check
    passes without running compose.py here */
export function headerBlock(partial: string): string {
  const slot = '<!-- slot:nav --><!-- /slot:nav -->';
  if (!partial.includes(slot)) throw new Error('theme/header.html has no empty nav slot');
  const filled = partial.replace(/\n+$/, '').concat('\n').replace(slot, `<!-- slot:nav -->${NAV}<!-- /slot:nav -->`);
  return `<!-- md-header -->\n${filled}<!-- /md-header -->`;
}

/** A page's example as the catalog's four-slot tuple (a Trick reads the slots it has inputs for) */
export const vals = (page: TrickPage): Vals => [page.example[0] ?? 0, page.example[1] ?? 0, page.example[2] ?? 0, page.example[3] ?? 0];

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** JSON for a <script type="application/ld+json"> block: no "<" survives, so no text can close the script */
const ld = (data: unknown): string => JSON.stringify(data).replace(/</g, '\\u003c');

/** A Sutra's name without a bracketed note such as "(duplex)" or "(division by 9)", as the Say it button reads it */
export const sutraName = (t: Trick): string => t.sutra.replace(/\s*\(.*\)\s*$/, '');
/** A Sutra card s1 to s16 is one of the 16 sutras; u1 to u13 one of the 13 sub-sutras (js/sutras.js) */
const sutraKind = (t: Trick): string => (t.sutraId.startsWith('u') ? 'sub-sutra' : 'sutra');

const pageTitle = (t: Trick): string => `${t.title}: the speed trick, step by step`;

/** The head every page shares: metadata first, then the pre-paint script (the saved color scheme, Pause motion and
    Calm, read before paint; nothing is written), icons, fonts, styles, in the order the other site pages use */
function head(title: string, description: string, url: string, jsonLd: string, ogType: string): string {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · ${SITE}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${ORIGIN}${url}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${SITE}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${ORIGIN}${url}">
<meta property="og:image" content="${ORIGIN}/icons/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Learn Vedic Math logo: the digits one, zero and nine drawn as a smiling family">
<script>try{var d=document.documentElement,t=localStorage.getItem('theme');if(t==='light'||t==='dark')d.dataset.theme=t;if(localStorage.getItem('motion-paused')==='1')d.classList.add('motion-paused');if(localStorage.getItem('vm.calm')==='1')d.classList.add('calm');}catch(e){}</script>
<meta name="theme-color" content="#F6F7F9">
<link rel="icon" href="/icons/favicon-16.png" sizes="16x16" type="image/png">
<link rel="icon" href="/icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/icons/favicon-48.png" sizes="48x48" type="image/png">
<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="preload" href="/fonts/nunito-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/fredoka-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/ds/2.2.0/tokens.css">
<link rel="stylesheet" href="/theme/learnvedicmath.css">
<link rel="stylesheet" href="/theme/fonts.css">
<link rel="stylesheet" href="/ds/2.2.0/components.css">
<link rel="stylesheet" href="/theme/site.css">
<link rel="stylesheet" href="/theme/tricks.css">
<script type="application/ld+json">${jsonLd}</script>`;
}

const FOOTER = `<footer class="lv-foot">
  <div class="md-wrap">
    <p><a href="/play/">Learn</a> · <a href="${INDEX_URL}">Speed tricks</a> · <a href="/parents/">For parents</a> · <a href="/teachers/">For teachers</a> · <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <a href="/licenses/">Licences</a></p>
  </div>
</footer>`;

const crumbs = (items: [string, string | null][]): string =>
  `<nav class="tk-crumbs" aria-label="Breadcrumb"><ol>${items.map(([name, href]) => (href ? `<li><a href="${href}">${esc(name)}</a></li>` : `<li aria-current="page">${esc(name)}</li>`)).join('')}</ol></nav>`;

const breadcrumbLd = (items: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], k) => ({ '@type': 'ListItem', position: k + 1, name, item: ORIGIN + url })),
});

/** One Trick page (design D3, D5, D6, D8). The calculator block is in the HTML so nothing shifts when its module runs:
    the inputs hold the worked example's numbers, the module (tools/trick-pages/calculator.ts, published at
    /tricks/calculator.js) marks the block ready and draws steps only after a press. With JavaScript off the block is
    hidden (theme/tricks.css) and the worked example below stands in for it. */
export function renderTrickPage(page: TrickPage, t: Trick, header: string): string {
  const url = `${INDEX_URL}${page.slug}/`;
  const steps = t.steps(vals(page));
  const jsonLd = ld([
    {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: t.title,
      description: page.description,
      url: ORIGIN + url,
      teaches: t.idea,
      educationalLevel: `Grade ${t.grade}`,
      isAccessibleForFree: true,
      inLanguage: 'en',
      learningResourceType: 'interactive resource',
      isPartOf: { '@type': 'WebSite', name: SITE, url: `${ORIGIN}/` },
    },
    breadcrumbLd([['Home', '/'], ['Speed tricks', INDEX_URL], [t.title, url]]),
  ]);
  const inputs = t.inputs.map((f, i) => `<label>${esc(f.label)}<input type="number" inputmode="numeric" min="${f.min}" max="${f.max}" data-i="${i}" value="${page.example[i] ?? ''}"></label>`).join('\n        ');
  const example = steps.map(s => `<li><span class="tk-show">${s.show}</span><span class="tk-say">${s.say}</span></li>`).join('\n        ');
  return `<!doctype html>
<html lang="en">
<head>
${head(pageTitle(t), page.description, url, jsonLd, 'article')}
</head>
<body class="md-page md-root lv-tricks">
<a class="md-skip" href="#main">Skip to content</a>
${header}

<main id="main" tabindex="-1" class="md-section">
  <div class="md-wrap lv-page tk-page">
    ${crumbs([['Home', '/?home'], ['Speed tricks', INDEX_URL], [t.title, null]])}
    <h1>${esc(t.title)}</h1>
    <p class="tk-sutra">From the ${sutraKind(t)} <b lang="sa-Latn">${esc(sutraName(t))}</b>, <q>${esc(t.meaning)}</q>, in ${BOOK}. <a href="/play/#/sutras/${t.sutraId}">Deep dive into the ${sutraKind(t)}</a></p>
    <!-- The calculator (design D4): the Trick's own fields and limits; /tricks/calculator.js runs valid() and steps()
         from the catalog (shared/src/vedic.ts) for the typed numbers. Hidden with JavaScript off; unseen until the
         module marks it ready. -->
    <section class="tk-calc" id="tkCalc" data-trick="${t.id}" aria-labelledby="tk-calc-h">
      <h2 id="tk-calc-h">Try it with your numbers</h2>
      <form class="tk-in" id="tkForm" novalidate>
        ${inputs}
        <div class="tk-btns"><button type="submit" class="md-btn md-btn--primary" id="tkShow">Show steps</button><button type="button" class="md-btn" id="tkRand">New numbers</button></div>
      </form>
      <p class="tk-err" id="tkErr" role="alert"></p>
      <div class="tk-board" id="tkBoard"></div>
      <div class="tk-nav" id="tkNav" role="group" aria-label="Step by step" hidden>
        <p class="tk-at" id="tkAt" aria-live="polite" aria-atomic="true"></p>
        <button type="button" class="md-btn" id="tkBack" aria-disabled="true">Back</button>
        <button type="button" class="md-btn md-btn--primary" id="tkNext">Next</button>
        <button type="button" class="md-btn" id="tkAll">Show all</button>
      </div>
    </section>
    <h2>When to use it</h2>
    <p>${t.when}</p>
    <h2>The idea</h2>
    <p>${t.idea}</p>
    <section class="tk-example" aria-labelledby="tk-ex-h">
      <h2 id="tk-ex-h">Worked example: ${esc(page.question)}</h2>
      <ol class="tk-steps">
        ${example}
      </ol>
    </section>
    <p class="tk-practice"><a class="md-btn md-btn--primary" id="tkPractice" href="/play/#/skill/v-${t.id}">Practice this trick</a></p>
    <p class="tk-more">All <a href="${INDEX_URL}">15 speed tricks</a>, each with its calculator. The speed tricks use sutras from ${BOOK}; the lessons, problems and pictures here are our own.</p>
  </div>
</main>

${FOOTER}
<script src="/ds/2.2.0/header.js" defer></script>
<script type="module" src="/tricks/calculator.js"></script>
<script src="/js/analytics.js" defer></script>
</body>
</html>
`;
}

export const INDEX_TITLE = 'Speed tricks: 15 mental math methods, step by step';
export const INDEX_DESCRIPTION = "Fifteen speed tricks from Bharati Krishna Tirtha's 1965 book, each on its own page with a calculator that shows the steps for your numbers.";

/** The index at /tricks/: all 15 Trick pages by their Trick names, in the order of design D2 */
export function renderIndex(pages: readonly TrickPage[], tricks: readonly Trick[], header: string): string {
  const jsonLd = ld(breadcrumbLd([['Home', '/'], ['Speed tricks', INDEX_URL]]));
  const items = pages.map(p => {
    const t = trickOf(tricks, p.trick);
    return `<li><a href="${INDEX_URL}${p.slug}/">${esc(t.title)}</a><span class="tk-when">${t.when}</span></li>`;
  }).join('\n      ');
  return `<!doctype html>
<html lang="en">
<head>
${head(INDEX_TITLE, INDEX_DESCRIPTION, INDEX_URL, jsonLd, 'website')}
</head>
<body class="md-page md-root lv-tricks">
<a class="md-skip" href="#main">Skip to content</a>
${header}

<main id="main" tabindex="-1" class="md-section">
  <div class="md-wrap lv-page tk-page">
    ${crumbs([['Home', '/?home'], ['Speed tricks', null]])}
    <h1>Speed tricks</h1>
    <p class="md-lede">Fifteen ways to do a sum in your head in a line or two. Each one is built on a sutra from ${BOOK}, and each page has a calculator that works the steps on the numbers you type.</p>
    <ul class="tk-list">
      ${items}
    </ul>
    <p>Practice them with lessons, Katas and daily rounds in <a href="/play/">the game</a>. The sutras are not found in the Vedas: each one is ordinary algebra you can check, and the <a href="/play/#/sutras">29 sutras</a> page explains every one.</p>
  </div>
</main>

${FOOTER}
<script src="/ds/2.2.0/header.js" defer></script>
<script src="/js/analytics.js" defer></script>
</body>
</html>
`;
}

export function trickOf(tricks: readonly Trick[], id: string): Trick {
  const t = tricks.find(x => x.id === id);
  if (!t) throw new Error(`pages.ts names the Trick ${id}, which shared/src/vedic.ts does not have`);
  return t;
}

/** Every page as its path under site/ and its HTML, from the catalog and the header partial (theme/header.html) */
export function renderAll(headerPartial: string): Map<string, string> {
  const header = headerBlock(headerPartial);
  const out = new Map<string, string>();
  out.set('tricks/index.html', renderIndex(PAGES, TRICKS, header));
  for (const p of PAGES) out.set(`tricks/${p.slug}/index.html`, renderTrickPage(p, trickOf(TRICKS, p.trick), header));
  return out;
}
