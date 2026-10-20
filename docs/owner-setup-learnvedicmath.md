# Owner setup for learnvedicmath.com

The steps only the owner can do for the move (`openspec/changes/learnvedicmath/`, tasks marked **[OWNER]**). Do them in this order; each says which task it closes. The guided version is `docs/tools/setup-learnvedicmath.sh` (run it from the repo root: `bash docs/tools/setup-learnvedicmath.sh`). It opens each page, waits for you, and saves secrets straight into GitHub with `gh secret set`.

**Never paste a secret (an API token, a password, a recovery code) into a chat with Claude.** Secrets go only into the dashboard that made them and into `gh secret set`, which asks for them with hidden input. Public values (an account id, a site key, a project id) are fine to share.

Menu names are as of October 2026 and change now and then; if a label differs, look for the nearest match and note the new name here.

Time: about 2 hours spread over a day or two (nameserver changes take a few hours to settle).

## 1. Passkeys or security keys everywhere (task 1.1)

Use a passkey or a hardware security key on every account below, and register two (one kept somewhere safe). Never SMS. Save each account's recovery codes offline.

1. **GitHub**: github.com > your avatar > Settings > Password and authentication > Passkeys > Add a passkey; and Security keys > Register new security key.
2. **Google** (the account that will own Firebase): myaccount.google.com > Security > How you sign in to Google > Passkeys and security keys > Create a passkey. Consider Google's Advanced Protection Program for this account.
3. **Squarespace**: account.squarespace.com > your avatar > Account settings > Security > Two-factor authentication. Use security keys if offered; otherwise an authenticator app.
4. **Squarespace Domains**: Domains > learnvedicmath.com > settings: keep **Domain lock** (registrar lock) on and **Auto-renew** on.
5. **Cloudflare**: done in step 2, right after you sign up.

## 2. Cloudflare account and the site (task 1.2)

1. Go to dash.cloudflare.com/sign-up and sign up with the email you use for these accounts.
2. Right away: avatar (top right) > My Profile > Authentication > Security keys (or Two-factor authentication) > add your keys.
3. Home > **Add a domain** > `learnvedicmath.com` > leave "Quick scan for DNS records" on > Continue > pick the **Free** plan.
4. On the DNS records review, **delete** the Squarespace parking records: the `A` records for `@` pointing at `198.49.23.144`, `198.49.23.145`, `198.185.159.144` and `198.185.159.145`, and a `www` `CNAME` to `ext-cust.squarespace.com` if one is there. Keep anything else you made yourself (there should be nothing).
5. Cloudflare shows **two nameservers** (like `ada.ns.cloudflare.com`). Copy both.

## 3. Nameservers at Squarespace (task 1.2)

1. account.squarespace.com/domains > learnvedicmath.com > **DNS** > **DNSSEC**: make sure it is **off** (it is today; if it were on, the domain would break when the nameservers change).
2. Same domain > DNS > **Domain nameservers** > **Use custom nameservers** > enter the two Cloudflare nameservers > Save.
3. Wait. Cloudflare emails you when the zone is **Active** (minutes to a few hours). Check: `dig NS learnvedicmath.com +short` lists the Cloudflare names.

## 4. DNSSEC (task 1.4)

1. Cloudflare > learnvedicmath.com > **DNS** > **Settings** > DNSSEC > **Enable DNSSEC**. It shows the DS record: Key tag, Algorithm (13), Digest type (2) and Digest.
2. Squarespace > Domains > learnvedicmath.com > DNS > **DNSSEC** > Add DS record: copy the four values exactly. (If Squarespace has no DS form for outside nameservers, contact Squarespace support with the values and note it here.)
3. Back in Cloudflare the DNSSEC panel turns to "Success" within a day. Check with `dig +dnssec learnvedicmath.com` (look for the `ad` flag through a validating resolver such as 1.1.1.1) and https://dnsviz.net/d/learnvedicmath.com/dnssec/.

## 5. Email: privacy@, hello@, security@, then DMARC (task 1.5)

1. Cloudflare > learnvedicmath.com > **Email** > **Email Routing** > Get started.
2. Destination addresses > add your Gmail address > open the verification email and confirm.
3. Routing rules > Custom addresses > create `privacy`, `hello` and `security`, each forwarding to your Gmail.
4. When asked, click **Add records and enable** (Cloudflare adds the MX, SPF and DKIM records it needs).
5. Send a test email to each address from another account and check it arrives.
6. DMARC: Email > **DMARC Management** > Enable (Cloudflare gives a free report address). Then DNS > Records > the `_dmarc` TXT record: set it to
   `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:<the address Cloudflare gave>`.
   The domain never sends email, so `p=reject` stops anyone from faking mail as learnvedicmath.com.
7. Replies: Gmail replies come from your personal address. That is fine at launch; before answering parents regularly, consider a real mailbox that can send as privacy@ (open question for the lawyer, privacy draft question 9).

## 6. CAA records (task 1.6)

Cloudflare > DNS > Records > Add record, type **CAA**, name `@`, three times:
- flags 0, tag "Only allow specific hostnames" (`issue`), value `letsencrypt.org`
- flags 0, tag `issue`, value `pki.goog`
- flags 0, tag "Send violation reports to URL" (`iodef`), value `mailto:security@learnvedicmath.com`

Cloudflare adds the other CAs its certificates need on its own. A day later check SSL/TLS > Edge Certificates still shows an active certificate.

## 7. Verify the domain in GitHub (task 1.10, do it early)

1. github.com > avatar > Settings > **Pages** > Verified domains > **Add a domain** > `learnvedicmath.com`.
2. GitHub shows a TXT record named `_github-pages-challenge-sbmadhav.learnvedicmath.com`.
3. Cloudflare > DNS > Records > Add record: type TXT, **name `_github-pages-challenge-sbmadhav`** (only that part: Cloudflare adds `.learnvedicmath.com` itself; this exact slip happened with sbmadhav.com), value as GitHub shows.
4. Back in GitHub: **Verify**. This stops anyone else claiming learnvedicmath.com on GitHub Pages, which matters once Phase C points the old repo at it.

## 8. Cloudflare API tokens for GitHub Actions (task 1.7)

First create the two GitHub environments, so the tokens are never stored at repository scope:

1. github.com/sbmadhav/vedic-math > Settings > **Environments** > New environment `production` > Deployment branches and tags: **Selected branches and tags** > Add rule `main`. Save.
2. New environment `preview` (no branch rule; only the preview workflow names it, for pull requests from this repo's own branches).
   (The wizard can do both with `gh api`. If the repo is ever private on GitHub Free, environments go away; the builder then switches to repository secrets named by one job each, design D12.)

Then the production token:

3. Cloudflare > avatar > My Profile > **API Tokens** > Create Token > **Create Custom Token**.
4. Name: `github-actions-learnvedicmath`.
5. Permissions (only these):
   - Account > **Workers Scripts** > Edit
   - Account > **Account Settings** > Read
   - Zone > **Workers Routes** > Edit
   - Zone > **Zone** > Read
   - User > **User Details** > Read
   - User > **Memberships** > Read
6. Account Resources: Include > your account. Zone Resources: Include > **Specific zone** > learnvedicmath.com.
7. Client IP Address Filtering: leave empty (GitHub runners have changing addresses).
8. TTL: start today, end one year from today. Put a reminder in your calendar a week before.
9. Continue to summary > Create Token. Cloudflare shows the token **once**. Do not close the page yet.
10. In a terminal in the repo: `gh secret set CLOUDFLARE_API_TOKEN --env production` and paste at the hidden prompt (it never shows on screen and never goes in a file). Always `--env production`, never a plain repository secret.
11. The account id is public: Cloudflare > Workers & Pages > Overview, right side, **Account ID** > copy, then `gh variable set CLOUDFLARE_ACCOUNT_ID --body <id>`.
12. Preview token: repeat steps 3 to 9 with the name `github-actions-learnvedicmath-preview` (same permissions; Cloudflare cannot narrow it further, so it is kept apart so either can be revoked alone), then `gh secret set CLOUDFLARE_PREVIEW_TOKEN --env preview`.
13. Check: `gh secret list --env production` and `gh secret list --env preview` show one name each; plain `gh secret list` shows neither.
14. If a deploy later fails on a missing permission, add only the one the error names, to that token.

## 8b. R2 for the Studio voice (task 7.8, only if decision L8 stays R2)

**Optional for the first deploy.** Until `R2_ACCOUNT_ID` is set, the voice step is skipped and CI deploys the site without the Studio voice (`build.py --voice off`): nothing in it names `voice.learnvedicmath.com`, and read aloud and every Listen button use the device voice. Recorded voice turns on by setting up R2 with the steps below: the next push to `main` uploads the voice files and deploys a site that plays them. Once `R2_ACCOUNT_ID` is set, a failed voice upload stops the deploy (deploy-pipeline spec).

The Studio voice (about 23,700 files, 414 MB) is too many files for Workers static assets on the Free plan (20,000 per version), so it lives in an R2 bucket on its own subdomain (design D17).

1. Cloudflare > **R2 Object Storage** > Enable R2. It asks for a payment method even for the free tier (10 GB-month, no egress fees); 414 MB costs nothing.
2. **Create bucket** `learnvedicmath-voice`, location Automatic, storage class Standard.
3. The bucket > Settings > **Custom Domains** > Connect domain > `voice.learnvedicmath.com`. Leave the `r2.dev` public URL **disabled**.
4. Settings > **CORS policy**: allow origin `https://learnvedicmath.com`, method `GET`, headers `Range`, max age 86400.
5. learnvedicmath.com > Rules > **Cache Rules** > Create: when hostname equals `voice.learnvedicmath.com`:
   - Cache eligibility: **Eligible for cache** (`.m4a` is not cached by default, so this setting is required, not just the TTL).
   - Edge TTL: **Use cache-control header if present** (objects carry `max-age=31536000, immutable`), and under **Status code TTL** set `200` and `206` to 1 year and `404` (and any 4xx/5xx) to **No store**, so a file asked for before its upload is never cached as missing.
6. Rules > **Transform Rules** > Modify response header: when hostname equals `voice.learnvedicmath.com`, set `Cross-Origin-Resource-Policy: same-site` and `X-Content-Type-Options: nosniff`.
7. R2 > **Manage R2 API Tokens** > Create API token: name `github-actions-voice-upload`, permission **Object Read & Write**, **Apply to specific buckets only** > `learnvedicmath-voice`, TTL one year. Cloudflare shows an Access Key ID and a Secret Access Key **once**.
8. In a terminal: `gh secret set R2_ACCESS_KEY_ID --env production` and `gh secret set R2_SECRET_ACCESS_KEY --env production` (paste each at the hidden prompt), then `gh variable set R2_ACCOUNT_ID --body <your account id>`.

If L8 is Workers Paid instead: Cloudflare > Workers & Pages > Plans > **Workers Paid** ($5 a month), and skip this section.

## 9. First deploy and custom domains (with the builder, after task 11.1)

1. The builder's first `main` deploy creates the Worker `learnvedicmath`.
2. Cloudflare > Workers & Pages > learnvedicmath > **Settings** > **Domains & Routes** > Add > Custom domain > `learnvedicmath.com`; again for `www.learnvedicmath.com`. Cloudflare creates the DNS records and certificates.
3. Check https://learnvedicmath.com/ answers.

## 10. Web Analytics (task 1.12)

1. Cloudflare > **Analytics & Logs** > **Web Analytics** > Add a site > hostname `learnvedicmath.com`.
2. Choose the **JavaScript snippet** setup, not automatic setup (automatic injection ignores Do Not Track and Global Privacy Control). If the site shows "Automatic setup: enabled", turn it off.
3. Copy the token from the snippet (`data-cf-beacon='{"token": "..."}'`). It is public; give it to the builder.

## 11. Zone settings (task 5.5)

1. SSL/TLS > Edge Certificates: **Always Use HTTPS** on; **Minimum TLS Version** 1.2. Leave HSTS off here (the site sends its own header).
2. Rules > **Redirect Rules** > Create rule > template "Redirect from WWW to root" (or a custom rule: when hostname equals `www.learnvedicmath.com`, dynamic redirect to `concat("https://learnvedicmath.com", http.request.uri.path)`, status 301, preserve query string).
3. Security > WAF > **Rate limiting rules** > Create rule: name `csp-and-import`; when URI Path is in `/_csp` or starts with `/import/`; 20 requests per 10 seconds per IP; action Block for 10 seconds.
4. Security > Bots > **Bot Fight Mode**: leave **off** until task 15.7.
5. Notifications > Add: "Universal SSL alert", "DNSSEC", and any DNS change alert offered; send to your email.

## 12. Read Cloudflare's terms (task 1.3)

Read the Cloudflare Self-Serve Subscription Agreement and Website and Online Services Terms for commercial use on the Free plan. Write the answer here: [ ].

## 13. New Firebase project (task 1.8, then 8.7)

1. console.firebase.google.com > **Create a project** > name "Learn Vedic Math", project id `learnvedicmath` (or `learnvedicmath-prod` if taken; tell the builder which) > **Google Analytics: off** > Create.
2. Billing (if open question 3 is yes): project overview > Spark plan badge > **Upgrade** > Blaze > link a billing account. Then console.cloud.google.com > Billing > **Budgets & alerts** > Create budget: this project only, $5 a month, alerts at 50, 90 and 100 percent to your email.
3. Run the setup script once the builder has finished task 8.4: `bash cloud/setup.sh <project-id> learnvedicmath.com www.learnvedicmath.com`. It turns on Anonymous sign-in, adds the authorized domains, creates Firestore (nam5), deploys the rules, creates the web app, writes `js/cloud-config.js` and turns on TTL. If it stops at "Authentication is not initialized", open Build > Authentication > Get started once and run it again.
4. Check by hand: Build > Authentication > Settings > **Authorized domains** has `learnvedicmath.com`, `www.learnvedicmath.com` and `localhost`. Firestore > **Time-to-live** shows a policy for collection group `scores`, field `exp`.
5. **App Check**: console.cloud.google.com > Security > **reCAPTCHA** > Create key: type Website, domains `learnvedicmath.com` and `www.learnvedicmath.com`, no checkbox challenge. Copy the key id (public). Firebase > Build > **App Check** > Apps > your web app > reCAPTCHA Enterprise > paste the key > Save. Give the key id to the builder for `js/cloud-config.js`.
6. **API key**: console.cloud.google.com > APIs & Services > **Credentials** > "Browser key (auto created by Firebase)" > Application restrictions: **Websites**, add `https://learnvedicmath.com/*`, `https://www.learnvedicmath.com/*`, `http://localhost:*/*`, `http://127.0.0.1:*/*` and `https://<project-id>.firebaseapp.com/*` > API restrictions: **Restrict key** to Cloud Firestore API, Identity Toolkit API, Token Service API, Firebase App Check API and Firebase Installations API > Save. Never add `*.workers.dev`.
7. Later (task 8.7): after the site has been live a few days, Firebase > App Check > **APIs** > Cloud Firestore: check that almost all requests are "Verified", then **Enforce**.
8. Anonymous account clean-up: Authentication > Settings: if "automatic clean-up of anonymous accounts" is offered (it may need the Identity Platform upgrade), turn it on for 30 days; note the result in `docs/legal/data-retention.md`.
9. Project settings > **Data privacy** and **Integrations**: no Google Analytics, no data sharing.

## 14. GoatCounter (task 1.9)

1. Sign in at https://www.goatcounter.com with the account that owns `sbmadhav`.
2. Settings > **Sites** > Add a new site: code `learnvedicmath`.
3. In the new site's settings: under data collection keep only what the privacy policy lists (path, referrer, browser, screen size, country) and untick region and language; **Ignore IPs**: add your home IP; **Data retention**: 395 days (13 months). Save.
4. The code `learnvedicmath` is public; the builder puts it in `js/analytics.js`.

## 15. GitHub security settings (tasks 11.5 and 11.6, while the repo is public)

1. github.com/sbmadhav/vedic-math > Settings > **Code security**: Dependabot alerts on, Dependabot security updates on; CodeQL analysis > **Set up** > Default; Secret Protection: secret scanning on, **Push protection** on; Private vulnerability reporting on.
2. Environments: already made in step 8. Check Settings > Environments shows `production` limited to `main`, and `preview`.

## 16. Search Console and YouTube's child-directed designation (task 1.11)

1. https://search.google.com/search-console > Add property > **Domain** > `learnvedicmath.com` > copy the TXT value > Cloudflare DNS > add TXT on `@` > Verify.
2. Sitemaps > submit `https://learnvedicmath.com/sitemap.xml` (after launch).
3. Follow https://support.google.com/youtube/answer/171780 to self-designate the site as directed to children for embedded YouTube videos (it links Google's current form). Write down here what you submitted and when: [ ].

## 17. Uptime monitoring (task 1.13)

1. Sign up at uptimerobot.com (free) or betterstack.com/uptime (free).
2. Add three HTTP(s) monitors, 5-minute interval, alerting your email: `https://learnvedicmath.com/`, `https://learnvedicmath.com/play/`, `https://learnvedicmath.com/sw.js`.
3. In Phase C add a fourth: keyword or status monitor on `https://sbmadhav.com/vedic-math/` expecting a 301.

## 18. Phase B and C (later; tasks 16.3, 18.1 to 18.3, 19.2)

- **Start of Phase B**: in the old project (`sbmadhav-vedic-math`), deploy the frozen rules the builder prepares: `cd cloud && npx firebase-tools deploy --only firestore:rules --project sbmadhav-vedic-math` from the builder's branch.
- **Going private on GitHub Pro (your answer to L2)**: (1) github.com/settings/billing > upgrade to **Pro** ($4/month). (2) Any time from the start of Phase B, once the moved page is live: github.com/sbmadhav/vedic-math > Settings > General > Danger zone > **Change visibility** > Private. Then check Settings > Pages still shows the site, and that https://sbmadhav.com/vedic-math/ still loads. (3) Phase C: the same repo > Settings > Pages > **Custom domain**: `learnvedicmath.com` > Save (it says the DNS check failed; that is expected, and it does not move the site off Cloudflare). Leave Enforce HTTPS off. (4) **Gate**: within 24 hours, `curl -sI "https://sbmadhav.com/vedic-math/x?y=1"` must show `301` and `location: http://learnvedicmath.com/x?y=1` (or https). GitHub documents this redirect only for apex and www, so it must be seen working here. If it does not: remove the custom domain again (this repo's Pages keep serving the moved page) and tell the builder; the fallback is moving sbmadhav.com's DNS to Cloudflare with one redirect rule (design D13), which is your call.
- **End**: console.firebase.google.com > `sbmadhav-vedic-math` > Project settings > General > **Delete project**.

## 19. Registration transfer (optional, task 15.6)

After about 2026-12-16 (60 days after registration), the domain can move to Cloudflare Registrar for at-cost renewals: Cloudflare > Domain Registration > Transfer Domains. Not required.
