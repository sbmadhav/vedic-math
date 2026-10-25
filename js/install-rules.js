/* The rules behind installing the game as an app (openspec change install-app): which browser this is and how it
   installs, whether the game is already running as the installed app, and when Home may show the install nudge.
   Pure functions with no DOM and no storage, so test/install.test.mjs runs them in Node; js/install.js reads the
   browser and the device and passes the facts in. Ports to app/src/logic/install.ts with the shell pieces (design D9).

   Words (GLOSSARY.md): the Installed app, the Install guide (the dialog with the steps), the Install nudge (the small
   card on Home) and the Prompt slot (js/prompt-slot.js). */

/* The installed app's scope: links outside it open in the browser (openspec install-app, "Links that leave the app").
   Phase 2 of react-typescript moves it to /learn/ (task 2.10) together with the manifest. */
export const SCOPE = '/play/';

/* The Install nudge's schedule: "Not now" hides it for LATER_DAYS; after MAX_LATER of them it never comes back and
   only the Install guide's entry points remain (Me, the footer, the Guide) */
export const LATER_DAYS = 7;
export const MAX_LATER = 3;
const DAY = 864e5;

/* Every kind of browser the Install guide has steps for. ONE_TAP is not a kind: any kind whose browser handed the
   page an install prompt (beforeinstallprompt) also gets the one-tap Install button. */
export const KINDS = ['ios-safari', 'ios-browser', 'in-app', 'android-chrome', 'android-samsung', 'android-firefox', 'android-other',
  'desktop-chrome', 'desktop-edge', 'mac-safari', 'desktop-firefox', 'other'];

/* Apps that open links in their own web view, where nothing can be installed: Instagram, Facebook and Messenger,
   TikTok, Snapchat, LinkedIn, Pinterest, X (Twitter), Line, WeChat, the Google app, Gmail's web view; and any
   Android WebView (the "; wv)" token) */
const IN_APP = /\b(Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger|musical_ly|TikTok|BytedanceWebview|Snapchat|LinkedInApp|Pinterest|Twitter|Line\/|MicroMessenger|GSA\/|GoogleApp|Gmail)\b|; wv\)/i;

/* platformOf({ ua, touch }): the kind of browser, from its user agent string and navigator.maxTouchPoints.
   iPadOS asks for desktop pages with a Mac user agent, so a "Macintosh" with a touch screen is an iPad. On iOS every
   browser is Safari's engine; the ones that say "Safari/" without another browser's token are Safari itself, and an
   iOS user agent without "Safari/" is an app's own web view. */
export function platformOf({ ua = '', touch = 0 } = {}) {
  const s = String(ua);
  const ios = /\b(iPhone|iPad|iPod)\b/.test(s) || (/\bMacintosh\b/.test(s) && touch > 1);
  if (IN_APP.test(s)) return 'in-app';
  if (ios) {
    if (/\b(CriOS|FxiOS|EdgiOS|OPiOS|OPT)\//.test(s)) return 'ios-browser';
    return /\bSafari\//.test(s) ? 'ios-safari' : 'in-app';
  }
  if (/\bAndroid\b/.test(s)) {
    if (/\bSamsungBrowser\//.test(s)) return 'android-samsung';
    if (/\bFirefox\//.test(s)) return 'android-firefox';
    if (/\b(EdgA|OPR|Opera|YaBrowser|UCBrowser|Vivaldi)\//.test(s)) return 'android-other';
    return /\bChrome\//.test(s) ? 'android-chrome' : 'android-other';
  }
  if (/\bFirefox\//.test(s)) return 'desktop-firefox';
  if (/\bEdg\//.test(s)) return 'desktop-edge';
  if (/\b(Chrome|Chromium)\//.test(s) || /\bCrOS\b/.test(s)) return 'desktop-chrome';
  if (/\bMacintosh\b/.test(s) && /\bVersion\/[\d.]+.*\bSafari\//.test(s)) return 'mac-safari';
  return 'other';
}

/* The kinds where the Install nudge may show without an install prompt: Safari on iPhone and iPad, which never fires
   one and installs from the Share sheet. Everywhere else the nudge needs the browser's own prompt in hand. */
export const NUDGE_WITHOUT_PROMPT = ['ios-safari'];

/* Running as the installed app: a standalone-like display mode, or iOS's navigator.standalone */
export const isInstalled = ({ displayMode = 'browser', iosStandalone = false } = {}) =>
  iosStandalone === true || ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].includes(displayMode);

/* The device's install state, as saved under vm.install (never sent): later, how many times "Not now" was pressed;
   until, the time before which the nudge stays hidden; installed, when this browser said the app was installed
   (appinstalled). Anything else saved there is ignored. */
export function readState(raw) {
  let v = raw;
  if (typeof raw === 'string') { try { v = JSON.parse(raw); } catch (e) { v = null; } }
  const n = x => (Number.isFinite(x) && x > 0 ? x : 0);
  return v && typeof v === 'object' ? { later: Math.min(MAX_LATER, Math.floor(n(v.later))), until: n(v.until), installed: n(v.installed) } : { later: 0, until: 0, installed: 0 };
}

/* "Not now": one more, hidden for LATER_DAYS from now */
export const pressLater = (state, now) => ({ ...readState(state), later: Math.min(MAX_LATER, readState(state).later + 1), until: now + LATER_DAYS * DAY });
/* appinstalled: the nudge never shows on this device again */
export const markInstalled = (state, now) => ({ ...readState(state), installed: now });
/* beforeinstallprompt after an install: the browser offers it again, so the app was removed; the "Not now" count stays */
export const markNotInstalled = state => ({ ...readState(state), installed: 0 });

/* nudgeDue: whether Home may show the Install nudge now. Every fact is passed in:
   - kind and canPrompt: a browser that can install in one tap (it handed over its prompt), or Safari on iPhone or iPad;
   - installed: running as the Installed app now; state.installed: this browser said it installed the app;
   - engaged: the Player has played on an earlier day (a second day of play, design D4);
   - busy: another prompt or visitor holds the Prompt slot, a dialog is open or a toast is showing;
   - state and now: the "Not now" schedule. */
export function nudgeDue({ kind, canPrompt = false, installed = false, engaged = false, busy = false, state, now }) {
  const s = readState(state);
  if (installed || s.installed || !engaged || busy) return false;
  if (!canPrompt && !NUDGE_WITHOUT_PROMPT.includes(kind)) return false;
  if (s.later >= MAX_LATER) return false;
  return !(s.until && now < s.until);
}
