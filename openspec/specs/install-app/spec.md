# install-app Specification

## Purpose
Let a Player install the game as its own app on any phone, tablet or computer that can, say honestly where it cannot, offer it on Home at a good moment and only then, and keep the Installed app working like an app: offline, full screen, with links that leave it opening in the browser.

## Requirements

### Requirement: The manifest describes one app
The web app manifest SHALL name the app "Learn Vedic Math" (short name "Vedic Math") with `id` `/play/`, `start_url` `/play/?source=pwa`, `scope` `/play/`, `display` `standalone`, `lang` `en` and a description, and its `background_color` and `theme_color` SHALL equal the Daybreak `--bg` token.

#### Scenario: The manifest
- **WHEN** the manifest is read
- **THEN** it has those fields, and both colors are the vendored design system's Daybreak `--bg`

#### Scenario: Chromium finds it installable
- **WHEN** Chromium opens `/play/`
- **THEN** it reports no installability error and its manifest parser reports no error or warning

### Requirement: Icons, screenshots and shortcuts
The manifest SHALL list Nikhilam Family icons with purpose `any` and `maskable` at 192 and 512 px and the SVG, at least one `narrow` and one `wide` screenshot with a label, shortcuts to the Arena, Practice and the Sutras whose URLs are inside the scope, and a `launch_handler` that reuses an open window. Every icon and screenshot SHALL be served by this site at its stated size.

#### Scenario: What the install dialog shows
- **WHEN** a browser reads the manifest's icons, screenshots and shortcuts
- **THEN** each file is served from this site at the size the manifest states, and every shortcut URL starts with `/play/#/`

### Requirement: Tags for iPhone, iPad and the browser bar
The game page SHALL link the manifest and the Apple touch icon, name the app for iPhone and iPad (`apple-mobile-web-app-title` "Vedic Math", `apple-mobile-web-app-capable` and `mobile-web-app-capable` "yes"), and set `theme-color` to the current scheme's `--bg` from before the first paint.

#### Scenario: iPhone and iPad
- **WHEN** Safari on an iPhone reads the game page
- **THEN** it finds the Apple touch icon, the title "Vedic Math" and the full-screen meta tags

#### Scenario: The bar follows the scheme
- **WHEN** the game opens on a device in Deep Space, or with Deep Space saved on a Daybreak device
- **THEN** the page's `theme-color` is the Deep Space `--bg`, and with Daybreak it is the Daybreak `--bg`

### Requirement: Links that leave the Installed app open in the browser
In the Installed app, a link to a page outside `/play/` (the landing page, the grown-up pages, another site) SHALL open in a new browsing context, which the system gives to the browser, and the app SHALL stay where it was. The brand in the header SHALL go to the game's Home inside the app. In a browser tab nothing SHALL change: the brand goes to the landing page and links open where they did.

#### Scenario: For grown-ups from the app
- **WHEN** a Player in the Installed app taps For grown-ups in the footer
- **THEN** `/parents/` opens in a new browsing context and the app stays on its route

#### Scenario: The brand in the app
- **WHEN** a Player in the Installed app taps the brand
- **THEN** the game's Home opens, not the landing page

#### Scenario: In a browser tab
- **WHEN** a Player opens the game in a browser tab
- **THEN** the brand links to `/?home` and the footer links have no target

### Requirement: The Install guide
The system SHALL offer an Install guide, a dialog opened from the Me page, from "Install the app" in the footer of every game page, from the Guide's Offline section and from the Install nudge. It SHALL say why to install in the Mode's words (offline, full screen, its own icon; Explorer's words speak to the grown-up), show the steps for the browser it is in, and offer a picker with the steps for any other device. It SHALL be text and pictures only, with no read-aloud line.

#### Scenario: From the Me page, the footer and the Guide
- **WHEN** a Player presses How to install on the Me page, Install the app in the footer, or How to install in the Guide's Offline section
- **THEN** the Install guide opens with the steps for this browser

#### Scenario: Another device
- **WHEN** the Player picks Mac (Safari) under Another device or browser
- **THEN** the steps change to File, Add to Dock, the picked button is pressed and keeps focus, and the change is announced

#### Scenario: Explorer
- **WHEN** an Explorer Player opens the guide
- **THEN** its title is "For a grown-up: add the app"

### Requirement: One tap where the browser offers it
When the browser has offered to install the app (`beforeinstallprompt`), the Install guide SHALL put Install now first, which shows the browser's own install dialog, and SHALL then say whether the app is being installed; the menu steps SHALL stay below it. The offer SHALL be used once.

#### Scenario: Install now
- **WHEN** the browser has offered to install and the Player opens the guide and presses Install now
- **THEN** Install now had focus, the browser's install dialog is shown, Install now goes, and the guide says the app is being installed when the Player accepts

### Requirement: Steps for each browser
The steps SHALL fit the browser: on iPhone and iPad, Share then Add to Home Screen, with a note that the home screen app keeps its own progress and a backup code brings it along; in another app's web view, open the page in the browser first, with Copy the link; on Android and in Chrome or Edge on a computer, the menu or address bar steps; in Safari on a Mac, File then Add to Dock; in Firefox on a computer, that it cannot install, with other browsers or a bookmark.

#### Scenario: Safari on iPhone
- **WHEN** a Player on Safari on an iPhone opens the guide
- **THEN** it shows three steps (Share, Add to Home Screen, Add) and the note about the home screen app's own progress and a backup code

#### Scenario: Inside another app
- **WHEN** the game is open inside Instagram's web view and the Player opens the guide
- **THEN** the steps say to open the page in the browser first, and a Copy the link button is there

#### Scenario: Firefox on a computer
- **WHEN** a Player on Firefox on a computer opens the guide
- **THEN** it says Firefox on a computer cannot install web apps and offers Chrome, Edge or Safari, or a bookmark

### Requirement: The guide works by keyboard, by screen reader and on a small phone
The Install guide SHALL move focus into itself, keep Tab inside while open, close on Escape and put focus back where it was. Its steps SHALL be an ordered list labelled by its heading, each read as "Step n of m". It SHALL fit a 320 px wide screen in both schemes with nothing scrolling sideways.

#### Scenario: Keyboard and screen readers
- **WHEN** a keyboard user opens the guide from the Me page
- **THEN** focus moves into the dialog, the steps list is labelled by its heading with "Step 1 of 3" read before the first step, Tab stays inside the dialog, and Escape closes it and puts focus back on How to install

#### Scenario: A 320 px phone
- **WHEN** the guide is open on a 320 px wide screen in either scheme, with the picker open
- **THEN** nothing scrolls sideways

### Requirement: Nothing to install in the Installed app
When the game runs as the Installed app (a `standalone`, `fullscreen`, `minimal-ui` or `window-controls-overlay` display mode, or `navigator.standalone` on iPhone and iPad), the Install nudge SHALL NOT show and the Me page card, the footer's Install the app and the Guide's How to install SHALL NOT be there. After the browser reports `appinstalled`, the same SHALL hold in that browser until it offers to install the app again.

#### Scenario: Standalone
- **WHEN** a returning Player opens the Installed app and the browser offers to install
- **THEN** no nudge shows, the footer, the Me page and the Guide offer no install, and `math/install/opened` is sent

#### Scenario: iPhone home screen app
- **WHEN** the game runs with `navigator.standalone` true
- **THEN** no nudge shows and no install entry point is there

#### Scenario: Installed from the browser
- **WHEN** the browser reports `appinstalled` while Home shows the nudge
- **THEN** the nudge goes, the Me page and the footer offer no install, and `math/install/installed` is sent

### Requirement: The Install nudge on Home
Home (the tile home and the Sky) SHALL have one place for the Install nudge: a small card, not a dialog, with the app's icon, one line in the Mode's words (Explorer's to the grown-up), Install or Show me how, and Not now. Install SHALL show the browser's own install dialog when it has offered one, and open the Install guide otherwise. The nudge SHALL never show on any page but Home, so never in a round, and SHALL hold still with Calm, Pause motion or reduced motion.

#### Scenario: A returning Player on Android
- **WHEN** a Player who played on an earlier day opens Home in Chrome on Android and Chrome offers to install
- **THEN** the nudge shows with Install and Not now, and Install shows Chrome's install dialog in one tap

#### Scenario: Safari on iPhone
- **WHEN** a Player who played on an earlier day opens Home in Safari on an iPhone
- **THEN** the nudge shows with Show me how, which opens the Install guide at the Share steps

#### Scenario: Never during a round
- **WHEN** the browser offers to install during a Star
- **THEN** nothing shows in the round, and the nudge shows when the Player comes back to Home

#### Scenario: Explorer
- **WHEN** the nudge shows for an Explorer Player
- **THEN** it says "Grown-ups: add Vedic Math to this device"

#### Scenario: Calm
- **WHEN** the nudge shows with Calm or Pause motion on
- **THEN** it appears in place with no animation

### Requirement: When the nudge shows
The Install nudge SHALL show only when all of these hold: the Player has played on an earlier day; the browser has offered to install the app, or it is Safari on an iPhone or iPad; the app is not installed; the "Not now" schedule allows it; and the Prompt slot is free.

#### Scenario: Not yet, or not here
- **WHEN** a Player on their first day of play opens Home, or Chrome on Android has not offered to install, or the browser is Chrome on an iPhone or another app's web view
- **THEN** no nudge shows

### Requirement: Not now
"Not now" SHALL hide the nudge for 7 days and move focus to Home's heading. After the third "Not now" the nudge SHALL never show again on this device, and the Install guide's other entry points SHALL stay. The schedule SHALL be kept on this device only (`vm.install`: how many times, until when, and when the browser reported an install) and never sent.

#### Scenario: Not now
- **WHEN** a Player presses Not now
- **THEN** the nudge goes, focus is on Home's heading, and it does not come back for 7 days, also after a reload

#### Scenario: A week later
- **WHEN** a Player who pressed Not now once more than 7 days ago opens Home
- **THEN** the nudge can show again

#### Scenario: The third time
- **WHEN** a Player has pressed Not now three times
- **THEN** the nudge never shows again, and the Me page still has How to install

### Requirement: One prompt at a time
At most one prompt or visitor SHALL ask for a Player's attention at a time. A prompt (the Install nudge, the tour, and later ones such as the Family helpers' visitors) SHALL claim the Prompt slot while it is due or showing, and SHALL wait while the slot is held, a dialog is open, a toast shows or a round is on screen. A prompt kept waiting SHALL look again for a short while and show once the slot is free.

#### Scenario: A toast on Home
- **WHEN** a Quest complete toast is showing as Home opens and the nudge is due
- **THEN** the nudge waits and shows after the toast has gone

#### Scenario: Another prompt
- **WHEN** another prompt holds the Prompt slot
- **THEN** the nudge does not show

#### Scenario: The tour
- **WHEN** the first-visit tour is due or open on Home
- **THEN** the nudge does not show while it is

### Requirement: The Installed app opens offline
After one visit online, the Installed app SHALL open offline at its `start_url` and at each shortcut's URL, from the service worker's saved shell, and the install modules and every manifest icon SHALL be in the precache.

#### Scenario: Offline from the home screen
- **WHEN** a Player who opened the game once online opens `/play/?source=pwa` or a shortcut offline
- **THEN** the page comes from the worker and the view renders
