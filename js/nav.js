/* The game's menu by Mode (openspec change play-nav-by-mode). Pure: no DOM, no storage, so the unit tests read it.
   Challenger and Pro: four zones and Find. Explorer: three big picture tabs that say their name when Read aloud is on.
   Every route stays where it was (a zone is only how a page is reached), and data-match marks a zone current on every
   route inside it. learn/index.html holds navHTML('big') as the first paint; js/app.js swaps in the Mode's set. */

const ICON = {
  /* Explorer's three pictures (24px line icons, currentColor) */
  play: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  learn: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  me: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/><path d="M8.5 14.5c2 2 5 2 7 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  find: '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
};

/* Which routes each zone holds. A Trick page (#/skill/v-...) is the Dojo's, so it belongs to the Arcade. */
const M = {
  home: '^#?/?$|^#/(tiles|places|try)$',
  learn: '^#/(learn|grade|mix|run|sutras)(/|$)|^#/skill/(?!v-)',
  arcade: '^#/(arcade|dojo|tricks|katas|kata|star|arena|duel|tower|challenge|games?)(/|$)|^#/skill/v-',
  watch: '^#/watch$',
  find: '^#/(find|guide)(/|$)',
  /* Explorer: Play holds Home and everything its picture tiles open; Learn the skills and the Sutras; Me the Me page */
  xplay: '^#?/?$|^#/(tiles|places|try|arcade|dojo|tricks|katas|kata|star|arena|duel|tower|challenge|games?|watch)(/|$)|^#/skill/v-',
  xme: '^#/(me|progress)$'
};

/* say: the words read aloud when an Explorer taps the tab (with Read aloud on). Studio voice lines for the owner's
   re-record (test/voice-coverage.test.mjs, its nav todo). */
export const TABS = {
  big: [
    { id: 'home', href: '#/', label: 'Home', match: M.home },
    { id: 'learn', href: '#/learn', label: 'Learn', match: M.learn },
    { id: 'arcade', href: '#/arcade', label: 'Arcade', match: M.arcade },
    { id: 'watch', href: '#/watch', label: 'Watch', match: M.watch },
    { id: 'find', href: '#/find', label: 'Find', match: M.find, find: true }
  ],
  explorer: [
    { id: 'play', href: '#/', label: 'Play', match: M.xplay, icon: 'play', say: 'Play' },
    { id: 'learn', href: '#/learn', label: 'Learn', match: M.learn, icon: 'learn', say: 'Learn' },
    { id: 'me', href: '#/me', label: 'Me', match: M.xme, icon: 'me', say: 'Me' }
  ]
};
export const setOf = mode => (mode === 'explorer' ? 'explorer' : 'big');
export const tabsFor = mode => TABS[setOf(mode)];
/* Every line an Explorer tab can say (the studio voice's list) */
export const NAV_LINES = TABS.explorer.map(t => t.say);

/* The tab current on a route: the first whose match it is, or null */
export const currentTab = (mode, hash) => tabsFor(mode).find(t => new RegExp(t.match).test(hash || '#/')) || null;

const svg = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
/* The Find trigger: the magnifying glass, Find, and the shortcut (Ctrl K, or ⌘ K on a Mac, set by js/app.js) */
const findHTML = t => `<a href="${t.href}" class="nav-find" data-match="${t.match}" aria-keyshortcuts="Control+K Meta+K">${svg('find')}<span>${t.label}</span><kbd class="nav-kbd" aria-hidden="true">Ctrl K</kbd></a>`;
const tabHTML = t => (t.find ? findHTML(t)
  : t.icon ? `<a href="${t.href}" class="nav-x" data-match="${t.match}" data-say="${t.say}">${svg(t.icon)}<span>${t.label}</span></a>`
  : `<a href="${t.href}" data-match="${t.match}">${t.label}</a>`);
/* The nav's links for a set ('big' or 'explorer') */
export const navHTML = set => TABS[set].map(tabHTML).join('');
