/* Card icons: simple line drawings in currentColor, one per experience */
const s = body => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const ICONS = {
  spells: s('<circle cx="14" cy="14" r="4"/><circle cx="34" cy="14" r="4"/><circle cx="14" cy="34" r="4"/><circle cx="34" cy="34" r="4"/><path d="M14 18v12M34 18v12M17 17l14 14M31 17L17 31"/>'),
  locks: s('<rect x="10" y="22" width="28" height="20" rx="4"/><path d="M16 22v-6a8 8 0 0 1 16 0v6"/><path d="M24 30v5"/>'),
  tala: s('<circle cx="24" cy="24" r="16"/><circle cx="24" cy="8" r="2.5" fill="currentColor"/><circle cx="37.9" cy="32" r="2.5" fill="currentColor"/><circle cx="10.1" cy="32" r="2.5" fill="currentColor"/><path d="M24 8L37.9 32 10.1 32Z" opacity=".5"/>'),
  art: s('<circle cx="24" cy="24" r="16"/><path d="M24 8L38 30M38 30L10 30M10 30L24 8M24 40L10 18M10 18L38 18M38 18L24 40" opacity=".7"/>'),
  daily: s('<rect x="8" y="10" width="32" height="30" rx="4"/><path d="M8 18h32M16 6v8M32 6v8M18 28h12M24 22v12"/>'),
  scroll: s('<path d="M12 10h22a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H14"/><path d="M12 10a4 4 0 0 0-4 4v2h8v-2a4 4 0 0 0-4-4zM14 42a4 4 0 0 1-4-4v-2h8v2"/><path d="M20 20h12M20 26h12M20 32h7"/>'),
  lens: s('<rect x="6" y="14" width="36" height="24" rx="5"/><circle cx="24" cy="26" r="7"/><path d="M17 14l3-5h8l3 5"/>'),
  apprentice: s('<circle cx="24" cy="16" r="7"/><path d="M12 40c0-7 5-12 12-12s12 5 12 12"/><path d="M33 9l6-3M35 15h6"/>'),
  party: s('<rect x="6" y="10" width="36" height="22" rx="3"/><path d="M18 38h12M24 32v6"/><circle cx="16" cy="21" r="2" fill="currentColor"/><circle cx="24" cy="21" r="2" fill="currentColor"/><circle cx="32" cy="21" r="2" fill="currentColor"/>'),
  bets: s('<circle cx="18" cy="28" r="10"/><circle cx="30" cy="20" r="10"/><path d="M30 16v8M26 20h8"/>'),
  ghosts: s('<path d="M12 40V22a12 12 0 0 1 24 0v18l-4-3-4 3-4-3-4 3-4-3z"/><circle cx="20" cy="22" r="2" fill="currentColor"/><circle cx="28" cy="22" r="2" fill="currentColor"/>'),
  wall: s('<rect x="8" y="8" width="32" height="32" rx="3"/><path d="M8 19h32M8 29h32M19 8v32M29 8v32"/><rect x="21" y="21" width="6" height="6" fill="currentColor"/><rect x="11" y="11" width="6" height="6" fill="currentColor" opacity=".5"/><rect x="31" y="31" width="6" height="6" fill="currentColor" opacity=".5"/>')
};
