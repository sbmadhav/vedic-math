/* The Worker of learnvedicmath.com (wrangler.jsonc main; openspec change react-typescript, design D11, task 1.4).
   Every path is a static asset served without running this code, except the paths wrangler.jsonc lists in
   run_worker_first: /_csp, the policy-violation report endpoint (./csp.ts), and /api/*: the session tickets
   (./session.ts) and the Family conversation (./family/turn.ts; openspec family-helpers step 3). The VoiceLedger
   Durable Object (./ledger.ts) counts what the paid endpoints may spend. Phase 2 of react-typescript adds the server
   render of game pages (task 2.3). */
import { handle as cspReport } from './csp.ts';
import { handleSession } from './session.ts';
import { handleStatus, handleTurn } from './family/turn.ts';
import { VoiceLedger } from './ledger.ts';

export { VoiceLedger };

export type Env = {
  ASSETS: Fetcher;
  VOICE_LEDGER: DurableObjectNamespace<VoiceLedger>;
  /* Variables (wrangler.jsonc vars): the conversation's switch, its limits and the public Turnstile site key */
  FAMILY_ON?: string;
  FAMILY_TURNS_PER_HOUR?: string;
  FAMILY_TURNS_PER_DAY?: string;
  FAMILY_TURNS_PER_MONTH?: string;
  TURNSTILE_SITE_KEY?: string;
  /* Secrets (wrangler secret put), never in a file: the model provider's key, the Turnstile secret, the ticket key */
  ANTHROPIC_API_KEY?: string;
  TURNSTILE_SECRET?: string;
  TICKET_KEY?: string;
};

type Route = (request: Request, env: Env) => Promise<Response> | Response;
const ROUTES: Record<string, Route> = {
  '/_csp': request => cspReport(request),
  '/api/session': (request, env) => handleSession(request, env),
  '/api/family/v1/turn': (request, env) => handleTurn(request, env),
  '/api/family/v1/status': (_request, env) => handleStatus(env),
};

export default {
  async fetch(request, env) {
    const route = ROUTES[new URL(request.url).pathname];
    if (route) return route(request, env);
    return env.ASSETS.fetch(request); // not reached while run_worker_first lists /_csp and /api/* only
  },
} satisfies ExportedHandler<Env>;
