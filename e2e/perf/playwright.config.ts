import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from '../playwright.config';

// Interaction timings (perf/interactions.ts): chromium only, one worker so runs never compete for the CPU, each test
// repeated 5 times in a fresh context, no retries (a retry would hide a slow run). perf/report.ts writes the medians.
// Motion is not reduced: Players see the animations, so the timings include them.
export default defineConfig({
  testDir: '.',
  testMatch: 'interactions.ts',
  globalSetup: './reset.ts',
  globalTeardown: './report.ts',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  repeatEach: 5,
  reporter: [['list']],
  use: { baseURL: BASE_URL, serviceWorkers: 'block', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
