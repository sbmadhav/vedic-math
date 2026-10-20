# Leaderboards

Firebase with Firestore security rules. Setup, rules and the rules tests live in `cloud/` (see `cloud/README.md`). The browser client is `js/cloud.js`; the config is `js/cloud-config.js`.

- The web config in `js/cloud-config.js` is public by design; safety comes from `cloud/firestore.rules` (anonymous auth, validated create and update, no delete, reads limited to 20) and Firebase App Check (reCAPTCHA Enterprise key in the same file).
- Rules are tested against the emulator in `cloud/test` (`npm test` there; CI runs it as the `rules` job) and deployed by `cloud/setup.sh` (`firebase deploy --only firestore:rules,firestore:indexes`). A rules change is not live until someone runs that deploy.
- Who may post, what is sent and when an identity is created are governed by `docs/adr/0001`, `0002`, `0006` and `0008`; read them before changing `js/cloud.js` or the rules.
- Play experiences never post to the boards; leaderboards fall back to this device when offline.
- Launch state: `js/cloud-config.js` ships with `FIREBASE = null` and an empty `appCheckSiteKey` until the new project exists (change learnvedicmath, tasks 1.8 and 8.5). `cloud.enabled()` is false, so every Player has Device boards only, `submit` returns `reason: 'off'` without loading anything, and the build leaves the Google hosts out of the CSP. `test/cloud.test.mjs` gives `cloud.js` a sample config through a loader hook; `test/cloud-off.test.mjs` checks the committed one.
