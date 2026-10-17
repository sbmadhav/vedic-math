# Players under 13 use Device boards only

Supersedes the Parent step part of [ADR 0001](0001-parent-step-follows-the-age-answer.md). [ADR 0002](0002-no-identity-until-the-first-post.md) still holds.

ADR 0001 let a Player whose Age answer is under 13 post to World boards once a grown-up gave the Parent step on the device. Under the amended COPPA Rule (compliance required from 2026-04-22), a toggle on the device is not one of the FTC's verifiable parental consent methods, and posting a Score under an anonymous ID sends a persistent identifier, which counts as personal information. On learnvedicmath.com, which will become a commercial site, Players whose Age answer is under 13 therefore post nothing: their Scores and weekly Sparks rank only on the Device board, in every Mode. The Parent step is removed. Players 13 and over keep posting as before. The Age answer still decides, still asked neutrally, and still never leaves the device.

Status: accepted 2026-10-17 (owner decision 10). Change: `openspec/changes/learnvedicmath/`.

## Considered Options

- **Keep the Parent step**: rejected; it is not verifiable consent, and a lawyer would have to defend World board posting as "support for internal operations", which the amended Rule now requires us to disclose in detail.
- **Real verifiable parental consent** (for example a card transaction once paid plans exist, or "email plus"): possible later, with a lawyer, as part of a parent account. Too much to build before launch, and it collects a parent's contact details.
- **A self-asserted age band sent with each post, checked by the rules** (`band: '13+'`): rejected. It proves nothing (the client says what it likes), and it would send an age-like field, which breaks "the Age answer never leaves the device".
- **No World boards for anyone**: rejected for now; teens and adults are most of the Pro League and boards are part of the game. It stays the answer if the lawyer finds the site's primary audience is children, because then every visitor must be treated as a child.

## Consequences

- `cloud.canPost()` returns `'device-only'` for an Age answer under 13; nothing for those Players loads the Firebase SDK, App Check or reCAPTCHA, and no identity is ever created for them. This is enforced in the client and its tests, not in the Firestore rules, because the server never learns the age.
- World boards are shown only to Players whose Age answer is 13 or over, after a tap, because with App Check enforced even a read reaches Google.
- The Parent step dialog, its switch, `parentOk` and the `parent-step/*` analytics events are removed; the hand-off never carries `parentOk`. Under-13 Players who had the Parent step on sbmadhav.com lose World boards on the new site, and keep everything on the device.
- The parent note, `cloud/README.md`, the privacy policy and the GLOSSARY say plainly that under-13 Players post nothing.
- Get a lawyer's opinion before any paid plan or school outreach, including whether the site is "primarily directed to children" (mixed-audience rules).
