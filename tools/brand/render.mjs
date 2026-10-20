// Renders the published icons in icons/ from the brand sources in brand/nikhilam-family/ (the Nikhilam Family:
// the Devanagari digits 1, 0 and 9 as a family). Run after changing a source SVG, and commit the outputs:
//
//   cd tools/brand && npm ci && node render.mjs
//
// Writes:
//   icons/favicon.svg                 copy of favicon.svg (the small cut: the baby Zero's face)
//   icons/favicon-16/32/48.png        favicon.svg; its eyes sit on the 16, 32 and 48 px pixel grids
//   icons/apple-touch-icon.png        180, the app mark full bleed (iOS rounds the corners itself)
//   icons/icon-192.png, icon-512.png  mark.svg, rounded tile on a transparent background
//   icons/maskable-512.png            the family inside the maskable safe zone (a circle of 40% radius)
//   icons/og.png                      1200 x 630 social image with the light lockup
import { Resvg } from '@resvg/resvg-js';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = name => readFileSync(path.join(root, 'brand/nikhilam-family', name), 'utf8');
const out = name => path.join(root, 'icons', name);

const TILE = '#151B2B';   // the mark's tile (Harbor ink)
const PAGE = '#F6F7F9';   // Daybreak page background

// The inner markup of an SVG file, and its viewBox
const inner = svg => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const viewBox = svg => svg.match(/viewBox="([^"]+)"/)[1];

function png(svg, width, name) {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: width }, shapeRendering: 2, imageRendering: 0 });
  const data = r.render().asPng();
  writeFileSync(out(name), data);
  console.log(`icons/${name}  ${width}px  ${data.length} bytes`);
}

// Favicon: the small cut, at its three bitmap sizes
copyFileSync(path.join(root, 'brand/nikhilam-family/favicon.svg'), out('favicon.svg'));
console.log('icons/favicon.svg  copied');
for (const s of [16, 32, 48]) png(src('favicon.svg'), s, `favicon-${s}.png`);

// Manifest icons: the app mark as drawn (rounded tile, transparent corners)
const mark = src('mark.svg');
png(mark, 192, 'icon-192.png');
png(mark, 512, 'icon-512.png');

// The family alone (the mark without its tile), to measure it
const family = inner(mark).replace(/<rect[^>]*\/>/, '').replace(/<!--[\s\S]*?-->/g, '');
const bare = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${family}</svg>`;
// getBBox leaves out strokes; the widest stroke is 7 units in the family, 0.615 of that in the mark
const b = new Resvg(bare).getBBox();
if (!b || !b.width) throw new Error('mark.svg: the family has no bounding box');
const pad = 3.5 * 0.615;
const box = { x: b.x - pad, y: b.y - pad, width: b.width + 2 * pad, height: b.height + 2 * pad };

// Apple touch icon: full bleed square, the family where the mark puts it
png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${TILE}"/>${family}</svg>`, 180, 'apple-touch-icon.png');

// Maskable: full bleed, the family's box scaled so its corners stay inside the safe circle (radius 40%, here 25.6
// of 64) with a little room, and centred
const k = (25.6 * 0.94) / Math.hypot(box.width / 2, box.height / 2);
const tx = 32 - (box.x + box.width / 2) * k, ty = 32 - (box.y + box.height / 2) * k;
png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${TILE}"/>`
  + `<g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${k.toFixed(4)})">${family}</g></svg>`, 512, 'maskable-512.png');

// Social image: the light lockup centred on the Daybreak page, with the family's three colours along the foot
const lockup = src('lockup-light.svg');
const [, , lw, lh] = viewBox(lockup).split(/\s+/).map(Number);
const W = 1200, H = 630, scale = 940 / lw;
const ox = (W - lw * scale) / 2, oy = (H - 24 - lh * scale) / 2;
png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${PAGE}"/>`
  + `<g transform="translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${scale.toFixed(4)})">${inner(lockup)}</g>`
  + `<rect y="${H - 24}" width="${W / 3}" height="24" fill="#5B9BE6"/><rect x="${W / 3}" y="${H - 24}" width="${W / 3}" height="24" fill="#F2B544"/>`
  + `<rect x="${(2 * W) / 3}" y="${H - 24}" width="${W / 3}" height="24" fill="#EE7A63"/></svg>`, W, 'og.png');
