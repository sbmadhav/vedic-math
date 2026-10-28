# Migration to React and TypeScript (openspec change `react-typescript`)

The game is moving to React Router v7 (framework mode, server-rendered on Cloudflare Workers) and TypeScript, one view at a time (`openspec/changes/react-typescript/`, ADRs 0012 to 0014). Until the last view moves, Legacy views (the template-string code in `js/`) and React views run side by side under one router. This file and the "Migration in progress" section of `AGENTS.md` are rewritten in task 9.4, when the migration ends.

## Locked views

A Locked view is one a migration pull request is moving (its description starts with `Locks:`). A feature pull request that touches a Locked view waits for that pull request; content changes go ahead.

## Migration pull requests

A migration pull request changes no behavior. In `e2e/` it may change selectors, waits and URL forms, never what a test expects a Player to see or what is stored or sent, and its description lists every changed spec line.

## Server-safe code

New code is TypeScript, and React for views. A component and a custom hook's body run on the server too, so nothing a server render reaches reads `window`, `document`, `localStorage`, `sessionStorage` or `Date.now()`. Read them in an effect or an event handler, through a store hook that gives a server snapshot (`useSyncExternalStore`), or inside `<ClientOnly>`. Markup from content goes through the one `Markup` component. The lint rule `lvm/server-safe` enforces the first part (`docs/agent/build-and-checks.md`, Lint).
