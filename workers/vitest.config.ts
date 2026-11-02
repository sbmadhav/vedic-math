/* The Worker's tests run inside the Workers runtime (workerd, through Miniflare) with @cloudflare/vitest-plugin, the
   successor of @cloudflare/vitest-pool-workers (openspec change react-typescript, task 1.4). The Worker is configured
   here rather than from wrangler.jsonc, whose static assets (_site/) exist only after a build; the tests give the
   router a fake ASSETS binding, the VoiceLedger Durable Object (SQLite, as wrangler.jsonc declares it) and test values
   for the variables and secrets of the Family conversation (openspec family-helpers step 3). The secrets here are
   test strings: the real ones exist only in Cloudflare (wrangler secret put) and never in a file. The entry is
   the ledger Worker's (src/ledger-worker.ts), which exports the VoiceLedger class the binding needs; the tests import
   the main Worker's router (src/index.ts) themselves. */
import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-plugin';

export default defineConfig({
  plugins: [cloudflareTest({
    main: './src/ledger-worker.ts',
    miniflare: {
      compatibilityDate: '2026-10-01',
      durableObjects: { VOICE_LEDGER: { className: 'VoiceLedger', useSQLite: true } },
      bindings: {
        FAMILY_ON: '1', FAMILY_TURNS_PER_HOUR: '20', FAMILY_TURNS_PER_DAY: '1250', FAMILY_TURNS_PER_MONTH: '12500', TURNSTILE_SITE_KEY: 'test-site-key',
        ANTHROPIC_API_KEY: 'test-model-key', TURNSTILE_SECRET: 'test-turnstile-secret', TICKET_KEY: 'test-ticket-key',
      },
    },
  })],
  test: {
    name: 'workers',
    include: ['src/**/*.test.ts'],
  },
});
