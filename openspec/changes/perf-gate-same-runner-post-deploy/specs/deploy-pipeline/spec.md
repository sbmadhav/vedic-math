# Spec Delta

## MODIFIED Requirements

### Requirement: Production and preview credentials are separate
Preview uploads SHALL use a separate token, `CLOUDFLARE_PREVIEW_TOKEN`, held in a `preview` environment (or a repository secret named only by the preview job), and used only for pull requests from branches of this repo, through the `pull_request` event and never `pull_request_target`, and for the upload of the pinned performance reference build after a deploy (the `reference` job of `e2e.yml`, in the `preview` environment, in a workflow with no pull request trigger, so that only a push to `main` or a run started by someone with write access reaches it). Either token SHALL be revocable without touching the other. The pinned reference SHALL be uploaded as a Worker version with a preview alias, never deployed, so it never changes what https://learnvedicmath.com serves.

#### Scenario: A same-repo pull request
- **WHEN** the preview job runs for a pull request from a branch of this repo
- **THEN** it can read `CLOUDFLARE_PREVIEW_TOKEN` and cannot read `CLOUDFLARE_API_TOKEN`

#### Scenario: The pinned performance reference after a deploy
- **WHEN** a push to `main` runs `e2e.yml`
- **THEN** its `reference` job can read `CLOUDFLARE_PREVIEW_TOKEN` and not `CLOUDFLARE_API_TOKEN`, uploads the pinned build as a version with the alias `perf-ref`, and no other job of the workflow names either token
