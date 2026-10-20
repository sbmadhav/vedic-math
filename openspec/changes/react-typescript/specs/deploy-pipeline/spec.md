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

## ADDED Requirements

### Requirement: Test runs never make a new voice recording
Every Playwright and performance run against a preview or a local server SHALL answer the voice host and the server voice endpoint from test fixtures, or run with the server voice switched off. Production runs are the one exception: they SHALL only read a Server line already cached under `live/` on the voice host, and any request to `/api/voice/v1/say` SHALL fail the run.

#### Scenario: A missing fixture
- **WHEN** a test with read aloud on is asked a sentence that no fixture covers
- **THEN** the request is answered by the test's stub, not the live endpoint, and the test fails naming the sentence

#### Scenario: The production voice check
- **WHEN** the production run plays a Server line
- **THEN** it is a Server line the Worker cached earlier under `live/`, read from the voice host, and the run sends no request to `/api/voice/v1/say`
