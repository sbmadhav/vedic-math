/* The Lost Śulba Scroll: illustrations. Each scene is an inline SVG drawn with classes that scroll.css
   colors from design tokens, so it follows Daybreak and Deep Space. No DOM use at import time. */

const stars = (n, seed, w = 400, h = 90) => {
  let a = seed; const r = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
  return Array.from({ length: n }, (_, i) => `<circle class="sc-star" style="--d:${(r() * 3).toFixed(2)}s" cx="${(r() * w).toFixed(1)}" cy="${(r() * h).toFixed(1)}" r="${(0.6 + r() * 1.4).toFixed(1)}"/>`).join('');
};
const knots = (x1, y1, x2, y2, n) => Array.from({ length: n + 1 }, (_, i) => `<circle class="sc-knot" cx="${(x1 + ((x2 - x1) * i) / n).toFixed(1)}" cy="${(y1 + ((y2 - y1) * i) / n).toFixed(1)}" r="2.2"/>`).join('');

export const SCENES = {
  library: `
    <rect class="sc-wall" width="400" height="180"/>
    <path class="sc-window" d="M160 150V70a40 40 0 0 1 80 0v80z"/>
    <circle class="sc-sun sc-glow" cx="200" cy="112" r="20"/>
    <path class="sc-hill" d="M160 150c20-18 50-24 80-10v10z"/>
    <path class="sc-frame" d="M160 150V70a40 40 0 0 1 80 0v80M200 30v120M160 100h80"/>
    <g class="sc-shelf">${[0, 1, 2].map(k => `<rect x="18" y="${40 + k * 40}" width="118" height="6" rx="2"/><rect x="264" y="${40 + k * 40}" width="118" height="6" rx="2"/>`).join('')}</g>
    ${[0, 1, 2].map(k => Array.from({ length: 6 }, (_, i) => `<rect class="sc-book sc-book--${(i + k) % 3}" x="${22 + i * 19}" y="${14 + k * 40}" width="14" height="26" rx="3"/><rect class="sc-book sc-book--${(i + k + 1) % 3}" x="${268 + i * 19}" y="${14 + k * 40}" width="14" height="26" rx="3"/>`).join('')).join('')}
    <rect class="sc-floor" y="150" width="400" height="30"/>
    <g class="sc-parrot">
      <path class="sc-perch" d="M300 150v-38M286 112h28"/>
      <ellipse class="sc-bird" cx="300" cy="96" rx="11" ry="15"/>
      <path class="sc-bird-wing" d="M296 92q12 4 10 22q-10-6-10-22z"/>
      <circle class="sc-bird" cx="300" cy="78" r="8"/>
      <path class="sc-beak" d="M306 76l7 3-7 3z"/>
      <circle class="sc-eye" cx="302" cy="76" r="1.6"/>
      <path class="sc-bird-tail" d="M297 110l-4 18 8-16z"/>
    </g>
    <g class="sc-case"><rect x="96" y="132" width="70" height="18" rx="9"/><circle cx="96" cy="141" r="9"/><circle cx="166" cy="141" r="9"/></g>`,
  river: `
    <rect class="sc-sky" width="400" height="180"/>
    <circle class="sc-sun sc-glow" cx="330" cy="46" r="22"/>
    <path class="sc-hill sc-hill--far" d="M0 92c60-30 110-34 170-12s120 10 230-14v34H0z"/>
    <path class="sc-river" d="M0 104c90 10 150-6 230 0s120 10 170 2v22c-60 8-120-2-190 4S60 140 0 128z"/>
    <path class="sc-shimmer" d="M30 116h40M120 112h30M250 118h50M330 114h26"/>
    <rect class="sc-sand" y="128" width="400" height="52"/>
    <path class="sc-rope" d="M140 166L232 166L140 134Z"/>
    ${knots(140, 166, 232, 166, 4)}${knots(232, 166, 140, 134, 5)}${knots(140, 134, 140, 166, 3)}
    <g class="sc-peg"><rect x="136" y="160" width="8" height="14" rx="2"/><rect x="228" y="160" width="8" height="14" rx="2"/><rect x="136" y="128" width="8" height="14" rx="2"/></g>
    <path class="sc-corner" d="M140 158h8v8"/>
    <path class="sc-reed" d="M30 140q4-30 0-44M40 140q-2-26 6-40M366 140q-4-28 4-40M376 140q2-24-2-36"/>`,
  mountain: `
    <rect class="sc-sky" width="400" height="180"/>
    <circle class="sc-sun" cx="70" cy="40" r="16"/>
    <path class="sc-hill sc-hill--far" d="M0 120L90 60L170 110L260 50L400 120V180H0z"/>
    <path class="sc-hill" d="M0 150c80-30 160-36 240-20s110 4 160-6v56H0z"/>
    ${(() => { let o = ''; const T = [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1]]; T.forEach((row, r) => row.forEach((v, k) => { const x = 200 + (k - r / 2) * 30, y = 30 + r * 26; const miss = r === 4 && k === 2; o += `<g class="sc-stone${miss ? ' is-miss' : ''}"><rect x="${x - 13}" y="${y - 11}" width="26" height="22" rx="5"/><text x="${x}" y="${y + 5}">${miss ? '?' : v}</text></g>`; })); return o; })()}
    <path class="sc-path" d="M200 160c-20-10 30-14 0-24"/>`,
  chest: `
    <rect class="sc-wall" width="400" height="180"/>
    <rect class="sc-floor" y="146" width="400" height="34"/>
    <g class="sc-lamp"><path class="sc-lamp-body" d="M60 140h40l-6-12H66z"/><path class="sc-flame sc-glow" d="M80 126c-8-8-2-18 0-24c2 6 8 16 0 24z"/></g>
    <circle class="sc-halo" cx="80" cy="112" r="40"/>
    <g class="sc-chest"><rect x="140" y="78" width="160" height="72" rx="8"/><path d="M140 96h160"/><rect class="sc-chest-lid" x="134" y="62" width="172" height="26" rx="12"/>
      ${['G', 'L', 'G', 'L'].map((s, i) => `<rect class="sc-dial" x="${172 + i * 26}" y="104" width="20" height="26" rx="5"/>${s === 'G' ? `<path class="sc-dial-mark" d="M${176 + i * 26} 117h12"/>` : `<circle class="sc-dial-mark-dot" cx="${182 + i * 26}" cy="117" r="2.6"/>`}`).join('')}
    </g>
    <g class="sc-leaf"><rect x="318" y="118" width="62" height="10" rx="5"/><rect x="322" y="130" width="58" height="10" rx="5"/></g>`,
  night: `
    <rect class="sc-night" width="400" height="180"/>
    ${stars(46, 7)}
    <path class="sc-moon" d="M330 26a20 20 0 1 0 18 30a16 16 0 1 1-18-30z"/>
    <path class="sc-constellation" d="M60 30L92 46L120 36L150 58M92 46L100 74"/>
    ${[[60, 30], [92, 46], [120, 36], [150, 58], [100, 74]].map(([x, y]) => `<circle class="sc-cstar" cx="${x}" cy="${y}" r="2.6"/>`).join('')}
    <path class="sc-roof" d="M0 140L60 124H340L400 140V180H0z"/>
    <g class="sc-dome"><path d="M220 124a40 30 0 0 1 80 0z"/><path class="sc-scope" d="M262 106l44-30"/></g>
    <g class="sc-box"><rect x="110" y="104" width="48" height="24" rx="5"/><path class="sc-box-star" d="M134 110l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1z"/></g>`,
  scroll: `
    <rect class="sc-wall" width="400" height="180"/>
    <circle class="sc-sun sc-glow" cx="200" cy="40" r="60" opacity=".35"/>
    <rect class="sc-floor" y="150" width="400" height="30"/>
    <g class="sc-parch-whole">
      <rect class="sc-rod" x="48" y="58" width="10" height="84" rx="5"/><rect class="sc-rod" x="342" y="58" width="10" height="84" rx="5"/>
      <rect class="sc-parch" x="56" y="64" width="288" height="72"/>
      ${[1, 2, 3, 4, 5].map(i => `<path class="sc-tear" d="M${56 + i * 48} 64l-4 12 5 10-5 12 4 12-3 12 3 14"/>`).join('')}
      <path class="sc-draw" d="M80 120L116 120L80 92Z"/><circle class="sc-draw" cx="200" cy="100" r="20"/><rect class="sc-draw" x="186" y="86" width="28" height="28"/><path class="sc-draw" d="M280 120h40M290 108h20M296 96h8"/>
    </g>`
};
export const SCENE_LABEL = {
  library: 'The old library at dawn: tall shelves of palm-leaf books, an arched window with the rising sun, and Kili the parrot on a perch.',
  river: 'A riverbank at sunrise: a rope triangle staked out on the sand with three pegs and a square corner.',
  mountain: 'A hill with a staircase of numbered stones stacked like a mountain, one stone marked with a question mark.',
  chest: 'A wooden chest by lamplight, its lock a row of dials showing short and long marks.',
  night: 'A rooftop observatory at night under stars and a crescent moon, a small star box on the parapet.',
  scroll: 'An unrolled scroll on a table, its torn pieces joined, showing rope triangles, a circle and a square.'
};

/* The scroll on the chapter map: six torn pieces, filled when found */
export function scrollPieces(found, glyphs) {
  const W = 92, x0 = 26;
  const pieces = Array.from({ length: 6 }, (_, i) => {
    const l = x0 + i * W, r = l + W, n = i + 1, has = found.includes(n);
    return `<g class="sc-piece${has ? ' is-found' : ''}" style="--i:${i}"><path d="${pathFor(l, r, i)}"/>${has ? `<g class="sc-pglyph" transform="translate(${l + W / 2} 52)">${glyphs[i]}</g>` : `<text class="sc-pnum" x="${l + W / 2}" y="60">${n}</text>`}</g>`;
  });
  return `<svg class="sc-psvg" viewBox="0 0 600 104" role="img" aria-label="The scroll: ${found.length} of 6 pieces found">
    <rect class="sc-prod" x="14" y="0" width="12" height="104" rx="6"/><rect class="sc-prod" x="574" y="0" width="12" height="104" rx="6"/>${pieces.join('')}</svg>`;
}
/* A torn piece between x = l and x = r: straight top and bottom, jagged shared edges */
function pathFor(l, r, i) {
  const jag = (x, k) => [6, 22, 38, 54, 70, 86, 98].map((y, j) => [x + (j === 0 || j === 6 ? 0 : ((k * 7 + j * 5) % 9) - 4), y]);
  const R = i === 5 ? [[r, 6], [r, 98]] : jag(r, i + 1), Lft = i === 0 ? [[l, 6], [l, 98]] : jag(l, i);
  return 'M' + [...R, ...Lft.slice().reverse()].map(p => p.join(' ')).join(' L') + ' Z';
}
export const GLYPHS = [
  '<circle r="9" cy="-6" class="sc-pg"/><path class="sc-pg" d="M6 -8l8 3-8 3z"/><ellipse class="sc-pg" cy="10" rx="8" ry="12"/>',
  '<path class="sc-pg sc-pg--line" d="M-18 14H18L-18 -14Z"/><path class="sc-pg--line" d="M-18 6h8v8"/>',
  '<g class="sc-pg">' + [[0, -16], [-7, -4], [7, -4], [-14, 8], [0, 8], [14, 8]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5"/>`).join('') + '</g>',
  '<g class="sc-pg">' + [-18, -6, 6, 18].map((x, i) => (i % 2 ? `<circle cx="${x}" cy="0" r="3.5"/>` : `<rect x="${x - 5}" y="-2.5" width="10" height="5" rx="2"/>`)).join('') + '</g>',
  '<path class="sc-pg" d="M0 -18l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z"/>',
  '<g class="sc-pg--line"><circle r="14"/><rect x="-10" y="-10" width="20" height="20"/></g>'
];
