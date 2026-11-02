# World boards (Firebase on Google Cloud)

Boards work on each device out of the box (Device boards). World boards connect a Firebase project of learnvedicmath.com's own (openspec change `learnvedicmath`, design D14). It is a new project: no World board identity, entry or saved id comes over from the old sbmadhav.com project.

Data model: `boards/{board}/scores/{uid}` with `{ name, avatar, score, ts, exp }`. Board ids look like `daily-2026-10-12-challenger`, `week-2026-W42-pro`, `g_times_sprint-daily-2026-10-12-pro` and `xp-week-2026-W42-explorer`. Three things write, always to the player's league: the Arena daily round and a Ranked game round (today's and this week's board each), and weekly Sparks (the `xp-week` board, at most once a minute; the id keeps the `xp-` prefix from when Sparks were called XP, see Boards). Nothing is written for a Player without an Age answer, and nothing ever for a Player whose Age answer is under 13 (`canPost()` in `js/cloud.js`, `docs/adr/0006`; see Privacy). Each Player who posts has their own anonymous identity, so each Player has their own entry per board, and it only changes when the new score is higher. The browser client is `js/cloud.js`; the config lives in `js/cloud-config.js`; the SDK is served from this site (`vendor/firebase/<version>/`).

## One command (recommended)

The project needs the **Blaze** plan (with a $5 budget and alerts at 50, 90 and 100 percent), because the TTL policy that deletes expired entries does not run on Spark (owner decision L3). On a machine with the Google Cloud CLI (`gcloud`) and Node.js, from the repo root:

```
bash cloud/setup.sh --dry-run learnvedicmath          # print every command first; nothing runs, nothing is written
APP_CHECK=1 bash cloud/setup.sh learnvedicmath        # the project id; the domains default to learnvedicmath.com and www
```

Other domains go after the project id: `bash cloud/setup.sh <project-id> example.com www.example.com`. It is safe to re-run. It:

1. Signs you in to `gcloud` and Firebase if needed (a browser window opens for each).
2. Creates the Google Cloud project if missing, enables the APIs and adds Firebase to it.
3. Creates the Firestore database in native mode (location `nam5`; override with `REGION=us-east1`).
4. Turns on Anonymous sign-in and sets the authorized domains to `localhost` and the given domains (Firebase's own hosting domains stay; any other domain is dropped).
5. Deploys `firestore.rules` and `firestore.indexes.json` from this folder.
6. Creates a Firebase web app if none exists and writes its config into `js/cloud-config.js`.
7. Turns on the Firestore TTL policy on `exp` (it fails, and says so, without Blaze).
8. With `APP_CHECK=1`: creates a reCAPTCHA Enterprise key for the given domains, registers the web app with App Check and writes the site key. Enforcement stays off (owner task 8.7).
9. Prints the next steps, the browser key restriction and a budget alert command.

If step 4 says Authentication is not initialized, open the Authentication page in the Firebase console, click **Get started** once, and run the script again.

The web config is public by design. Security comes from the rules and App Check (see below).

The browser key (Google Cloud console > APIs & Services > Credentials, "Browser key (auto created by Firebase)") is restricted to the referrers of the domains given to `cloud/setup.sh` (by default `https://learnvedicmath.com/*` and `https://www.learnvedicmath.com/*`; the script prints the list), `http://localhost:*/*`, `http://127.0.0.1:*/*` and the project's `firebaseapp.com`, and to the APIs the site uses: Firestore, Identity Toolkit, Secure Token, App Check and Firebase Installations. Previews on `workers.dev` are deliberately not in that list: they never post (the e2e suite uses a fake SDK).

## What the rules enforce

- Anonymous sign-in is required to write (and to read your own entry), and a player can write only `scores/{their uid}`. Nobody can delete from the browser.
- Fields: exactly `name`, `avatar`, `score`, `ts`, `exp`. The nickname must be `Adjective Noun NN` using the word lists in `js/store.js` (update the rules if those lists change). `ts` must be the server time. `exp` must be 29 to 31 days ahead (the client sends 30).
- Scores: even integers from 10 to a per-league cap (every right answer earns 10 to 30 points, always even). The game has no hard maximum, so the caps assume a fast human pace for 60 seconds: Explorer 2000 (70 right in a row), Challenger 1600 (57), Pro 1200 (44). `MAX_SCORE` in `js/cloud.js` mirrors them.
- Board window: a board accepts writes only while its date (or ISO week) is current somewhere on Earth, plus an hour of slack. Old and future boards are frozen.
- Rate limit: an entry changes only when the score rises and at least 50 seconds after its last write (a round plus countdown is 62 seconds).
- Reads: lists of a valid board need no sign-in but must use `limit(20)` or less, so viewing a World board creates no identity (`docs/adr/0002`). Getting one entry by its id needs that entry's own signed-in identity, so nobody browses entries one by one.
- Retention: a Board can be listed only until 28 days after it began. Every entry is written while its Board is open (at the earliest 15 hours before it begins) and expires at least 29 days after its write, so no list ever returns an expired entry, even before the TTL policy deletes it. `cloud.top()` also drops any row whose `exp` has passed.

These limits make forging harder and cheaper to absorb; they do not prove a score was earned. App Check closes the main gap: scripts writing directly to Firestore from outside the site.

## App Check

App Check makes Firestore accept requests only from this site, using reCAPTCHA Enterprise. The client wiring is in `js/cloud.js` and stays off until `appCheckSiteKey` in `js/cloud-config.js` is set (the script does it with `APP_CHECK=1`).

1. For local testing, open the site on `localhost`: the console prints an App Check debug token. Add it under App Check > Apps > Manage debug tokens (localhost is never a key domain).
2. Leave enforcement off for a few days and watch App Check > APIs > Cloud Firestore. When nearly all requests show as verified, click **Enforce** for Cloud Firestore, and for Authentication if the console offers it (owner task 8.7).
3. With enforcement on, even a list read needs an App Check token, so reCAPTCHA loads when a Player 13 or over taps Show World board. That is why World boards are behind a tap, and never offered to anyone else.

The build lists the reCAPTCHA and App Check hosts in the game's Content-Security-Policy only while `appCheckSiteKey` is set (`firebase_sources()` in `build.py`).

## Rules tests

`test/` runs `firestore.rules` against the local Firestore emulator with `@firebase/rules-unit-testing`. Needs Node.js 24.12+ and Java 21 (the emulator is a Java program). No Google account or project is used. CI runs them (the `rules` job).

```
cd cloud/test
npm install
npm test
```

Board ids in the tests are built from today's date, because past and future boards are frozen. They cover: creating your own entry in every league, writing another player's entry, invalid board ids, past and future boards, nicknames (shape and word lists), avatars, scores (odd, non-integer, below 10, over each league cap), extra or missing fields, a client-set `ts`, `exp` 29 to 31 days ahead, updates that do not raise the score, partial updates, the 50 second rate limit, deletes, reads of your own entry only, list queries (`limit` 20 or less, and only while the Board is under 28 days old), signed-out access, reads and writes elsewhere, a top-20 `orderBy('score', 'desc')` query with no composite index, and the arithmetic that keeps an expired entry out of every list. Run them after any change to `firestore.rules`.

## Privacy

- Players are anonymous: no email, name, age or account. The browser client is `js/cloud.js`, and everything it posts goes through `submit()`.
- **Age answer first** (`docs/adr/0001`): nothing is posted for a Player until they answer one neutral age question, asked the first time a Ranked round's score would be posted. The answer is stored only on the device, in that Player's record (`age` in `vm.players`), and is never sent.
- **The Grade answer stays on the device** (`docs/adr/0008`, openspec change `age-bands`): the grade question's answer (`reading` in `vm.players`: a grade, or an age) only chooses how much reading help Bolt gives (read aloud, shorter words, answer buttons, Practice clocks), never math difficulty, a League or a Board. It is in no request, no analytics event and no Board entry; it leaves the device only inside the Player's own progress (the backup code, the hand-off), and removing the Player removes it. An age given there is also the Age answer when there is none.
- **Under 13: Device boards only** (`docs/adr/0006`): a Player whose Age answer is under 13 posts nothing, in any Mode, ever: their Scores and weekly Sparks rank on Device boards only, nothing loads the Firebase SDK, App Check or reCAPTCHA for them, and no identity is ever created for them. There is no switch to turn World boards on for them. The retired Parent step (`parentOk`) is ignored, never written and never carried by the hand-off from sbmadhav.com. This is enforced in the client and its tests (`test/cloud.test.mjs`), not in the rules, because the server never learns the age.
- **World boards are shown only to Players 13 and over, after a tap**: everyone else sees the Device board. Nothing is read from Firestore before the tap.
- **No identity until the first post** (`docs/adr/0002`): viewing World boards loads Firestore and App Check only, never Firebase Auth, and reads signed out. The Firebase Anonymous Auth id is created at the Player's first actual post. Firebase Authentication keeps that id with its created and last sign-in dates. Each Player on a device gets their own id at their own first post: the client keeps one Firebase app per Player who posts (`appNameFor()` in `js/cloud.js`: the default app for the first Player `p1`, `vm-<player id>` for the others), so a post always goes out under the id of the Player whose Score or weekly Sparks total it is. After a Player's first post the device keeps a copy of their id (`vm.cloudUids`, by Player id) to mark only that Player's own row on a board as "me".
- **Removing a Player** (Me page) forgets their id on this device: their copy of the id is deleted, and if they posted from this browser the SDK loads (no sign-in) to sign their saved session out and delete their app. If that fails (for example offline), the next post on this device does it. The anonymous account itself is not deleted.
- What is posted: the score of an Arena Daily challenge and of a Ranked game round (today's and this week's board for each), and the weekly Sparks total. Sparks come from all play, Practice included, so Practice adds to the posted weekly total; Practice scores themselves never leave the device.
- The Placement level (openspec `placement`) is kept on this device with the rest of progress and is never sent: not posted, not in analytics (one fixed `math/placement/done` event), not in any request.
- An entry holds only a generated nickname (from fixed word lists, never typed), one of five avatar colors, an integer score, a server timestamp and an expiry time. The rules reject anything else. The document id is the anonymous id.
- **Keeping**: a World board is listed for 28 days after its day or week begins (the rules refuse a list query after that), so an entry can stop being shown before it expires. Each entry expires 30 days after its last update (`exp`), and the TTL policy then deletes it (in the background, usually within a few days). Entries cannot be deleted from the browser. To honor an earlier removal request (privacy@learnvedicmath.com, with the Nickname, color and date), find the entry by nickname and color in the Firebase console and delete it.
- Usage counts are separate from Boards: the app sends anonymous GoatCounter events through `window.siteTrack` (`js/analytics.js`, `js/metrics.js`), and Cloudflare Web Analytics counts page loads. They hold no IDs, Nicknames, Scores or typed text, set no cookies, and are off with Do Not Track or Global Privacy Control.
- Read aloud plays audio files recorded ahead of time (from `voice.learnvedicmath.com`) or uses the device's own voice. It sends no text anywhere and calls no speech service.
- Videos: the picture comes from this site, and a video loads from YouTube in privacy-enhanced mode only after a Player presses play; YouTube's own rules apply once it plays. Watching posts nothing.
- The site shows a note for grown-ups beside every Board and on the Me page. It is `parentNote()` in `js/app.js`; keep it, this section and `docs/legal/privacy-policy.md` in step.

## Boards

- **Arena daily race:** `daily-YYYY-MM-DD-<league>` and `week-YYYY-Www-<league>`.
- **Ranked game boards:** `g_<game>-daily-...` and `g_<game>-week-...` for each of the 14 games (game ids use `_`, for example `g_times_sprint`). Scores are difficulty-weighted points, capped at 12000.
- **Weekly Sparks:** `xp-week-YYYY-Www-<league>`, Sparks earned this week across everything, capped at 60000. The id keeps the `xp-` prefix it had when Sparks were called XP (`docs/adr/0003`): it is never shown, and keeping it needed no rules change.

After changing `firestore.rules`, deploy it with:

```
cd cloud && npx firebase-tools deploy --only firestore:rules --project <project-id>
```

The old sbmadhav.com project (`sbmadhav-vedic-math`) gets write-deny rules at the start of Phase B (`firestore.rules.frozen`, owner task 16.3) and is deleted at the end of the move (owner task 19.2).
