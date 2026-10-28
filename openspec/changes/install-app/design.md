# Design

## Context

- The game is a Legacy view app at `/play/` (`js/app.js`, hash routes), migrating to React Router at `/learn/` (`react-typescript`). Modules in `js/` are served as written, with an import map; there is no bundler until phase 2, so new code for the Legacy views is JavaScript in `js/` (AGENTS.md: "New code is TypeScript, and React for views" applies to `app/`; a Legacy module that `js/app.js` imports today cannot be TypeScript).
- `manifest.webmanifest` (learnvedicmath D7, site-assets spec "Its own installable app") has name, short name, `id` `/play/`, `start_url` `/play/?source=pwa`, scope `/play/`, standalone, the Nikhilam Family icons (192, 512, maskable 512, SVG) and the Daybreak background. `e2e/tests/load.spec.ts` already checks Chromium's installability on `/play/`.
- `app/src/sw/sw.ts` registers with scope `/play/`, answers every navigation under `/play/` network first with the saved shell as the fallback, and `build.py` precaches every import-map module and every manifest icon with its hash.
- The design system's `header.js` keeps the one `<meta name="theme-color">` on the current `--bg` after it loads (deferred).
- Things that already ask for a Player's attention unasked: the first-visit tour (a `<dialog>`), toasts (`fx.toast`), the age question (a dialog, only when posting). The Family helpers change (branch `family-helpers`, an overlay layer and its z-index token) is not on `main` yet.
- Analytics go through `js/metrics.js` (`math/` prefix, fixed words, a scan of every call site in `test/metrics.test.mjs`).
- Audit of earlier install notes (`_handoff/RESUME.md`, 2026-10-16 design audit): generic "Install" label; Explore links opening inside the installed app; the same icons as sbmadhav.com; installs before 14 October are the root "Madhav" app. On `main` today: no Explore menu (removed by the move), the Nikhilam Family icons (2026-10-20), the game's own manifest and scope; still open: footer links and the brand open inside the Installed app, and no install guidance beyond one Guide line.

## Goals / Non-Goals

Goals: installable everywhere it can be, with the richer install dialog where the browser has one; a guide that is right for the browser in hand and honest where installing is not possible; one well-timed, easy-to-dismiss nudge on Home; an Installed app that behaves like an app.

Non-goals: a native app store listing; push notifications; iOS splash images; any change to who can post, what is sent or when an identity is created (no ADR is touched).

## Decisions

### D1. The manifest

- `id` stays `/play/` so installs update in place when `react-typescript` 2.10 moves `start_url` and scope to `/learn/`. `start_url` stays `/play/?source=pwa`.
- Icons: `any` at 192 and 512 (the rounded mark), `maskable` at 192 and 512 (the family inside the 40% safe circle; the 192 cut is new, from `tools/brand/render.mjs`), the SVG. The Nikhilam Family is not the sbmadhav.com mark, so the "same icons as the main site" finding is closed.
- `background_color` and `theme_color` are the Daybreak `--bg` (`#F6F7F9`), checked against the vendored `tokens.css` by `test/install.test.mjs`. A manifest has one color for both schemes; the splash is Daybreak, and the page's own `theme-color` follows the scheme (D2).
- Screenshots: two narrow (Home and a Star, 390 x 844 at 2x, 780 x 1688) and one wide (Home, 1280 x 800), PNG, in `/screenshots/`, made by `e2e/screenshots.mjs` from a local build with a made-up Player. They are not precached (only the browser's install dialog fetches them) and so do not count against the first-load budget.
- Shortcuts: Arena (`#/arena`), Practice (`#/learn`, the skill map) and Sutras (`#/sutras`), the three the owner's request names. Routes work in every Mode; without a Mode the Mode picker opens first and then the shortcut's page (the existing `afterPick`). No shortcut icons: launchers use the app icon.
- `launch_handler` `navigate-existing`: a shortcut or a second launch reuses the open window instead of opening another.
- `lang` `en`, `dir` `ltr`, `categories` unchanged.

### D2. Page tags

- iPhone and iPad: `apple-mobile-web-app-title` "Vedic Math" (the short name under the icon), `apple-mobile-web-app-capable` and `mobile-web-app-capable` "yes" (both: older iOS reads the first, Chrome asks for the second), `apple-mobile-web-app-status-bar-style` `default`. The Apple touch icon is already linked.
- `theme-color`: the single meta tag stays (two tags with `media` queries cannot follow a saved scheme that differs from the system's), now before the pre-paint script, which sets it to the Deep Space `--bg` when that is the scheme in effect. `header.js` keeps it in step after that. So the browser bar and the Installed app's title bar match the page from the first paint in both schemes.

### D3. Links that leave the Installed app

In the Installed app (D5), one capture-phase click listener for the page's lifetime gives any link outside `/play/` (another origin, or this origin outside the scope) `target="_blank"` and `rel="noopener noreferrer"` before the browser acts on it. A new browsing context from an installed app goes to the browser on Android, ChromeOS, Windows, macOS and iOS, so For grown-ups, Privacy, the landing page and every outside link open there and the app stays on its route. The brand's `href` becomes `#/` in the Installed app (Home of the game, which is the app's home) and is put back if the display mode changes. Links inside the scope are untouched. Nothing changes in a browser tab.

### D4. When the nudge shows

All of these, in `nudgeDue()` (`js/install-rules.js`):

1. **Engaged: the Player has played on an earlier day** (`store.playedBefore()`). A second day of play is the clearest sign the game is worth a home screen icon, it is the moment an icon helps (coming back), and it keeps the nudge off the first visit, when the tour, "New here?" and the Mode picker already speak. The finished-round or Star alternative was weighed: it would show on day one, next to "New here?", and would need a hook in every round's result.
2. **Can install now**: the browser has handed over its install prompt (`beforeinstallprompt`), or it is Safari on iPhone or iPad, which installs only from the Share sheet and never fires the event. Chrome, Edge, Firefox on iPhone (Share works since iOS 16.4, but the steps are less certain), in-app web views, desktop Safari and Firefox get no nudge: they get the guide from the entry points.
3. **Not installed** (D5).
4. **The schedule** (D6).
5. **The Prompt slot is free** (D7).

Where: one slot, `#installSlot`, after "New here?" and before Keep going on the tile home, and after "New here?" on the Sky. It is an `<aside>` with a bold line (not a heading, so the router's focus on the view's first heading is unchanged), the 48 px app icon, one line, Install (one tap) or Show me how (the guide), and Not now. It appears with the toast animation, none under Calm, Pause motion or reduced motion. It is never in a round: it lives only in Home's slot, and the slot is gone when the route changes (the view signal). It is counted once per page load.

Explorer: the Mode picker says Explorer is about 4 to 7. Installing needs the device's owner on most phones (an app install confirmation, sometimes a store or a password) and the age-bands plan keeps Early copy short and plain; so the Explorer nudge and guide speak to the grown-up ("Grown-ups: add Vedic Math to this device", "For a grown-up: add the app", "Ask a grown-up to do these steps"), in short sentences. Challenger and Pro read their own words.

### D5. Installed or not

`isInstalled()`: a display mode of `standalone`, `fullscreen`, `minimal-ui` or `window-controls-overlay`, or `navigator.standalone` on iOS. Separately, `appinstalled` saves `installed` in `vm.install`; while that is set and the browser has not handed over a new prompt, the browser counts as "the app is here" (`appHere()`): no nudge, no entry points. A new `beforeinstallprompt` clears it, since a browser offers to install only while the app is not installed (the Player removed it). iOS has no `appinstalled`; the home screen app is a separate context there, so Safari keeps offering the guide, which is right (the home screen app may have been removed, and the guide says the home screen app keeps its own progress).

### D6. "Not now"

`later` counts the presses, `until` hides the nudge for 7 days from the last one; after 3 the nudge never shows again on this device, and the Me page, the footer and the Guide still open the guide. 7 days and 3 times follow the owner's own example; three weeks of patience with a nudge that costs one tap to dismiss is about the most a game for children should ask. Focus goes to Home's heading after Not now (the button it was on is gone). The state is `vm.install` in `localStorage`, device-wide like `vm.calm` and `vm.tour` (not per Player: installing is per device), read and written through try/catch like the store's own keys, and never sent.

### D7. One prompt at a time (the Prompt slot)

`js/prompt-slot.js`: `free()`, `claim(name, signal)`, `release(name)`. `free()` is false while a holder has the slot or while something already speaks to the Player: `dialog[open]` (the tour, the age question, a Deep dive, the video player, the Install guide), `.fx-toast`, `html.play-open` (a round) or `html.tour-open`. A claim is released when its signal aborts (the route changes) or by `release`. The nudge claims `install`; the tour claims `tour` as soon as it is due on Home, before it opens, so the two never stack; a nudge that was kept waiting looks again every 2 s for a minute (by then the toast has gone or the Player is busy) and shows once the slot is free. The tour does not wait for the slot (it is the first-visit help). Family helpers is not on `main`; its visitors should `claim('family', signal)` before showing and stay away while `free()` is false, and the rule is written as the install-app spec's "One prompt at a time" requirement so that change can extend it.

### D8. The Install guide

- A `<dialog>` (`showModal`: the rest of the page is inert, so Tab stays inside; Escape closes it; focus returns to the button that opened it), styled as the existing `.vm-sheet`, `aria-labelledby` its title and `aria-describedby` its lead line. Focus starts on Install now when there is a prompt, else on the steps list (so a screen reader reads the steps next), else Close.
- Content: the title and lead in the Mode's words; why install (three lines with pictures: offline, full screen, its own icon); Install now when the browser has handed over its prompt (the prompt can be used once; after the Player's answer the button goes and the status line says what happened); then the steps for this browser as an ordered list labelled by its heading, each with a number, a picture and a visually hidden "Step n of m:"; a note where one is needed; "Another device or browser?" with a picker of every kind (`aria-pressed`), which swaps only the steps, keeps focus on the picked button and announces the change; a status line (`role="status"`).
- Platforms (`platformOf()`): in-app web views first (Instagram, Facebook, Messenger, TikTok, Snapchat, LinkedIn, Pinterest, X, Line, WeChat, the Google app, Gmail, and any Android WebView, by user agent tokens; and an iOS user agent without "Safari/"), then iOS (iPhone, iPad, and iPadOS asking for desktop pages: a Mac user agent with a touch screen): Safari, or Chrome, Firefox, Edge or Opera on iOS; Android: Samsung Internet, Firefox, other Chromium browsers, Chrome; desktop: Firefox, Edge, Chrome or Chromium (and ChromeOS), Safari on a Mac; anything else gets general steps.
- One tap: Chrome, Edge, Samsung Internet and other Chromium browsers on Android, ChromeOS, Windows, macOS and Linux, whenever they fire `beforeinstallprompt` (the guide shows Install now, the nudge's Install calls it directly). Steps only: Safari on iPhone and iPad (Share, Add to Home Screen, Add), Chrome, Edge and Firefox on iOS (Share, Add to Home Screen; iOS 16.4 or later), in-app web views (open in the browser first, Copy the link), Firefox on Android (menu, Add app to Home screen), any Chromium browser that has not fired the event (menu or address bar steps), Safari on a Mac (File, Add to Dock, macOS Sonoma or later). Not possible: Firefox on a computer, said plainly, with Chrome, Edge or Safari, or a bookmark (it still works offline after one visit).
- iPhone, iPad and Mac Safari keep the home screen or Dock app's storage apart from Safari's, so a Player's progress does not follow them into the app. The guide says so and points to the Me page's backup code, which already moves progress between browsers. Android and desktop Chromium share storage between the browser and the app.
- Text and pictures only: no Listen button, no line in any voice table, so no Studio voice re-record (AGENTS.md).
- Entry points: the Me page (Settings, a card with How to install), the footer of every game page (Install the app, next to Privacy; the site-header spec fixes the header's parts and their order, and a 320 px header row is full, so the footer is the menu every page has), the Guide's Offline section (How to install, its Try it action), and the nudge. All are hidden when the app is here (D5).

### D9. Code shape, and the port to React

- `js/install-rules.js`: pure (platform, installed, state, schedule, nudge rule), tested in Node (`test/install.test.mjs`). Ports as is to `app/src/logic/install.ts` with group 3 (logic).
- `js/prompt-slot.js`: pure apart from `document.querySelector`; ports to `app/src/logic/prompt-slot.ts` and a `usePromptSlot(name)` hook in phase 3.
- `js/install.js`: the boot listeners, the guide and the nudge. `initInstall()` runs once at boot before the first render: `beforeinstallprompt`, `appinstalled`, the display-mode change and the link listener are page events, added once through `life.on` with a page-lifetime signal (never aborted), so `test/lifecycle-scan.test.mjs` can hold the module to no bare listeners or timers. The nudge's listeners and its look-again timer run on a child of Home's view signal; the guide's on a child of the page signal that aborts when it closes.
- Phase 2 (`react-typescript` 2.10): the manifest's `start_url` becomes `/learn/?source=pwa` and its scope `/learn/`, keeping `id` `/play/`; the shortcuts become `/learn/arena`, `/learn/learn` (or the new Practice path) and `/learn/sutras`; `SCOPE` in `install-rules.js` follows; the offline shell (`/learn/__shell.html`, 2.5 and 2.6) answers the new `start_url`, and `offline.spec.ts`'s start_url test reads the manifest, so it follows by itself.
- Phase 3 (shell pieces, group 4): `app/src/shell/InstallGuide.tsx` (the dialog), `InstallNudge.tsx` (Home's slot), the footer link in the shell's footer, and a `useInstallPrompt()` hook in the root layout that captures `beforeinstallprompt` in an effect and exposes it through `useSyncExternalStore` with a server snapshot of "no prompt, not installed", so nothing a server render reaches reads `window` or `localStorage` (AGENTS.md, design D14). The link rule (D3) becomes a root layout effect. Locks: Home and Me when their views move.

### D10. Counts

`metrics.install(kind, from)`: `nudge_shown` (once per page load), `nudge_later`, `wizard_open/<home|me|footer|guide>`, `prompt_accepted`, `prompt_dismissed`, `installed`, `opened` (once per page load in the Installed app). No browser, platform, Mode or count: GoatCounter already records the browser on its own page views, and a platform name next to an install count adds nothing the gates need. Titles are "Vedic Math: install".

### D11. Offline

No worker change: the worker answers every navigation under `/play/` with the saved shell offline, including `?source=pwa` and the shortcuts' hash URLs, and the build precaches every import-map module (so the three new modules) and every manifest icon (so `maskable-192.png`). `offline.spec.ts` gains a test that reads the manifest and opens its `start_url` and each shortcut offline after one visit.

### D12. First load

The first-load budget (`docs/perf/baseline.json`) counts every precached file. This change adds about 16 KB Brotli: `install.js` (the steps for twelve kinds of browser, about 7 KB), `install-rules.js`, `prompt-slot.js`, `maskable-192.png` (4 KB), and small growth in `app.js`, `math.css`, the page and the manifest. Loading the guide's text on demand would not lower the number, since the build precaches every module. The baseline records the growth and why.

The paint is another matter: Lighthouse's simulated largest contentful paint waits for every static import of `app.js` (`docs/perf/baseline.md`), and a first run with `install.js` and `install-rules.js` in that graph read 90 to 290 ms more on every page, past the 100 ms tolerance. So `app.js` does not import `install.js` statically: `loadInstall()` imports it 100 ms after the first render (after the first paint), `withInstall(fn, signal)` queues what a view wants from it until then (the nudge's mount, the Me card, the Guide's action), and `app.js` itself catches an early `beforeinstallprompt` and hands it to `initInstall(early)`. `prompt-slot.js` (0.6 KB) stays static: the tour claims it during the first render. The module is pinned and precached like every file under `js/`, so offline is unchanged.

## Risks / Trade-offs

- User agent sniffing can be wrong (a new in-app browser, a renamed token). Mitigation: the picker shows every kind's steps, and the general steps cover the rest. The nudge is offered only where the signal is reliable (a real prompt event, or Safari on iOS).
- A browser may stop firing `beforeinstallprompt` (Chrome changes its heuristics). Then the nudge simply does not show there; the guide's menu steps still work.
- `navigate-existing` is not supported everywhere; browsers that do not know it open a new window as today.
- Explorer families on a shared phone: the nudge speaks to the grown-up, and after three "Not now"s it stops for the whole device, which is the right unit for an install.

## Migration Plan

Ship with the next deploy; nothing to migrate (`vm.install` starts empty). Players who installed before see the new name, icons and shortcuts after the browser refreshes the manifest (Chrome checks it about once a day when the app is opened).

## Open Questions

None blocking. Owner tasks are in `tasks.md` group 7.
