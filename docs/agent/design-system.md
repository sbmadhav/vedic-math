# Design system, theme and header

The rules for using it (tokens, `var(--on-accent)`, both color schemes, the page chrome and wording) are in `CODING_STANDARDS.md`.

- The design system is a pinned copy in `vendor/design-system/2.1.0/`, published at `/ds/2.1.0/`, with a `SHA256SUMS` the build and `test/vendor.test.mjs` check. A new version is a deliberate pull request, never a hand edit.
- The brand theme is `theme/learnvedicmath.css`; it sets existing token names only.
- The header is `theme/header.html`. Every page holds it exactly as the vendored `compose.py` writes it; after editing the partial run `python3 vendor/design-system/2.1.0/compose.py theme/header.html <page>` for each page (the build and CI fail on a stale header).
