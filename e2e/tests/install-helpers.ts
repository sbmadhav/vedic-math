import type { Page } from '@playwright/test';

/* Helpers for the install specs (openspec change install-app): a browser's install prompt as a synthetic
   beforeinstallprompt event, the Installed app as an init script (no Playwright option emulates display-mode),
   user agents for the platforms the Install guide knows, and a returning Player who played on an earlier day. */

export const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.119 Mobile/15E148 Safari/604.1',
  ipadDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.28.85 (iPhone15,3; iOS 18_5; en_US; en; scale=3.00; 1290x2796; 123)',
  androidChrome: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:141.0) Gecko/141.0 Firefox/141.0',
  chromeDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  edgeDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  firefoxDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0',
};

/** Saved progress for a Player who played on an earlier day (the nudge's engagement rule) */
export const RETURNING = { days: { '2026-01-05': 3 }, sparks: 120 };

/** Hands the page an install prompt, as Chromium does when the app can be installed. prompt() counts its calls in
    window.__prompted; the Player's answer is outcome. */
export async function offerInstall(page: Page, outcome: 'accepted' | 'dismissed' = 'accepted') {
  await page.evaluate(o => {
    const w = window as unknown as { __prompted?: number };
    const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string; platform: string }> };
    e.prompt = () => { w.__prompted = (w.__prompted || 0) + 1; return Promise.resolve(); };
    e.userChoice = Promise.resolve({ outcome: o, platform: 'web' });
    window.dispatchEvent(e);
  }, outcome);
}

/** The page runs as the Installed app: (display-mode: standalone) matches. ios: navigator.standalone instead. */
export async function asInstalledApp(page: Page, { ios = false } = {}) {
  await page.addInitScript(isIos => {
    if (isIos) { Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true }); return; }
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q: string) => {
      if (!/display-mode:\s*standalone/.test(q)) return real(q);
      const fake = { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false };
      return fake as unknown as MediaQueryList;
    };
  }, ios);
}

/** The analytics stub of analytics.spec.ts: window.siteTrack records each path in window.__events */
export async function recordEvents(page: Page) {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.__events = window.__events || []; window.siteTrack = (path) => { window.__events.push(path); };' }));
}
export const events = (page: Page): Promise<string[]> => page.evaluate(() => ((globalThis as unknown as { __events?: string[] }).__events || []).filter(e => e.startsWith('math/install/')));

/** The device's install state (vm.install) */
export const installState = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('vm.install') || 'null'));
export async function seedInstallState(page: Page, state: Record<string, number>) {
  await page.addInitScript(s => { try { if (!sessionStorage.getItem('e2e-install-seeded')) { localStorage.setItem('vm.install', JSON.stringify(s)); sessionStorage.setItem('e2e-install-seeded', '1'); } } catch (e) { /* blocked */ } }, state);
}
