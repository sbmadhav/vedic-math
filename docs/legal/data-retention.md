# Data retention policy (DRAFT)

> **DRAFT. Not legal advice. A lawyer must review this before it is published.** This is the written data retention policy the amended COPPA Rule asks for (16 CFR §312.10, as amended 2025-04-22): for each kind of information, the purpose, the business need and when it is deleted. No record about a Player is kept on a server without a stated deletion time. Two things have no deletion date, and neither identifies anyone: what stays on the Player's own device until its owner deletes it, and analytics totals (counts, not records of people). Written 2026-10-17 for learnvedicmath.com; it is published at `/privacy/retention/`. The published text holds no placeholder: what is still to be decided is listed under "Open items" at the end, which is not published (the build fails on any text in square brackets left in a published page).

Owner of this policy: the information security coordinator, Madhav Srinivasan, the site's operator (see [how we keep the site secure](/privacy/security/)). Reviewed at least once a year, and whenever what the site collects changes.

## Principles

1. Keep as little as possible, for as short a time as possible.
2. Prefer the Player's device to any server. What is only on the device is the device owner's to keep or delete.
3. No information from a child under 13 is kept on any server we control, beyond what our host and analytics process for internal operations, described below.
4. Deletion is automatic wherever the tool allows it, so it does not depend on someone remembering.

## What we keep, why, and for how long

| Information | Where | Purpose | Business need | Deleted | How |
|---|---|---|---|---|---|
| Players, progress, settings, Device board | The Player's browser (localStorage) | Let the Player keep playing | The game does not work without it | When the Player is removed or site data is cleared | By the device owner (Me page or browser settings) |
| World board entry: Nickname, avatar color, score, time, expiry, random ID (Players 13 and older only) | Google Firestore, in the site's own Firebase project | Show the World board | Boards are part of the game | No longer readable once it expires, 30 days after its last update (the rules refuse reads of any Board older than 28 days, which is before any of its entries can expire, and the app hides expired entries too); then physically deleted by Firestore's TTL clean-up, which runs in the background and usually finishes within a few days of expiry | Firestore TTL policy on `exp`; rules refuse longer `exp` and older Boards |
| Anonymous sign-in record for that random ID (Players 13 and older only) | Google Firebase Authentication | Let a Player update their own entry | Stops one Player from overwriting another | World boards are switched off for now, so no such record exists. When they are switched on, this row will say when these records are deleted | To be set with the Firebase project, before World boards are switched on |
| App Check / reCAPTCHA assessment | Google | Keep scripts from posting fake scores | Fair Boards | We do not keep it; Google keeps it under its terms for reCAPTCHA Enterprise. World boards are switched off for now, so none is made today | Google |
| Request logs (IP address, browser, path) | Cloudflare | Deliver pages, stop attacks | Running a website | Per Cloudflare's standard log handling; we do not export or store them | Cloudflare |
| CSP reports (directive, blocked origin, page path, browser family) | Cloudflare Workers Logs | Find security problems | Security | After Workers Logs' retention period, a few days (Cloudflare sets it by plan) | Automatic |
| Cloudflare Web Analytics (aggregate page loads, no cookies) | Cloudflare | Know traffic and speed | Running and improving the site | Kept by Cloudflare as totals, under its own retention; no per-person data exists | Cloudflare |
| GoatCounter counts (fixed-word events, path, referrer, browser, country, screen size; no IP stored, no cookie) | GoatCounter | Learn which parts help people learn | Improving the site | Per-visit records: the time is still being set in GoatCounter's "data retention" setting, and this policy will say it once it is; totals kept as totals | GoatCounter setting |
| Hand-off payload from sbmadhav.com | Only in the URL fragment, on the device | Move progress to the new site | One-time move | Removed from the address bar at once; never sent to a server | Import page |
| Emails to privacy@, hello@, security@ | Cloudflare Email Routing (passes through), then the owner's Gmail | Answer questions and requests | Required contact for parents | 12 months after the conversation ends, or 30 days after a deletion request is completed, whichever is sooner | Owner deletes; reviewed each quarter |
| Old site's World board data (sbmadhav.com, project `sbmadhav-vedic-math`) | Google Firestore | None after the move | None | Writes stop when the old address starts sending visitors here; the project is deleted when the move is finished (Google purges it 30 days later) | Owner, as part of the move |

There are no backups of any of the server-side data above, and no copies outside the tools listed.

## Requests to delete

A parent, or a Player 13 or older, can ask at privacy@learnvedicmath.com for World board entries to be deleted (give the Nickname, color and date). We delete them, confirm by email, and then delete the email thread within 30 days. There is never anything server-side for a Player under 13.

## Review

At each annual review (part of our security program) the coordinator checks every row against what the site really does (the game's note for grown-ups, the Firebase set-up, the Firestore deletion setting, the GoatCounter setting), and updates this policy and the published version together.

## Open items (remove before publishing)

Placeholders taken out of the published text on 2026-10-29 (UX audit task 1.1). Each one waits on the owner or the lawyer (task 13.1); none may be filled with a guess.

1. Coordinator: named as the owner, as task 13.2 says; the owner confirms when doing 13.2.
2. Firebase project id (task 1.8; design D14 suggests `learnvedicmath`, or `learnvedicmath-prod` if taken): the published text says "the site's own Firebase project". Name it once it exists.
3. Anonymous sign-in records (task 1.8): the draft proposed deleting accounts unused for 30 days by Firebase's automatic clean-up, or by a scheduled job. Decide and set it before World boards are switched on, then fill the row. Today removing a Player does not delete the account (`cloud/README.md`).
4. reCAPTCHA Enterprise: confirm Google's retention for assessments and whether the row should name it.
5. Workers Logs: the draft said 3 days on our plan; the plan may change (Workers Paid, design D17). Confirm and name the period, or keep "a few days".
6. Cloudflare Web Analytics: confirm Cloudflare's retention for the totals.
7. GoatCounter per-visit records (task 1.9: the GoatCounter site does not exist yet): the draft proposed 13 months. Set it and name it here and in the privacy policy.
8. Deletion requests: the draft proposed 10 days; the published text gives no number until one is chosen.
9. World boards: the rows above say they are switched off for now (tasks 1.8 and 8.5). Update them when they are switched on.
