/* The test environment (cloudflare:test env is typed Cloudflare.Env) carries the Worker's bindings: the VoiceLedger
   Durable Object and the variables and test secrets workers/vitest.config.ts declares, typed as the Worker's own Env. */
import type { Env as WorkerEnv } from './index.ts';

declare global {
  namespace Cloudflare {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- the declaration merge is the point
    interface Env extends WorkerEnv {}
  }
}
