# Proposal

> **Approval.** On 2026-10-30 the owner shared outside feedback (`_handoff/feedback/2026-10-30-growth-playbook.md`) and asked to "analyze this and create several todo tasks", under the standing delegation of 2026-10-29. Once merged, this change counts as approved for building. The calls are in design.md, each marked "owner-delegated, 2026-10-30".

## Why

The feedback's second engine: "the Sutras live behind hash routes (/play/#/sutras/...). Generate static HTML pages for the top 15 searches, e.g. /tricks/multiply-numbers-near-100/, /tricks/square-numbers-ending-in-5/", each with a calculator at the top that animates the method for the visitor's own numbers. Checked against `main` and the live site on 2026-10-30:

- **True: nothing about a Trick is indexable today.** Every Trick lesson is `/play/#/skill/v-<trick>` and every Sutra is `/play/#/sutras/<id>`; a fragment is not a separate page to a search engine. `https://learnvedicmath.com/sitemap.xml` lists nine URLs (`/`, `/licenses/`, `/parents/`, `/play/`, `/privacy/`, `/privacy/retention/`, `/privacy/security/`, `/teachers/`, `/terms/`); `robots.txt` allows everything. `/tricks/` and `/sutras/` are 404.
- **Planned but far off: prerendered Sutra pages.** `react-typescript` (design D5, Q20, task 5.3) prerenders `/learn/sutras/` and one page per Sutra and sub-sutra, with canonical links and the sitemap. That is phase 4, after phase 2, which waits for Workers Paid (owner task 0.8, not done). Nothing is prerendered today.
- **The calculator already exists inside the game.** Every Trick in `js/vedic.js` has `inputs`, `valid()` and `steps()` for any numbers the learner types, and the Trick lesson's "Watch it work" animator steps through them (`animatorHTML` and `mountAnimator` in `js/app.js`). The pages reuse it rather than write a second one.
- **Search finds a Trick by what it does, not by its Sutra's name.** People search "square numbers ending in 5", not "Ekādhikena Pūrveṇa". So the pages are per Trick, titled with the Trick's plain-English name (its `title` in `js/vedic.js`), with the Sutra right under it and its Deep dive one link away.

## What Changes

- **15 Trick pages and an index, at `/tricks/<slug>/` and `/tricks/`.** Static pages for the 15 arithmetic Tricks (design D2), each with: the Trick's name as the heading and its Sutra (Sanskrit name and meaning) under it; "Try it with your numbers", the calculator; when to use it and the idea; one worked example written out in full (shown with JavaScript off too); a line crediting Bharati Krishna Tirtha's 1965 book; and "Practice this trick", a link to the Trick's lesson in the game (`/play/#/skill/v-<trick>`). The index lists all 15 by name.
- **The calculator.** Type numbers (the Trick's own fields, with its limits and its friendly "Pick a number that ends in 5." messages), press Show steps, and walk the steps with Back and Next, or Show all. Earlier steps stay; nothing moves by itself; a step fades in only after a press and not under reduced motion, Pause motion or Calm. New numbers fills in a random valid example. With JavaScript off the page shows the worked example instead.
- **Findable.** Each page has its own `<title>`, description, canonical link, Open Graph tags and JSON-LD (`LearningResource` and `BreadcrumbList`); all 16 URLs join `sitemap.xml` through the build's existing page list.
- **Counted with fixed words.** `math/tricks/calc/<trick>` once per page load on the first Show steps, `math/tricks/practice/<trick>` on Practice this trick; the page view is GoatCounter's ordinary page count.

Unchanged: the game (`/play/`), its first-load bytes and its precache; the Trick lesson; the Sutra Deep dives; the landing page, except one link to `/tricks/` in its footer list.

## Capabilities

### New Capabilities

- `trick-pages`: the static Trick pages, their calculator, their search metadata, honest framing and their weight.

### Modified Capabilities

- `analytics`: new requirement "Trick page counts".

## Impact

- New: `tools/trick-pages/` (the generator, `pages.ts` data: slug, Trick id, worked example, description; the calculator `calculator.ts`), `site/tricks/index.html` and `site/tricks/<slug>/index.html` (generated, committed, checked fresh by a test, as `js/voice-index.js` is), `theme/tricks.css` (tokens only).
- `build.py`: publishes the calculator at `/tricks/calculator.js` with its types taken out, the way `tools/build-sw.mjs` publishes `/sw.js`; a per-page weight check for the Trick pages (design D7). The 16 pages join `_headers` (one rule each, 26 of Cloudflare's 100) and the sitemap without new code.
- `site/index.html` footer list: one link, "Speed tricks", to `/tricks/`.
- Owner: submit the sitemap in Search Console once the pages are live (owner setup section 16, learnvedicmath task 1.11).
- No spoken line changes: the pages have no read aloud.
- Tests: new `test/trick-pages.test.mjs`, `e2e/tests/trick-pages.spec.ts`, `e2e/tests/cov/trick-pages-1.spec.ts` to `trick-pages-5.spec.ts`, `e2e/tests/cov/analytics-15-trick-pages.spec.ts`; `a11y.spec.ts` gains a Trick page and the index.
