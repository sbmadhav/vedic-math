# React and TypeScript for the game

The game is about 40 hand-written ES modules with no framework and no bundler, and its views draw themselves by assigning template strings to `innerHTML` (about 120 places), so cross-site scripting is a class of bug the code invites, and cleanup depends on every author remembering `js/life.js`. We move the game at `/play/` to React 19 with the React Compiler, Vite, TypeScript `strict` and React Router v7 in SPA mode with build-time prerendering of public routes, step by step: the router mounts a Legacy view or a React view per route, and each pull request moves a few views with the Playwright suite green. Game, math and storage logic stays framework-free TypeScript (`shared/` for code the Duel server also uses, `app/src/logic/` for the rest), read by React through one `useStore(selector)` hook on `useSyncExternalStore`. Styles stay plain CSS on the design-system tokens, one file per component. The service worker stays hand-written (`sw.ts`), its precache list made from Vite's manifest. One repo with pnpm workspaces: `app/`, `workers/`, `shared/`.

Status: proposed 2026-10-17 in the `react-typescript` change (owner decisions 1 to 13, approved; path URLs pending as Q18). Supersedes the option "TypeScript in the browser app too" that ADR 0010 rejected, and the "no framework, no bundler" rule in `openspec/config.yaml` and the `learnvedicmath` design. Numbered after `gpu-effects` (0011).

## Considered Options

- **Stay on vanilla modules with JSDoc and `checkJs`** (ADR 0010's choice for the browser): no build step, but no component model, so `innerHTML` stays the way to draw and the XSS class stays.
- **Preact, Solid, Svelte or Lit:** smaller runtimes, but fewer people know them, and React Three Fiber (ADR 0013) is React only.
- **Next.js, or React Router with a server:** needs request-time rendering or a Node host; the site is static assets (ADR 0004).
- **A big-bang rewrite on a branch:** months of drift against content and feature work, and one unreviewable merge.
- **Redux or Zustand for state:** a second state model next to localStorage, which the store already owns.
- **Tailwind or CSS-in-JS:** a second design vocabulary, or `style-src 'unsafe-inline'` against the move's stricter policy.
- **Workbox for the worker:** replaces a short, tested worker with configuration and a runtime.

## Consequences

- Nothing a Player sees or stores changes, except path URLs in `/play/` (old `#/` links are turned into paths by a pre-paint shim, forever) and a redone Star Quest layout on phones.
- `build.py` stops writing the import map and `?v=` stamps; Vite's hashed file names replace them. The move's post-build steps (`_headers`, CSP hashes, `_redirects`, checks) stay.
- `js/life.js` and the lifecycle scan retire when the last Legacy view moves; an ESLint rule bans bare listeners and timers in components, and `dangerouslySetInnerHTML` is banned everywhere. Content stored as HTML text is shown only through one allow-list `Markup` component.
- React and React DOM add about 60 KB gzip; CI fails any regression in first load or interaction time against the pre-migration baseline.
- Feature pull requests pause only for the views being moved; each migration pull request names the views it locks.
- `placement`, `age-bands`, `duel-online`, `render-performance` and `gpu-effects` are built after this, in React, and are re-planned first.
