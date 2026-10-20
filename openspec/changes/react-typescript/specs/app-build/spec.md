# Spec Delta

## Purpose

Build the game from typed sources with one checked command, so that unsafe markup, forgotten cleanup and untyped data are caught before anything is published.

## ADDED Requirements

### Requirement: Workspaces and one build command
The repo SHALL be one pnpm workspace with the packages `app` (the game, rendered on the server by React Router), `workers` (the one Cloudflare Worker), `shared` (code and data both use), `e2e` and `tools`. `python3 build.py --out _site` SHALL install nothing, run the framework build of `app` (client files, prerendered pages, the offline shell and the Worker bundle), then write the site files the move defines, and SHALL fail if any step fails.

#### Scenario: A clean build
- **WHEN** CI runs `pnpm install --frozen-lockfile` and then `python3 build.py --out _site`
- **THEN** `_site/play/index.html`, `_site/play/__shell.html`, `_site/sw.js`, `_site/_headers`, `_site/_redirects`, the landing pages and the Worker bundle exist, and the build prints the budget table

#### Scenario: A package used without being declared
- **WHEN** a file in `app` imports a package that only `workers` lists as a dependency
- **THEN** the build fails

### Requirement: Strict TypeScript everywhere
Every source file in `app/src`, `shared/src` and `workers/src` SHALL be TypeScript checked with `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and CI SHALL fail on any type error. `shared` SHALL be checked without DOM types, so nothing in it can use the page. Legacy views SHALL be the only JavaScript files, and SHALL be gone when the migration ends.

#### Scenario: A type error
- **WHEN** a change passes a string Skill id where a number is expected in `shared/src/questions.ts`
- **THEN** `pnpm typecheck` fails in CI and in the pre-commit hook

#### Scenario: The DOM in shared code
- **WHEN** a change uses `document` in `shared/src/scoring.ts`
- **THEN** the type check fails

### Requirement: No markup from strings
No component SHALL assign to `innerHTML`, `outerHTML` or `insertAdjacentHTML`, or use `dangerouslySetInnerHTML`. Content that is stored as HTML text (question text, Trick steps, pictures) SHALL be shown only through the one `Markup` component, which parses it without running it and keeps only the elements and attributes on its allow-list. The lint step SHALL fail on any of these in `app/src`.

#### Scenario: A component sets HTML
- **WHEN** a change adds `dangerouslySetInnerHTML` to a component
- **THEN** `pnpm lint` fails and names the file and line

#### Scenario: Content with a script
- **WHEN** a question's text contains `<img src=x onerror=alert(1)>` or `<script>`
- **THEN** `Markup` renders no `img`, no `script` and no event attribute, and nothing runs

#### Scenario: Content that is allowed
- **WHEN** a question's text is `7<sup>2</sup>`
- **THEN** it is shown as 7 with a superscript 2

### Requirement: Built files are hashed, the source is not stamped
Every JS and CSS file the build emits for the game SHALL have a content hash in its name. The source in git SHALL carry no hashes and no precache list (`sw.ts` keeps `VERSION = 'dev'` and an empty `PRECACHE` between its markers), and the build SHALL fail if it does.

#### Scenario: A changed component
- **WHEN** one component changes and the site is built again
- **THEN** the chunk that contains it has a new file name, and chunks it does not affect keep theirs

### Requirement: Output fits the content security policy
The built game SHALL run under the move's policy without `'unsafe-eval'`, without `'unsafe-inline'` scripts and without any script, style, font or 3D asset from another origin. Every inline script in a prerendered page or the offline shell SHALL be allowed by its hash in that page's policy, and every inline script in a server-rendered page SHALL carry the nonce made for that response. The policy for both SHALL come from one source, and rendered pages SHALL carry no `style` attributes.

#### Scenario: A prerendered page
- **WHEN** `/play/sutras/ekadhikena/` is opened with the published headers
- **THEN** no CSP violation is reported

#### Scenario: A server-rendered page
- **WHEN** `/play/arena` is rendered by the server
- **THEN** every inline script in it carries the response's nonce, the policy names that nonce, and no CSP violation is reported

#### Scenario: The two policies drift
- **WHEN** a change adds a source to the policy the Worker sets but not to `_headers`
- **THEN** the tests fail and name the directive

### Requirement: No secret or provider endpoint in published files
No file the browser can download SHALL hold an API key or the address of a speech provider; keys SHALL exist only as Cloudflare secrets used by the Worker.

#### Scenario: A key in client code
- **WHEN** a change puts a Google API key or `texttospeech.googleapis.com` in a client module
- **THEN** `python3 build.py --out _site` fails and names the file

### Requirement: Tests and checks
Unit tests SHALL run with Vitest (`pnpm test`), which replaces `node --test`. CI and the pre-commit hook SHALL run the type check, lint (ESLint with the lifecycle and markup rules, and stylelint for raw colors), Vitest and the build, and CI SHALL run the Playwright suite against the pull request's preview.

#### Scenario: A raw color in component CSS
- **WHEN** a change writes `color: #ff6b6b` in `app/src/views/arena/Arena.css`
- **THEN** stylelint fails and names the declaration

#### Scenario: The pre-commit hook
- **WHEN** a commit is made with a failing Vitest test
- **THEN** the hook stops the commit
