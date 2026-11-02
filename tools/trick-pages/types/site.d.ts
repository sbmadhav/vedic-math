/* What the site's pages put on window for their scripts: window.siteTrack from /js/analytics.js (a deferred classic
   script, so it may arrive after a module has run). Events carry fixed words and no personal data (AGENTS.md). */

declare global {
  interface Window {
    siteTrack?: (path: string, title?: string) => void;
  }
}

export {};
