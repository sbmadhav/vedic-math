/* The Worker's tests run inside the Workers runtime (workerd, through Miniflare) with @cloudflare/vitest-plugin, the
   successor of @cloudflare/vitest-pool-workers (openspec change react-typescript, task 1.4). The Worker is configured
   here rather than from wrangler.jsonc, whose static assets (_site/) exist only after a build; the tests give the
   router a fake ASSETS binding. The entry is the ledger Worker's (src/ledger-worker.ts), which exports the VoiceLedger
   class the VOICE_LEDGER binding needs; the tests import the main Worker's router (src/index.ts) themselves. */
import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-plugin';

export default defineConfig({
  plugins: [cloudflareTest({ main: './src/ledger-worker.ts', miniflare: { compatibilityDate: '2026-10-01', durableObjects: { VOICE_LEDGER: { className: 'VoiceLedger', useSQLite: true } } } })],
  test: {
    name: 'workers',
    include: ['src/**/*.test.ts'],
  },
});
