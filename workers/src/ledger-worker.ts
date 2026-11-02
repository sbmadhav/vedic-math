/* The entry of the learnvedicmath-ledger Worker (workers/ledger/wrangler.jsonc): it only holds the VoiceLedger Durable
   Object (./ledger.ts), which the main Worker binds by script_name. The class lives here, not in the main Worker,
   because Cloudflare generates no preview URL for a Worker that implements a Durable Object, and every pull request's
   Preview needs one. Nothing routes to this Worker: it has no workers.dev or preview URL, and its fetch answers 404. */
import { VoiceLedger } from './ledger.ts';

export { VoiceLedger };

export default {
  fetch: () => Promise.resolve(new Response('Not found', { status: 404 })),
} satisfies ExportedHandler;
