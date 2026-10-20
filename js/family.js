/* The Nikhilam Family (brand/nikhilam-family/): the mascot in the app home's hero, the same drawing as the landing
   page's (site/index.html; test/brand.test.mjs keeps the two identical). Tokens only, so it follows Daybreak and
   Deep Space. Its gentle idle motion and the cheer (fx.cheer) stop under reduced motion, Pause motion and Calm
   (math.css). Bolt stays the in-game teacher. */
export const FAMILY_SVG = `<svg class="lv-family" viewBox="-6 -14 108 86" role="img" aria-label="The Nikhilam Family: the Devanagari digits one, zero and nine">
        <circle class="lv-f-halo" cx="48" cy="32" r="38" fill="var(--sun)" opacity=".16"/>
        <ellipse class="lv-f-shadow" cx="22" cy="63" rx="9" ry="2.2" fill="var(--ink)" opacity=".1"/>
        <ellipse class="lv-f-shadow lv-f-shadow--zero" cx="46" cy="63" rx="10" ry="2.2" fill="var(--ink)" opacity=".1"/>
        <ellipse class="lv-f-shadow" cx="85" cy="63" rx="8" ry="2.2" fill="var(--ink)" opacity=".1"/>
        <g transform="rotate(-3 20 58)"><g class="lv-f-one">
          <path d="M6 21C5 11 13 6 18 6C24 6 28 11 27 17C26 23 20 27 13 27C20 33 26 44 27 56" fill="none" stroke="var(--sky)" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
          <ellipse cx="14.5" cy="16.5" rx="1.8" ry="2.2" fill="var(--ink)"/><ellipse cx="20.5" cy="16.5" rx="1.8" ry="2.2" fill="var(--ink)"/>
          <ellipse cx="12.8" cy="20.5" rx="1.6" ry="1" fill="var(--coral)" opacity=".5"/><ellipse cx="22.6" cy="20.5" rx="1.6" ry="1" fill="var(--coral)" opacity=".5"/>
        </g></g>
        <g class="lv-f-zero">
          <circle cx="46" cy="42" r="11" fill="var(--bolt-eye)" stroke="var(--sun)" stroke-width="7"/>
          <ellipse cx="42.5" cy="41" rx="1.8" ry="2.2" fill="var(--on-accent)"/><ellipse cx="49.5" cy="41" rx="1.8" ry="2.2" fill="var(--on-accent)"/>
          <path d="M43 45.5Q46 48.5 49 45.5" fill="none" stroke="var(--on-accent)" stroke-width="1.9" stroke-linecap="round"/>
          <ellipse cx="40.3" cy="45" rx="1.6" ry="1" fill="var(--coral)" opacity=".5"/><ellipse cx="51.7" cy="45" rx="1.6" ry="1" fill="var(--coral)" opacity=".5"/>
        </g>
        <g transform="rotate(4 84 58)"><g class="lv-f-nine">
          <path d="M66.8 31.2C72 42 85 44 88 58" fill="none" stroke="var(--coral)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="76" cy="22" r="13" fill="var(--sun)" stroke="var(--coral)" stroke-width="7"/>
          <ellipse cx="72" cy="21" rx="2" ry="2.5" fill="var(--on-accent)"/><ellipse cx="80" cy="21" rx="2" ry="2.5" fill="var(--on-accent)"/>
          <path d="M72.5 26Q76 29.5 79.5 26" fill="none" stroke="var(--on-accent)" stroke-width="2.1" stroke-linecap="round"/>
          <ellipse cx="69.6" cy="25.6" rx="1.9" ry="1.1" fill="var(--coral)" opacity=".55"/><ellipse cx="82.4" cy="25.6" rx="1.9" ry="1.1" fill="var(--coral)" opacity=".55"/>
        </g></g>
        <path class="lv-spark" d="M40 3Q40 7 44 7Q40 7 40 11Q40 7 36 7Q40 7 40 3Z" fill="var(--coral)" stroke="var(--coral)" stroke-width="1" stroke-linejoin="round"/>
        <path class="lv-spark lv-spark--b" d="M52 -7Q52 -4 55 -4Q52 -4 52 -1Q52 -4 49 -4Q52 -4 52 -7Z" fill="var(--sky)" stroke="var(--sky)" stroke-width="1" stroke-linejoin="round"/>
        <path class="lv-spark lv-spark--c" d="M96 -10Q96 -7 99 -7Q96 -7 96 -4Q96 -7 93 -7Q96 -7 96 -10Z" fill="var(--plum)" stroke="var(--plum)" stroke-width="1" stroke-linejoin="round"/>
        <path class="lv-spark lv-spark--d" d="M0 -9Q0 -6 3 -6Q0 -6 0 -3Q0 -6 -3 -6Q0 -6 0 -9Z" fill="var(--sun)" stroke="var(--sun)" stroke-width="1" stroke-linejoin="round"/>
      </svg>`;
