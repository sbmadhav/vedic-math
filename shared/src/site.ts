/* Where the game lives (openspec change arena-challenge-link). Every share link is built from these two, so the move
   to /learn/ (openspec change indexable-routes, design D2) changed APP_BASE here and nowhere else; js/paths.js BASE must agree. A challenge
   link (challenge.ts) names SITE whatever host built it, since a preview or localhost link is no use to a friend; the
   play experiences' shareUrl (js/play/kit.js) keeps the origin it runs on. */
export const SITE = 'https://learnvedicmath.com';
export const APP_BASE = '/learn/';
