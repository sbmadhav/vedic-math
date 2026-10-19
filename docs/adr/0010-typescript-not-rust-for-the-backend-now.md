# TypeScript, not Rust, for the backend now

The site now has server code: the CSP report endpoint (ADR 0004) and the online Duel service (ADR 0009), with more likely later (a small backend-for-frontend, checkout webhooks once a paid plan exists). We write it in TypeScript on Cloudflare Workers with strict type checking (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), in one small `worker/` project, tested inside the Workers runtime (`@cloudflare/vitest-pool-workers`). The modules shared with the browser stay plain JS with `// @ts-check` and JSDoc types, and the Worker's type check covers them, so the app keeps its no-build, no-framework modules while the server gets full types. Rust is used later only for one isolated, CPU-heavy module compiled to WASM, and only when a measurement shows TypeScript is too slow for it.

Status: proposed 2026-10-17 in the `duel-online` change (owner decision M3, accepted). ADR 0012, proposed in the `react-typescript` change, would supersede the rejected option "TypeScript in the browser app too"; neither change is approved for implementation yet.

## Considered Options

- **Rust (workers-rs) for the whole backend:** fast and safe, but the referee must use the same question generators as the app, which are JS; a Rust port would be a second copy that can drift, and Durable Object and WebSocket bindings are less mature in workers-rs. The work is I/O-bound (a few messages a second per match), where Rust gains nothing measurable.
- **Plain JavaScript in the Worker:** matches the app, but the server has protocol shapes, state machines and secrets where type errors are costly; strict TypeScript catches them before deploy at no runtime cost.
- **TypeScript in the browser app too:** would need a build step for every module and changes the app's conventions; JSDoc plus `checkJs` on the shared modules gives the safety where the two meet.

## Consequences

- `worker/` has its own `package.json`, `tsconfig.json` and tests, run in CI on every push; wrangler bundles the Worker and the shared JS modules.
- The rule for adding Rust: a profile shows a single function using more than a few milliseconds of CPU per call in production (Workers' CPU limits apply), the function has a pure input and output, and a WASM build of it is measured faster end to end. That is recorded in a new ADR when it happens.
- Contributors need Node and the Workers toolchain for the server, and nothing new for the app.
