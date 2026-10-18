# Written information security program (DRAFT)

> **DRAFT. Not legal advice. A lawyer must review this before it is relied on.** The amended COPPA Rule (16 CFR §312.8, as amended 2025-04-22) asks an operator of a child-directed site to keep a written information security program: a named coordinator, at least yearly risk assessment, safeguards for the risks found, regular testing and monitoring, oversight of service providers, and a yearly review. This is that program for learnvedicmath.com, written 2026-10-17. It is short because the site is small and keeps almost nothing; it must stay true. Placeholders in [square brackets].

## 1. Coordinator

[Owner name] is the information security coordinator. They own this document, the risk assessment, the calendar in section 7 and the response to incidents. If a second person ever gets access to any account or system below, they are named here with what they can reach.

## 2. What we protect

- Information about Players: on our servers only World board entries of Players 13 and older (see `data-retention.md`). Players under 13 have nothing on our servers.
- The integrity of the site's code and pages (a changed script could act as a Player or show anything to a child).
- The accounts that control the site: Squarespace (domain registration), Cloudflare (DNS, hosting, email routing), GitHub (code, CI), Google (Firebase, Search Console), GoatCounter, the owner's Gmail (where privacy@ arrives).
- Secrets: the Cloudflare API token in GitHub, the Firebase project's admin access, the YouTube Data API key used by repo tools (`~/.config/vedic-math/youtube.env`, never in a repo).

## 3. Risk assessment (do at least once a year; first one before launch)

| Risk | Likelihood | Impact | Safeguards |
|---|---|---|---|
| Takeover of the domain or DNS (registrar or Cloudflare account) | Low | Very high: anything could be served to children | Passkey or hardware-key 2FA on Squarespace and Cloudflare, registrar lock, DNSSEC, CAA, Cloudflare notifications on DNS and certificate changes |
| Takeover of GitHub (code or CI) | Low | Very high | Passkey or hardware-key 2FA; Actions pinned to commit SHAs; deploy token limited to Workers scripts on one account; secret scanning; pre-commit hook; only the owner can push |
| A malicious or compromised third-party script | Low | High | Every script served from our own origin and pinned; strict CSP with no inline scripts except by hash and no third-party script hosts beyond Firebase App Check paths; CSP reports reviewed monthly; Dependabot |
| Cross-site scripting through content or a crafted link | Medium | High | CSP; no HTML built from untrusted data; the hand-off schema validator; nothing typed by a Player is stored or shown |
| Fake scores or vandalism on World boards | Medium | Low | Firestore rules (fields, word-list Nicknames, caps, board windows, rate limit), App Check enforced, removal on request |
| Leaking children's data to third parties | Low | High | Under-13 Players are device-only; nothing to Google or YouTube before a Player's action; analytics without cookies or IDs; the e2e third-party test |
| A cost spike (abuse of Firebase or Workers) | Low | Medium | Budget alerts; Free plan limits; rate-limiting rule on `/_csp` and `/import/` |
| Losing access to an account (lost key, locked out) | Medium | High | Two registered security keys or passkeys per account, recovery codes stored offline [where] |
| Phishing of the owner | Medium | Very high | Passkeys or security keys (phishing resistant), no SMS 2FA, a dedicated email for these accounts |

## 4. Safeguards in place (checklist; the tasks are in `openspec/changes/learnvedicmath/tasks.md`)

- Accounts: passkey or hardware-key 2FA on every account in section 2 (task 1.1); registrar lock and auto-renew.
- Domain: DNSSEC (1.4), CAA (1.6), DMARC `p=reject` (1.5), verified in GitHub Pages (1.10).
- Transport and headers: HTTPS only, HSTS, CSP with reporting, `frame-ancestors 'none'`, Permissions-Policy, COOP, CORP, nosniff (task 5).
- Code: actions SHA-pinned; Dependabot (11.4); CodeQL while public and Semgrep after (11.5, 18.6); secret scanning; the pre-commit hook and CI tests; every behaviour change ships with tests.
- Data: minimal collection by design; Firestore rules and their emulator tests; TTL deletion; App Check; the hand-off validator.
- Disclosure: `security.txt` and `SECURITY.md` with security@learnvedicmath.com.

## 5. Testing and monitoring

- Every push: unit tests, rules tests when `cloud/` changes, the build checks (stamps, CSP, third-party list, header limits).
- Every deploy and daily: the Playwright suite against production, including the CSP, header and third-party checks; the Phase C redirect check.
- Continuous: uptime monitor (1.13); Cloudflare notifications; Firebase budget alerts.
- Monthly: read the CSP reports in Workers Logs and the Cloudflare security events.
- Quarterly: check for a new Firebase SDK and GoatCounter script (vendored, so Dependabot cannot see them), and update with a PR; rotate nothing unless needed, but confirm the Cloudflare token's expiry date.

## 6. Service providers

For each provider we keep: what it receives (see the privacy policy table), that its terms commit it to protect that information, and the date we last checked. Reviewed yearly.

| Provider | Receives | Terms checked |
|---|---|---|
| Cloudflare | Request data, analytics, CSP reports, routed email | [date] |
| Google (Firebase, reCAPTCHA, YouTube, Gmail) | 13+ board entries and sign-in; reCAPTCHA signals; video playback; email | [date] |
| GoatCounter | Anonymous counts | [date] |
| jsDelivr, Hugging Face | Download requests for the optional natural voice | [date] |
| GitHub | Code and CI (no Player data) | [date] |
| Squarespace Domains | Registration (no Player data) | [date] |

A new provider that would receive anything about Players is not added until the privacy policy and this table are updated.

## 7. Calendar

| When | What |
|---|---|
| Before launch | First risk assessment (section 3), every safeguard in section 4 checked |
| Monthly | CSP reports and Cloudflare security events |
| Quarterly | Vendored SDK and script versions; email retention clean-up; token expiry check |
| Every year, [month] | Full review: risk assessment, providers, `data-retention.md`, this program, the privacy policy; renew `security.txt` `Expires`; rotate the Cloudflare API token |

## 8. Incidents

1. **Notice** (an alert, a report to security@, something odd): write down the time and what was seen.
2. **Contain**: rotate the affected secret (Cloudflare token: dashboard > My Profile > API Tokens > Roll, then `gh secret set`; Firebase: disable the web app's key or tighten rules; GitHub: revoke sessions and tokens), or take the site down by deploying the KILL worker and a maintenance page if pages could be harmful.
3. **Assess**: what information, whose, how many; whether any child's information was involved.
4. **Notify**: as the law requires (federal and state breach laws; the FTC if required), and parents in plain words if their child's information was involved. A lawyer is called for any incident involving Player information.
5. **Fix and learn**: fix the cause, add a test, update section 3.

## 9. Review of this program

At least once a year, and after any incident or change in what is collected, the coordinator reviews and updates this document and records the date here.

Reviews: [none yet]
