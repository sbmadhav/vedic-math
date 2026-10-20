/* Online leaderboards (optional). Paste the Firebase web app config here to turn them on.
   The web config is public by design; security comes from firestore.rules (create-only, validated, anonymous auth).
   Leave as null to keep leaderboards on this device only. Setup steps: cloud/README.md in the repo */
/* Launch state (change learnvedicmath, tasks 1.8 and 8.5): learnvedicmath.com launches with Device boards only.
   The new Firebase project does not exist yet (owner task 1.8), and the old project's key and App Check site key are
   restricted to sbmadhav.com, so FIREBASE stays null and appCheckSiteKey stays empty: cloud.enabled() is false, no
   World board shows, nothing loads Firebase, and build.py leaves every Google host out of the CSP. Task 8.5 pastes the
   new project's web config and App Check key here (cloud/setup.sh prints both). */
export const FIREBASE = null;

/* Firebase App Check (optional, recommended): proves writes come from this site, not a script.
   Paste the reCAPTCHA site key registered for this web app in Firebase console > App Check.
   Empty means App Check stays off and nothing changes. Steps: cloud/README.md in the repo (App Check). */
export const appCheckSiteKey = '';
/* 'enterprise' for a reCAPTCHA Enterprise key (recommended), 'v3' for a classic reCAPTCHA v3 key. */
export const appCheckProvider = 'enterprise';
