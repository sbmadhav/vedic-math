/* Vitest for the whole repo (openspec change react-typescript, task 1.6; it replaces node --test). One project per
   place tests live: the legacy tests in test/ (node:test style, through test/support/node-test.mjs, until their
   module converts and the test moves next to it), the build tools, the code the game and the Worker share (shared/),
   the service worker, and the Worker, whose tests run inside the Workers runtime (workers/vitest.config.ts). `pnpm test` runs them all. */
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/* The legacy tests' node:test API on Vitest. Aliased too, so a test written against node:test (as on branches made
   before the move) runs unchanged */
const NODE_TEST = fileURLToPath(new URL('./test/support/node-test.mjs', import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'legacy',
          root: '.',
          alias: { 'node:test': NODE_TEST },
          include: ['test/**/*.test.{js,mjs}'],
          environment: 'node',
          // Each file in its own process, as node --test ran them: many install globals (localStorage, document)
          pool: 'forks',
          isolate: true,
          // The build tests run python3 build.py several times; node --test had no per-test limit
          testTimeout: 180_000,
          hookTimeout: 180_000,
        },
      },
      {
        test: {
          name: 'tools',
          root: './tools',
          include: ['**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'shared',
          root: './shared',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'app',
          root: './app',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      './workers/vitest.config.ts',
    ],
  },
});
