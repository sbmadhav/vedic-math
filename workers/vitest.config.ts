/* The Worker's tests run inside the Workers runtime (workerd, through Miniflare) with @cloudflare/vitest-plugin, the
   successor of @cloudflare/vitest-pool-workers (openspec change react-typescript, task 1.4). The Worker is configured
   here rather than from wrangler.jsonc, whose static assets (_site/) exist only after a build; the tests give the
   router a fake ASSETS binding. */
import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-plugin';

export default defineConfig({
  plugins: [cloudflareTest({ main: './src/index.ts', miniflare: { compatibilityDate: '2026-10-01' } })],
  test: {
    name: 'workers',
    include: ['src/**/*.test.ts'],
  },
});
