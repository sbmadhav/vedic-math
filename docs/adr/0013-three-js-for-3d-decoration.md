# Three.js for 3D decoration

The owner wants the Sky, Sutra deep-dive illustrations, game effects and Mandala art to become 3D. ADR 0011 planned a hand-written WebGL 2 engine with no library, which is small but cannot do real 3D without a lot of code nobody else knows. We use three.js through React Three Fiber and drei, bundled from our own origin (no CDN, inside the CSP, no `eval`), with only the three.js classes a scene uses. 3D loads late, only on routes that show it and after the page is usable: the Sky first shows the 2D Sky, then fades into 3D. The 3D code stays under 170 KB Brotli (about 200 KB gzip) and never enters a first load, both checked in CI. 3D renders on the main thread. Calm, Pause motion and reduced motion get a still frame; no WebGL, or a scene that stays under 30 frames a second for 3 seconds, gets the 2D canvas or SVG; a hidden tab pauses rendering. ADR 0011's other rule stands: 3D is decoration only, never interface.

Status: proposed 2026-10-17 in the `react-typescript` change (owner decision 13, approved); its open questions (main thread, Brotli budget, the Sky first, the frame-rate fallback) answered by the owner 2026-10-19. Supersedes ADR 0011's "no library" option, its 20 KB decoration budget and its OffscreenCanvas worker, and `gpu-effects`' "no three.js". Order: the Sky (the first 3D scene, shipped inside `react-typescript`), then Sutra deep-dive illustrations, then game effects and Mandala (in the revised `gpu-effects`).

## Considered Options

- **The hand-written WebGL 2 engine of ADR 0011:** about 20 KB, but 2D-style particles only, two renderers per scene to keep alike, and code only its author knows.
- **PixiJS:** fast 2D, no 3D.
- **Babylon.js:** complete, but larger and not React-first.
- **three.js from a CDN:** a new CSP origin and a third-party request on a children's site, and not in the offline precache.
- **3D in the first load:** fails the "first load does not grow" budget.

## Consequences

- A 3D scene is a React component with the route's lifecycle: it stops and frees its GPU resources when the route changes.
- React Three Fiber renders on the main thread, and pauses when the tab is hidden; ADR 0011's OffscreenCanvas worker is not carried over (owner, 2026-10-19).
- The size budget is tight for React Three Fiber plus drei; a measured spike decides before any scene is built, and going over goes back to the owner.
- drei helpers that fetch from other origins (environment presets, default fonts) are banned by lint.
