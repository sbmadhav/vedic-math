/* Installing the game as an app (openspec change install-app): the Install guide (a dialog with the steps for this
   browser, and the one-tap Install button where the browser offers one), the Install nudge on Home, the entry points
   on the Me page, the footer and the Guide, and what changes inside the Installed app (links that leave the app open
   in the browser; the brand goes to the game's Home).

   The rules are in js/install-rules.js (pure, tested in Node). This module reads the browser and the device and draws.
   initInstall() runs once at boot: the browser's install prompt (beforeinstallprompt) and appinstalled are page events
   that can fire before any view exists, so they are listened to for the page's lifetime through life.on with a signal
   that is never aborted. Every listener a view or a dialog adds is tied to that view's or that dialog's own signal.
   The device's install state (vm.install) stays in this browser and is never sent. Text and pictures only: nothing
   here is read aloud. Ports to app/src/shell/ (InstallGuide, InstallNudge) with the shell pieces (design D9). */
import { on, every, child, onAbort } from './life.js';
import * as fx from './fx.js';
import * as store from './store.js';
import * as metrics from './metrics.js';
import { SCOPE, platformOf, isInstalled, readState, pressLater, markInstalled, markNotInstalled, nudgeDue, KINDS } from './install-rules.js';
import { free, claim, release } from './prompt-slot.js';

const KEY = 'vm.install';
const page = new AbortController(); /* the page's lifetime: never aborted */
let deferred = null; /* the browser's install prompt, kept until used */
let justInstalled = false; /* appinstalled fired in this page load */
const subs = new Set();
const notify = () => subs.forEach(fn => { try { fn(); } catch (e) {} });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Facts from the browser and the device ---------- */
const mm = q => { try { return matchMedia(q).matches; } catch (e) { return false; } };
const displayMode = () => ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].find(m => mm(`(display-mode: ${m})`)) || 'browser';
export const installed = () => isInstalled({ displayMode: displayMode(), iosStandalone: navigator.standalone === true });
export const kind = () => platformOf({ ua: navigator.userAgent, touch: navigator.maxTouchPoints || 0 });
export const canPrompt = () => !!deferred;
const getState = () => { try { return readState(localStorage.getItem(KEY)); } catch (e) { return readState(null); } };
const putState = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
/* The app is here already: running as the Installed app, or this browser said it installed it (appinstalled) and has
   not offered to install it again since (a browser offers its prompt only while the app is not installed). Then the
   nudge and the entry points stay away. Every other browser gets the guide, even one that cannot install (it says so). */
export const appHere = () => installed() || (!!getState().installed && !canPrompt());

/* fn() after the install prompt arrives, is used, or the app is installed; removed when signal aborts */
export function onInstallChange(fn, signal) { subs.add(fn); onAbort(signal, () => subs.delete(fn)); }

/* ---------- Boot ---------- */
let started = false;
export function initInstall() {
  if (started) return; started = true;
  const ps = page.signal;
  /* Our nudge and guide stand in for the browser's own install bar. A prompt means the app is not installed (again). */
  on(window, 'beforeinstallprompt', e => { e.preventDefault(); deferred = e; const st = getState(); if (st.installed) putState(markNotInstalled(st)); applyInstalled(); notify(); }, ps);
  on(window, 'appinstalled', () => { deferred = null; justInstalled = true; putState(markInstalled(getState(), Date.now())); metrics.install('installed'); applyInstalled(); notify(); }, ps);
  try { on(matchMedia('(display-mode: standalone)'), 'change', () => { applyInstalled(); notify(); }, ps); } catch (e) {}
  /* Inside the Installed app, a link that leaves the app's scope (the landing and grown-up pages, other sites) opens
     in the browser, not inside the app: it gets a new browsing context, which the OS gives to the browser */
  on(document, 'click', e => {
    if (!installed() || e.defaultPrevented) return;
    const a = e.target.closest && e.target.closest('a[href]'); if (!a || a.target) return;
    let u; try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (!/^https?:$/.test(u.protocol) || (u.origin === location.origin && u.pathname.startsWith(SCOPE))) return;
    a.target = '_blank'; a.rel = 'noopener noreferrer';
  }, ps, { capture: true });
  const foot = document.getElementById('installLink');
  if (foot) on(foot, 'click', () => openGuide('footer'), ps);
  applyInstalled();
  if (installed()) metrics.install('opened');
}
/* The page as the Installed app: the brand goes to the game's Home (in the browser it goes to the landing page), and
   the footer's Install the app is hidden */
function applyInstalled() {
  const inApp = installed();
  document.documentElement.classList.toggle('lv-installed', inApp);
  const brand = document.querySelector('.md-header .md-brand');
  if (brand) { if (!brand.dataset.web) brand.dataset.web = brand.getAttribute('href'); brand.setAttribute('href', inApp ? '#/' : brand.dataset.web); }
  const foot = document.getElementById('installWrap'); if (foot) foot.hidden = appHere();
}

/* ---------- The browser's install prompt ---------- */
/* Shows the browser's own install dialog. Returns 'accepted', 'dismissed' or null when there was no prompt. The
   prompt can be used once; the browser may hand over a new one later. */
export async function promptInstall() {
  const e = deferred; if (!e) return null;
  deferred = null; notify();
  try {
    await e.prompt();
    const choice = await e.userChoice;
    const outcome = choice && choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
    if (outcome === 'accepted') metrics.install('prompt_accepted'); else metrics.install('prompt_dismissed');
    return outcome;
  } catch (err) { return 'dismissed'; }
}

/* ---------- Words and pictures ---------- */
const P = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  share: `<rect x="5" y="9" width="14" height="12" rx="2" ${P}/><path d="M12 3v11M8 7l4-4 4 4" ${P}/>`,
  add: `<rect x="4" y="4" width="16" height="16" rx="3" ${P}/><path d="M12 8v8M8 12h8" ${P}/>`,
  dots: `<circle cx="12" cy="5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/>`,
  lines: `<path d="M4 7h16M4 12h16M4 17h16" ${P}/>`,
  install: `<rect x="3" y="4" width="18" height="12" rx="2" ${P}/><path d="M12 7v6M9 10.5l3 3 3-3M8 20h8" ${P}/>`,
  dock: `<rect x="3" y="4" width="18" height="16" rx="2" ${P}/><path d="M3 8h18M7 17h2M11 17h2M15 17h2" ${P}/>`,
  open: `<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" ${P}/>`,
  link: `<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" ${P}/>`,
  check: `<circle cx="12" cy="12" r="9" ${P}/><path d="M8 12.5l3 3 5-6" ${P}/>`,
  info: `<circle cx="12" cy="12" r="9" ${P}/><path d="M12 11v6M12 7.5v.01" ${P}/>`,
  bookmark: `<path d="M6 3h12v18l-6-4-6 4z" ${P}/>`,
  offline: `<path d="M7 18h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18zM4 4l16 16" ${P}/>`,
  full: `<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" ${P}/>`,
  home: `<rect x="4" y="4" width="6" height="6" rx="1.5" ${P}/><rect x="14" y="4" width="6" height="6" rx="1.5" ${P}/><rect x="4" y="14" width="6" height="6" rx="1.5" ${P}/><rect x="14" y="14" width="6" height="6" rx="1.5" ${P}/>`
};
const icon = n => `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

export const KIND_NAMES = {
  'ios-safari': 'iPhone or iPad (Safari)', 'ios-browser': 'iPhone or iPad (Chrome, Edge or Firefox)', 'in-app': 'Inside another app',
  'android-chrome': 'Android (Chrome)', 'android-samsung': 'Android (Samsung Internet)', 'android-firefox': 'Android (Firefox)', 'android-other': 'Android (another browser)',
  'desktop-chrome': 'Computer or Chromebook (Chrome)', 'desktop-edge': 'Computer (Edge)', 'mac-safari': 'Mac (Safari)', 'desktop-firefox': 'Computer (Firefox)', other: 'Another browser'
};
const OWN_STORAGE = 'The home screen app keeps its own progress, apart from Safari. To bring yours along, copy a backup code on the Me page first, then restore it in the app.';
/* Steps per kind: [picture, words] (words may hold <b> for the names on screen). note: a line under the steps. */
export const STEPS = {
  'ios-safari': { steps: [['share', 'Tap <b>Share</b>, the square with an arrow: at the bottom of the screen on iPhone, at the top on iPad. If you only see <b>&middot;&middot;&middot;</b>, tap it first.'], ['add', 'Scroll down and tap <b>Add to Home Screen</b>.'], ['check', 'Tap <b>Add</b>. Vedic Math is on your home screen.']], note: OWN_STORAGE },
  'ios-browser': { steps: [['share', 'Tap <b>Share</b>: in Chrome it is at the right of the address bar; in Edge and Firefox, open the menu first.'], ['add', 'Tap <b>Add to Home Screen</b>.'], ['check', 'Tap <b>Add</b>.']], note: 'This needs iOS 16.4 or later; if you do not see Add to Home Screen, open this page in Safari. ' + OWN_STORAGE },
  'in-app': { steps: [['open', 'This page is open inside another app (like Instagram, Facebook or Gmail), which cannot install it. Open its menu (<b>&middot;&middot;&middot;</b> or a compass) and choose <b>Open in browser</b> or <b>Open in Safari</b>.'], ['link', 'No such option? Copy the link and paste it into Safari or Chrome.'], ['check', 'There, open this guide again: <b>Install the app</b>, at the foot of the page.']], copy: true },
  'android-chrome': { steps: [['dots', 'Tap the menu, <b>&#8942;</b>, at the top right.'], ['add', 'Tap <b>Add to Home screen</b> or <b>Install app</b>.'], ['check', 'Tap <b>Install</b>. Vedic Math is on your home screen and in your apps.']] },
  'android-samsung': { steps: [['install', 'Tap the install icon in the address bar if you see one. If not, open the menu, <b>&#9776;</b>, at the bottom right.'], ['add', 'Tap <b>Add page to</b>, then <b>Home screen</b>.'], ['check', 'Tap <b>Add</b>.']] },
  'android-firefox': { steps: [['dots', 'Tap the menu, <b>&#8942;</b>.'], ['add', 'Tap <b>Add app to Home screen</b> (on some versions, <b>Install</b>).'], ['check', 'Tap <b>Add</b>.']] },
  'android-other': { steps: [['dots', 'Open your browser\'s menu.'], ['add', 'Look for <b>Install app</b> or <b>Add to Home screen</b> and tap it.'], ['info', 'Not there? Open this page in Chrome and follow its steps.']] },
  'desktop-chrome': { steps: [['install', 'Click the install icon at the right end of the address bar: a screen with a down arrow.'], ['check', 'Click <b>Install</b>. The app opens in its own window and is in your apps list.'], ['dots', 'No icon? Open the menu, <b>&#8942;</b>, then <b>Cast, save and share</b>, then <b>Install page as app</b>.']] },
  'desktop-edge': { steps: [['install', 'Click <b>App available</b> in the address bar. Or open the menu, <b>&middot;&middot;&middot;</b>, then <b>Apps</b>, then <b>Install this site as an app</b>.'], ['check', 'Click <b>Install</b>. The app opens in its own window.']] },
  'mac-safari': { steps: [['dock', 'In the menu bar, choose <b>File</b>, then <b>Add to Dock</b>. This needs macOS Sonoma or later.'], ['check', 'Click <b>Add</b>. Vedic Math is in your Dock and Launchpad.']], note: 'The Dock app keeps its own progress, apart from Safari. To bring yours along, copy a backup code on the Me page first, then restore it in the app.' },
  'desktop-firefox': { steps: [['info', 'Firefox on a computer cannot install web apps. We would rather say so than send you hunting.'], ['open', 'To install, open this page in Chrome, Edge or Safari and follow their steps.'], ['bookmark', 'Or keep it one click away: press <b>Ctrl+D</b> (<b>&#8984;D</b> on a Mac) to bookmark it. It still works offline in Firefox after one visit.']] },
  other: { steps: [['dots', 'Open your browser\'s menu.'], ['add', 'Look for <b>Install</b>, <b>Install app</b> or <b>Add to Home Screen</b>.'], ['bookmark', 'If there is none, a bookmark works too, and the app still works offline after one visit.']] }
};

/* What the guide and the nudge say, in each Mode's words. Explorer (about 4 to 7) is spoken to through a grown-up:
   installing is a grown-up's job on most devices. */
const W = {
  title: () => fx.t({ explorer: 'For a grown-up: add the app', challenger: 'Get the app', pro: 'Install Learn Vedic Math' }),
  lead: () => fx.t({ explorer: 'Ask a grown-up to do these steps. Then Vedic Math is one tap away.', challenger: 'Put Vedic Math on your home screen, like any other app. It is free and needs no account.', pro: 'Install it like an app: free, no account, nothing to get from an app store.' }),
  why: () => [
    ['offline', fx.t({ explorer: 'It works with no internet.', challenger: 'Play with no internet, after one visit online.', pro: 'Works offline: Practice, Stars, games and Device boards.' })],
    ['full', fx.t({ explorer: 'It fills the whole screen.', challenger: 'Full screen, with no browser bars.', pro: 'Opens in its own window, with no browser bars.' })],
    ['home', fx.t({ explorer: 'It gets its own picture to tap.', challenger: 'Its own icon, one tap away.', pro: 'Its own icon on your home screen, dock or app list.' })]
  ],
  nudgeTitle: () => fx.t({ explorer: 'Grown-ups: add Vedic Math to this device', challenger: 'Put Vedic Math on your home screen', pro: 'Install Learn Vedic Math' }),
  nudgeBody: () => fx.t({ explorer: 'One tap to open, full screen, and it works with no internet.', challenger: 'Open it in one tap and keep playing with no internet.', pro: 'Its own icon, full screen, and it works offline. Free, no account.' })
};

/* ---------- The Install guide ---------- */
let dlg = null, life = null, shown = null;
function stepsHTML(k, withPrompt) {
  const s = STEPS[k] || STEPS.other, n = s.steps.length;
  const head = withPrompt ? 'Or use the browser\'s menu' : `How to install: ${esc(KIND_NAMES[k])}`;
  return `<h3 class="in-h" id="inStepsH">${head}</h3>
    <ol class="in-steps" aria-labelledby="inStepsH">${s.steps.map(([ic, text], i) => `<li><span class="in-n" aria-hidden="true">${i + 1}</span><span class="in-ic">${icon(ic)}</span><span class="in-t"><span class="md-sr-only">Step ${i + 1} of ${n}: </span>${text}</span></li>`).join('')}</ol>
    ${s.copy ? '<p class="in-copy"><button type="button" class="md-btn md-btn--sm" data-in="copy">Copy the link</button></p>' : ''}
    ${s.note ? `<p class="mq-small in-note">${s.note}</p>` : ''}`;
}
function guideHTML(k) {
  const x = `<button type="button" class="vp-x" data-close aria-label="Close"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" ${P}/></svg></button>`;
  if (appHere()) return `<div class="vs-head"><h2 id="inTitle">${W.title()}</h2>${x}</div><p id="inSub" class="vs-sub">${installed() ? 'You are already using the installed app.' : 'Installed on this device: open Learn Vedic Math from your home screen or app list.'}</p><p class="vs-foot"><button type="button" class="md-btn md-btn--sm md-btn--primary" data-close>Close</button></p>`;
  const done = justInstalled;
  const one = canPrompt() ? `<div class="in-one"><button type="button" class="md-btn md-btn--primary" data-in="prompt">${icon('install')} Install now</button><p class="mq-small">One tap: your browser asks you to confirm.</p></div>` : '';
  return `<div class="vs-head"><h2 id="inTitle">${W.title()}</h2>${x}</div>
    <p id="inSub" class="vs-sub">${done ? 'Installed on this device: open Learn Vedic Math from your home screen or app list.' : W.lead()}</p>
    <ul class="in-why" aria-label="Why install">${W.why().map(([ic, t]) => `<li><span class="in-ic">${icon(ic)}</span><span>${t}</span></li>`).join('')}</ul>
    ${one}<div class="in-how" data-kind="${k}">${stepsHTML(k, !!one)}</div>
    <details class="in-other"><summary>Another device or browser?</summary><div class="in-pick" role="group" aria-label="Show the steps for">${KINDS.map(id => `<button type="button" class="md-chip" data-kind="${id}" aria-pressed="${id === k}">${esc(KIND_NAMES[id])}</button>`).join('')}</div></details>
    <p class="in-status" id="inStatus" role="status" aria-live="polite"></p>
    <p class="vs-foot"><button type="button" class="md-btn md-btn--sm" data-close>Close</button></p>`;
}
/* openGuide(from): the Install guide, for this browser's kind. from: the entry point (home, me, footer, guide) */
export function openGuide(from) {
  if (!dlg) {
    dlg = document.createElement('dialog'); dlg.className = 'vm-sheet in-guide'; dlg.id = 'installGuide';
    dlg.setAttribute('aria-labelledby', 'inTitle'); dlg.setAttribute('aria-describedby', 'inSub');
    document.body.append(dlg);
    on(dlg, 'click', e => { if (e.target === dlg) dlg.close(); }, page.signal); /* a tap on the backdrop */
    on(dlg, 'close', () => { if (life) { life.abort(); life = null; } const o = dlg._opener; if (o && document.body.contains(o)) o.focus({ preventScroll: true }); }, page.signal);
  }
  if (dlg.open) return;
  dlg._opener = document.activeElement;
  life = child(page.signal); const signal = life.signal;
  shown = kind();
  const draw = () => {
    dlg.innerHTML = guideHTML(shown);
  };
  draw();
  const status = t => { const s = dlg.querySelector('#inStatus'); if (s) s.textContent = t; };
  on(dlg, 'click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-close')) { dlg.close(); return; }
    if (b.dataset.kind) { /* another device: only the steps change, and focus stays on the picked button */
      shown = b.dataset.kind;
      dlg.querySelectorAll('.in-pick [data-kind]').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.kind === shown)));
      const how = dlg.querySelector('.in-how'); how.dataset.kind = shown; how.innerHTML = stepsHTML(shown, !!dlg.querySelector('[data-in="prompt"]'));
      status(`Showing the steps for ${KIND_NAMES[shown]}.`);
      return;
    }
    if (b.dataset.in === 'copy') {
      const url = location.origin + SCOPE;
      try { await navigator.clipboard.writeText(url); status('Link copied. Paste it into Safari or Chrome.'); } catch (err) { status(`Copy this link: ${url}`); }
      return;
    }
    if (b.dataset.in === 'prompt') {
      const outcome = await promptInstall();
      const one = dlg.querySelector('.in-one'); if (one) one.remove();
      const h = dlg.querySelector('#inStepsH'); if (h) h.textContent = `How to install: ${KIND_NAMES[shown]}`;
      status(outcome === 'accepted' ? 'Installing. Learn Vedic Math will be on your home screen or app list in a moment.' : 'Not installed. You can install any time from here, the Me page or the foot of any page.');
      const close = dlg.querySelector('.vs-foot [data-close]'); if (close) close.focus();
    }
  }, signal);
  onInstallChange(() => { if (justInstalled) status('Installed. Open Learn Vedic Math from your home screen or app list.'); }, signal);
  dlg.showModal();
  /* Focus the one-tap button, else the steps (a screen reader reads them next), else Close */
  const steps = dlg.querySelector('.in-steps'); if (steps) steps.setAttribute('tabindex', '-1');
  (dlg.querySelector('[data-in="prompt"]') || steps || dlg.querySelector('[data-close]')).focus();
  metrics.install('wizard_open', from);
}
export const guideOpen = () => !!(dlg && dlg.open);

/* ---------- The Install nudge on Home ---------- */
let nudgeCounted = false;
/* mountNudge(slot, signal): Home's one place for the nudge. It shows when nudgeDue says so and the Prompt slot is
   free; when the prompt arrives later, or a toast or dialog goes away, it is looked at again (every 2 s for a minute) */
export function mountNudge(slot, signal) {
  if (!slot || !signal) return;
  const ctl = child(signal);
  const due = () => nudgeDue({ kind: kind(), canPrompt: canPrompt(), installed: appHere(), engaged: store.playedBefore(), busy: !free(), state: getState(), now: Date.now() });
  const hide = (focusHome = false) => {
    if (!slot.firstChild) return;
    const inside = slot.contains(document.activeElement);
    slot.replaceChildren(); release('install');
    if (focusHome || inside) { const h = document.querySelector('#view h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
  };
  const draw = () => {
    if (slot.firstChild || ctl.signal.aborted) return;
    if (!due() || !claim('install', ctl.signal)) return;
    const k = kind(), oneTap = canPrompt();
    slot.innerHTML = `<aside class="in-nudge md-card" aria-labelledby="inNudgeT" aria-describedby="inNudgeB">
      <img class="in-nudge-ic" src="/icons/icon-192.png" alt="" width="48" height="48">
      <div class="in-nudge-x"><p class="in-nudge-t" id="inNudgeT">${W.nudgeTitle()}</p><p class="in-nudge-b" id="inNudgeB">${W.nudgeBody()}</p>
      <p class="in-nudge-acts"><button type="button" class="md-btn md-btn--sm md-btn--primary" data-in="go">${oneTap ? 'Install' : 'Show me how'}</button> <button type="button" class="md-btn md-btn--sm" data-in="later">Not now</button></p></div></aside>`;
    slot.dataset.kind = k;
    if (!nudgeCounted) { nudgeCounted = true; metrics.install('nudge_shown'); }
  };
  on(slot, 'click', async e => {
    const b = e.target.closest('[data-in]'); if (!b) return;
    if (b.dataset.in === 'later') { putState(pressLater(getState(), Date.now())); metrics.install('nudge_later'); hide(true); return; }
    if (b.dataset.in === 'go') {
      if (canPrompt()) { const outcome = await promptInstall(); if (outcome === 'accepted') hide(true); else { const g = slot.querySelector('[data-in="go"]'); if (g) g.textContent = 'Show me how'; } return; }
      openGuide('home');
    }
  }, ctl.signal);
  onInstallChange(() => { if (appHere()) hide(); else draw(); }, ctl.signal);
  draw();
  /* A toast, a dialog or the tour may hold the screen when Home draws: look again every 2 s for a minute, then stop */
  const poll = child(ctl.signal); let tries = 0;
  every(() => { if (slot.firstChild || ++tries > 30) { poll.abort(); return; } draw(); }, 2000, poll.signal);
}

/* ---------- The Me page ---------- */
/* The Me page's install card (Settings). Nothing in the Installed app. */
export function meCardHTML() {
  if (appHere()) return '';
  const k = kind();
  const line = k === 'desktop-firefox' ? 'Firefox on a computer cannot install web apps; the guide says what to do instead.'
    : fx.t({ explorer: 'A grown-up can put Vedic Math on the home screen, so it opens in one tap and works with no internet.', challenger: 'Put Vedic Math on your home screen: one tap to open, full screen, and it works with no internet.', pro: 'Install Learn Vedic Math as an app: its own icon and window, and it works offline.' });
  return `<div class="md-card in-me"><p class="in-me-t"><b>Install the app</b></p><p class="mq-small" id="meInstallNote">${line}</p><p><button type="button" class="md-btn md-btn--sm" id="meInstall" aria-describedby="meInstallNote">${icon('install')} How to install</button></p></div>`;
}
