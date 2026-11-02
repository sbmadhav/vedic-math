/* The Worker of learnvedicmath.com (wrangler.jsonc main; openspec change react-typescript, design D11, task 1.4).
   Every path is a static asset served without running this code, except the paths wrangler.jsonc lists in
   run_worker_first. The router below knows one of them today, /_csp, the policy-violation report endpoint
   (./csp.ts); phase 2 adds /api/* and the server render of game pages (task 2.3). */
import { handle as cspReport } from './csp.ts';
import type { VoiceLedger } from './ledger.ts';

/* VOICE_LEDGER is the VoiceLedger Durable Object (./ledger.ts), held by its own Worker, learnvedicmath-ledger
   (./ledger-worker.ts), and bound here by script_name: Cloudflare generates no preview URL for a Worker that implements
   a Durable Object. The Family conversation (openspec family-helpers step 3) and the server voice use it later. */

export type Env = { ASSETS: Fetcher; VOICE_LEDGER: DurableObjectNamespace<VoiceLedger> };

type Route = (request: Request, env: Env) => Promise<Response>;
const ROUTES: Record<string, Route> = {
  '/_csp': request => cspReport(request),
};

export default {
  async fetch(request, env) {
    const route = ROUTES[new URL(request.url).pathname];
    if (route) return route(request, env);
    return env.ASSETS.fetch(request); // not reached while run_worker_first lists /_csp only
  },
} satisfies ExportedHandler<Env>;
