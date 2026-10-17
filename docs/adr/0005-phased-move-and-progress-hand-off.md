# Move in three phases and hand progress over on the device

A Player's progress lives in localStorage, which belongs to an origin, so moving from sbmadhav.com to learnvedicmath.com would leave every Player starting over. A 301 from the start would be the cleanest signal for search engines, but no code runs on a redirected page, so nobody's progress could follow. An iframe of the old origin cannot help either: Chrome, Firefox and Safari all partition third-party storage. So the move has three phases. **A**: the new site launches. **B** (3 months, then a month at a time while analytics still shows hand-offs): `sbmadhav.com/vedic-math/` becomes a moved page that unregisters the old worker, packs this device's progress into the URL fragment and replaces itself with `learnvedicmath.com/import/`; the old `sw.js` ships with its KILL switch. **C**: GitHub's custom-domain redirect sends a 301 from every old URL, and a permanent `sbmadhav.com/vm-export/` page hands progress over in a popup for anyone who comes back late. There is no server in any of it.

Status: accepted 2026-10-17 (owner decisions 3 and 8). Change: `openspec/changes/learnvedicmath/`.

## Considered Options

- **301 on day one**: no progress moves; Safari Players in particular lose everything. Rejected.
- **A server that carries the data** (upload from the old origin, download on the new one): a new store of children's data, a retention problem and a new attack surface, for a one-time copy. Rejected.
- **Carrying the World board identity across** (a Cloud Function minting a custom token with the same UID): needs Blaze, a token in a URL and new processing. Rejected: Boards are dated and expire, and the new site uses a new Firebase project anyway (decision 9).
- **Hidden iframe plus Storage Access API**: partial support, needs a gesture and prior interaction, and Firefox's grant does not cover script storage. Rejected.
- **Export page only, no Phase B**: works in every browser but needs a click from every Player and depends on people finding it. Kept as the late route, not the main one.

## Consequences

- The fragment is untrusted input. The import page removes it from the address bar before anything else runs, validates it against a strict allow-list schema with size caps, never builds HTML from it, asks before importing, and never overwrites progress already on the new site without a choice.
- What moves is device-local progress, Nicknames, avatar colors, Modes, Age answers and settings. World board identities, the Parent step, Device board entries and analytics milestones stay behind; weekly Boards start fresh.
- The old origin keeps its data (nothing is deleted there), so a failed or declined hand-off can be retried from the export page.
- The Phase C redirect relies on GitHub behaviour that is not documented. A daily check watches it, and `learnvedicmath.com` is verified in the GitHub account so no one else can claim it on Pages.
- The repo can only go private on a plan that publishes Pages from a private repo, because the old path needs this repo's Pages until the end: the owner chose GitHub Pro (2026-10-17), so the repo keeps its name and its Pages and goes private from Phase B. No stub repo.
- Safari deletes script storage after 7 days without a visit, so Phase B starts on launch day.
