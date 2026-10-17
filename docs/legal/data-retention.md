# Data retention policy (DRAFT)

> **DRAFT. Not legal advice. A lawyer must review this before it is published.** This is the written data retention policy the amended COPPA Rule asks for (16 CFR §312.10, as amended 2025-04-22): for each kind of information, the purpose, the business need and when it is deleted. Nothing is kept indefinitely. Written 2026-10-17 for learnvedicmath.com; it is published (in plain words) at `/privacy/retention/` once reviewed. Placeholders in [square brackets].

Owner of this policy: the information security coordinator ([owner name], see `security-program.md`). Reviewed at least once a year, and whenever what the site collects changes.

## Principles

1. Keep as little as possible, for as short a time as possible.
2. Prefer the Player's device to any server. What is only on the device is the device owner's to keep or delete.
3. No information from a child under 13 is kept on any server we control, beyond what our host and analytics process for internal operations, described below.
4. Deletion is automatic wherever the tool allows it, so it does not depend on someone remembering.

## What we keep, why, and for how long

| Information | Where | Purpose | Business need | Deleted | How |
|---|---|---|---|---|---|
| Players, progress, settings, Device board | The Player's browser (localStorage) | Let the Player keep playing | The game does not work without it | When the Player is removed or site data is cleared | By the device owner (Me page or browser settings) |
| World board entry: Nickname, avatar color, score, time, expiry, random ID (Players 13 and older only) | Google Firestore, project [learnvedicmath] | Show the World board | Boards are part of the game | 30 days after the entry's last update; boards cannot be read after 35 days | Firestore TTL policy on `exp`; rules refuse longer `exp` and older boards |
| Anonymous sign-in record for that random ID (Players 13 and older only) | Google Firebase Authentication | Let a Player update their own entry | Stops one Player from overwriting another | [Anonymous accounts unused for 30 days are deleted by Firebase's automatic clean-up, if enabled; else by a scheduled job: to confirm] | Firebase setting [to confirm in task 1.8] |
| App Check / reCAPTCHA assessment | Google | Keep scripts from posting fake scores | Fair Boards | Per Google's terms for reCAPTCHA Enterprise [to confirm] | Google |
| Request logs (IP address, browser, path) | Cloudflare | Deliver pages, stop attacks | Running a website | Per Cloudflare's standard log handling; we do not export or store them | Cloudflare |
| CSP reports (directive, blocked origin, page path, browser family) | Cloudflare Workers Logs | Find security problems | Security | After Workers Logs' retention period ([3] days on our plan) | Automatic |
| Cloudflare Web Analytics (aggregate page loads, no cookies) | Cloudflare | Know traffic and speed | Running and improving the site | Aggregates per Cloudflare's retention [to confirm]; no per-person data exists | Cloudflare |
| GoatCounter counts (fixed-word events, path, referrer, browser, country, screen size; no IP stored, no cookie) | GoatCounter | Learn which parts help people learn | Improving the site | Per-visit records after [13 months] (GoatCounter "data retention" setting); totals kept as totals | GoatCounter setting, set in task 1.9 |
| Hand-off payload from sbmadhav.com | Only in the URL fragment, on the device | Move progress to the new site | One-time move | Removed from the address bar at once; never sent to a server | Import page |
| Emails to privacy@, hello@, security@ | Cloudflare Email Routing (passes through), then the owner's Gmail | Answer questions and requests | Required contact for parents | 12 months after the conversation ends, or 30 days after a deletion request is completed, whichever is sooner | Owner deletes; reviewed each quarter |
| Old site's World board data (sbmadhav.com, project `sbmadhav-vedic-math`) | Google Firestore | None after the move | None | Writes frozen at the start of Phase B; the project is deleted in Phase C (Google purges it 30 days later) | Owner, tasks 16.3 and 19.2 |

There are no backups of any of the server-side data above, and no copies outside the tools listed.

## Requests to delete

A parent, or a Player 13 or older, can ask at privacy@learnvedicmath.com for World board entries to be deleted (give the Nickname, color and date). We delete them within [10] days, confirm by email, and then delete the email thread within 30 days. There is never anything server-side for a Player under 13.

## Review

At each annual review (see `security-program.md`) the coordinator checks every row against what the site really does (the parent note, `cloud/README.md`, the Firestore TTL policy, the GoatCounter setting), and updates this policy and the published version together.
