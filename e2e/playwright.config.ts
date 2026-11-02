import { defineConfig, devices } from '@playwright/test';

// End-to-end tests for Learn Vedic Math. They run against the LIVE site https://learnvedicmath.com/ (the game at
// /learn/) by default. Point them elsewhere with BASE_URL: a branch preview on workers.dev, or a local build of this
// checkout served the way Cloudflare serves it (_headers and _redirects applied):
//   python3 build.py --dev && node local-server.mjs 8124 _dev &  BASE_URL=http://localhost:8124 npx playwright test
// Production Firestore is never written to: see tests/fixtures.ts.
export const BASE_URL = (process.env.BASE_URL || 'https://learnvedicmath.com').replace(/\/$/, '');

// tests/cov holds one spec per live OpenSpec scenario (about 1,000 tests per project). That is too long for the
// CI job on three projects, so in CI they run on chromium only, and E2E_SKIP_COV=1 (the run after a push or on a
// preview) leaves them out. Locally every project runs them.
const COV = '**/cov/**';
const skipCov = process.env.E2E_SKIP_COV ? [COV] : [];
const covChromiumOnly = process.env.CI ? [COV] : skipCov;

export default defineConfig({
  testDir: './tests',
  // Fails fast with a clear message when the site is unreachable
  globalSetup: './global-setup.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 3 : 6,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Reduced motion: no confetti, the background draws once, card flips are instant
    reducedMotion: 'reduce',
    // The game registers /sw.js (scope /learn/). Playwright WebKit does not route requests from a
    // worker-controlled page, so the fake Firebase SDK and the local analytics answer would be bypassed
    // there; a page controlled by the worker also gets its files from the worker's cache, so a test would
    // not be testing what the network serves, and every fresh context would precache about 120 files.
    // Every spec runs without it except tests/offline.spec.ts, which turns it on with
    // test.use({ serviceWorkers: 'allow' }).
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: skipCov },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: covChromiumOnly },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: covChromiumOnly },
  ],
});
