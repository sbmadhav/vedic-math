# Spec Delta

## Purpose

Ship every change the same checked way: tests, a stamped build, a preview per branch, a deploy to Cloudflare from `main`, and end-to-end runs against what is actually live.

## ADDED Requirements

### Requirement: Deploy from main
A push to `main` SHALL run the unit tests, the build and its checks, and then deploy the checked build to Cloudflare with `wrangler deploy`, authenticated by the production Cloudflare API token, scoped to editing Workers scripts on this one account and zone. The token SHALL never be printed, passed on a command line or available to pull requests from forks. Every action SHALL be pinned to a full commit SHA, and wrangler to an exact version.

#### Scenario: A push to main
- **WHEN** a commit lands on `main` and the checks pass
- **THEN** the same build that was checked is deployed, and the deploy step reads the token only from the secret

#### Scenario: A fork's pull request
- **WHEN** a pull request comes from a fork
- **THEN** no secret is available to its runs and nothing is deployed

### Requirement: The production token is readable only on main
The production token `CLOUDFLARE_API_TOKEN` SHALL be readable only by the deploy job of a push to `main`: held in a `production` environment whose deployment branches are `main` only, or, on a plan without environments, a repository secret named only by that job.

#### Scenario: A job on another branch
- **WHEN** a workflow job runs on a branch other than `main` and asks for the `production` environment
- **THEN** GitHub refuses it and the production token is not exposed

### Requirement: Production and preview credentials are separate
Preview uploads SHALL use a separate token, `CLOUDFLARE_PREVIEW_TOKEN`, held in a `preview` environment (or a repository secret named only by the preview job), and used only for pull requests from branches of this repo, through the `pull_request` event and never `pull_request_target`. Either token SHALL be revocable without touching the other.

#### Scenario: A same-repo pull request
- **WHEN** the preview job runs for a pull request from a branch of this repo
- **THEN** it can read `CLOUDFLARE_PREVIEW_TOKEN` and cannot read `CLOUDFLARE_API_TOKEN`

### Requirement: Voice files exist before the site that names them
On every push to `main` while the voice host is set up (the repository variable `R2_ACCOUNT_ID` is not empty), the deploy SHALL wait for the voice step, which SHALL publish any new voice files and then confirm that every file named by the committed voice index exists on the voice host. If the voice step fails or does not run, nothing SHALL be deployed.

#### Scenario: Voice host set up
- **WHEN** a commit lands on `main`, `R2_ACCOUNT_ID` is set and the checks pass
- **THEN** the site is built with the voice host and deployed only if the voice step succeeds; if it fails or is skipped, nothing is deployed

#### Scenario: A new recording
- **WHEN** a push changes `js/voice-index.js` to a new release
- **THEN** the site is deployed only after every file of that release is on the voice host

#### Scenario: A push without voice changes
- **WHEN** a push does not change the voice index
- **THEN** the voice step still runs, finds nothing to upload, confirms the files exist, and the deploy goes ahead

### Requirement: Deploy without the voice host until it is set up
While `R2_ACCOUNT_ID` is empty, the voice step SHALL not run and the site SHALL be built without the Studio voice and deployed: no published file SHALL name the voice host, and read aloud and every Listen button SHALL use the device voice. A voice step that fails SHALL always stop the deploy.

#### Scenario: Voice host not set up yet
- **WHEN** a commit lands on `main`, `R2_ACCOUNT_ID` is empty and the checks pass
- **THEN** the voice step is skipped, the site is built with `build.py --voice off` and deployed, no published file (policy, worker or voice index) names `voice.learnvedicmath.com`, and a Listen button reads with the device voice

### Requirement: A preview for every branch
A pull request from a branch of this repo SHALL get a preview version on `workers.dev` with an alias for that pull request, built with the preview flag (no indexing), whose URL is posted on the pull request.

#### Scenario: Opening a pull request
- **WHEN** a pull request is opened from a branch of this repo
- **THEN** a comment gives its preview URL, and that preview answers with `X-Robots-Tag: noindex, nofollow`

### Requirement: End-to-end runs against previews and production
The Playwright suite SHALL run against the preview of each pull request, against production after each deploy once the live files match the commit, daily, and on demand with a chosen base URL. It SHALL never write to production Firestore or count analytics visits.

#### Scenario: After a deploy
- **WHEN** a deploy finishes
- **THEN** the suite waits until `/play/`, `/sw.js` and `/js/app.js` on learnvedicmath.com match the build of that commit, then runs

### Requirement: Watching the move and the site
The daily run SHALL check the moved page on sbmadhav.com during Phase B and the 301 from sbmadhav.com/vedic-math/ from Phase C. An external uptime monitor SHALL watch `/`, `/play/` and `/sw.js` and alert the owner.

#### Scenario: GitHub stops redirecting
- **WHEN** `https://sbmadhav.com/vedic-math/x` no longer answers with a 301 to learnvedicmath.com in Phase C
- **THEN** the daily run fails and names the check

### Requirement: Dependencies and code are scanned
Dependabot SHALL propose updates for GitHub Actions and for every npm folder weekly. Code scanning SHALL run on every pull request: CodeQL while the repo is public, Semgrep Community Edition and a secret scan once it is private.

#### Scenario: A private repo
- **WHEN** the repo is private
- **THEN** a pull request still gets a Semgrep and a secret scan result
