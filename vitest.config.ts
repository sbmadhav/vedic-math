/* Vitest for the whole repo (openspec change react-typescript, task 1.6; it replaces node --test). One project per
   place tests live: the legacy tests in test/ (node:test style, through test/support/node-test.mjs, until their
   module converts and the test moves next to it), the build tools, the service worker, and the Worker, whose tests
   run inside the Workers runtime (workers/vitest.config.ts). `pnpm test` runs them all. */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'legacy',
          root: '.',
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
