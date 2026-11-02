# Design system, theme and header

The rules for using it (tokens, `var(--on-accent)`, both color schemes, the page chrome and wording) are in `CODING_STANDARDS.md`.

- The design system is a pinned copy in `vendor/design-system/2.2.0/`, published at `/ds/2.2.0/`, with a `SHA256SUMS` the build and `test/vendor.test.mjs` check. A new version is a deliberate pull request, never a hand edit.
- The brand theme is `theme/learnvedicmath.css`; it sets existing token names only.
- The header is `theme/header.html`. Every page holds it exactly as the vendored `compose.py` writes it; after editing the partial run `python3 vendor/design-system/2.2.0/compose.py theme/header.html <page>` for each page (the build and CI fail on a stale header). The Trick pages under `site/tricks/` are generated (`docs/agent/build-and-checks.md`, "Trick pages"): after editing the partial run `pnpm gen:tricks` for them instead, and change their look in `tools/trick-pages/pages.ts` and `theme/tricks.css`, never in `site/tricks/`.
- A new page outside the game loads, in this order, `/ds/2.2.0/tokens.css`, `/theme/learnvedicmath.css`, `/theme/fonts.css`, `/ds/2.2.0/components.css` and `/theme/site.css` (the shared page styles), then its own stylesheet if it needs one (`theme/tricks.css` is the example), carries the pre-paint script that applies the saved color scheme, Pause motion and Calm, and preloads Nunito Sans and Fredoka 600, the two fonts every page uses.
