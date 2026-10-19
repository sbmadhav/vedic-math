/* Worker entry for learnvedicmath.com: wrangler.jsonc runs it only for /_csp (run_worker_first); every other path
   is a static asset served without it. What the endpoint keeps and refuses: worker/csp-lib.js. */
import { handle } from './csp-lib.js';

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/_csp') return handle(request);
    return env.ASSETS.fetch(request); // not reached while run_worker_first lists /_csp only
  },
};
