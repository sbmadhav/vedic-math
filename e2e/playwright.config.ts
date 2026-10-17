import { defineConfig, devices } from '@playwright/test';

// End-to-end tests for Vedic Math. They run against the LIVE site https://sbmadhav.com/vedic-math/
// and its real dependencies by default. Point them elsewhere with BASE_URL, for example a local
// server of this checkout (it proxies everything outside /vedic-math/ to the live site):
//   node local-server.mjs 8124 &  BASE_URL=http://localhost:8124 npx playwright test
// Production Firestore is never written to: see tests/fixtures.ts.
export const BASE_URL = (process.env.BASE_URL || 'https://sbmadhav.com').replace(/\/$/, '');

// tests/cov holds one spec per live OpenSpec scenario (about 1,000 tests per project). Against the live site
// that is too many requests for GitHub Pages (HTTP 429) and the 30-minute job, so in CI they run on chromium
// only, and E2E_SKIP_COV=1 (the run after a push) leaves them out. Locally every project runs them.
const COV = '**/cov/**';
const skipCov = process.env.E2E_SKIP_COV ? [COV] : [];
const covChromiumOnly = process.env.CI ? [COV] : skipCov;

export default defineConfig({
  testDir: './tests',
  // Fails fast with a clear message when the site is unreachable or GitHub Pages is rate limiting us
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
    // The app registers /vedic-math/sw.js. In a fresh test context it would install and precache about
    // 40 files (bypassing the HTTP cache) on top of the page's own requests, which roughly doubles the
    // load on GitHub Pages and gets this IP rate limited (HTTP 429, "Rate limit exceeded"). Worse, a
    // page controlled by the worker gets its same-origin files from the worker's cache, so a test
    // would not be testing what the network serves. Every spec runs without it except
    // tests/offline.spec.ts, which turns it on with test.use({ serviceWorkers: 'allow' }).
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: skipCov },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: covChromiumOnly },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: covChromiumOnly },
  ],
});
