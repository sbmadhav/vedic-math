/* What every page has that the Trick page modules call (trick-pages design D4): the analytics call of js/analytics.js. */

interface Window {
  /** js/analytics.js: an anonymous event in fixed words; safe to call before the script has loaded */
  siteTrack?: (path: string, title?: string) => void;
}
