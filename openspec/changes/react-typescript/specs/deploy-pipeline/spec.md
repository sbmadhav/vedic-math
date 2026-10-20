# Spec Delta

## MODIFIED Requirements

### Requirement: End-to-end runs against previews and production
The Playwright suite SHALL run against the preview of each pull request, against production after each deploy once the live files match the commit, daily, and on demand with a chosen base URL. The performance checks SHALL run against each pull request's preview and against production after each deploy. Neither SHALL ever write to production Firestore, count analytics visits, or ask the server voice to make a new recording.

#### Scenario: After a deploy
- **WHEN** a deploy finishes
- **THEN** the suite waits until `/play/`, `/sw.js`, the entry chunk that `/play/` names and the build id a server-rendered page reports (a response header) on learnvedicmath.com match the build of that commit, then runs

#### Scenario: A pull request preview
- **WHEN** a preview is uploaded for a pull request
- **THEN** the Playwright suite and the performance checks run against it, and either one failing fails the pull request
