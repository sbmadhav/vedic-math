/* The brand mark is the Nikhilam Family (the Devanagari digits 1, 0 and 9 as a family; sources in
   brand/nikhilam-family/, PNGs made by tools/brand/render.mjs). Bolt stays the in-game teacher and the landing hero,
   never the brand: the header shows the family drawn with tokens, every page links the favicon set, and the icons
   have the sizes the manifest and the pages name. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = f => readFileSync(join(repo, f), 'utf8');
const walk = d => readdirSync(join(repo, d)).flatMap(f => statSync(join(repo, d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]);
const pages = ['play/index.html', ...walk('site').filter(f => f.endsWith('.html'))];

/* Width, height and whether the PNG has an alpha channel, from its IHDR chunk */
function png(f) {
  const b = readFileSync(join(repo, f));
  assert.equal(b.subarray(1, 4).toString(), 'PNG', `${f} is a PNG`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: b[25] === 4 || b[25] === 6 };
}

test('the header brand is the Nikhilam Family mark, drawn with tokens and hidden from screen readers', () => {
  const header = src('theme/header.html');
  const brand = header.match(/<a class="md-brand"[^>]*>([\s\S]*?)<\/a>/);
  assert.ok(brand, 'the header has the brand link');
  assert.match(brand[0], /aria-label="Learn Vedic Math, home"/);
  assert.match(brand[0], /href="\/\?home"/);
  const svg = brand[1].match(/<svg[^>]*>[\s\S]*?<\/svg>/)[0];
  assert.match(svg, /^<svg class="lv-mark" viewBox="0 0 96 64" aria-hidden="true">/);
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(svg), 'no hex colours: tokens only, so both schemes work');
  assert.ok(!/--bolt-(body|accent|belly|screen)/.test(svg), 'Bolt is not the brand mark');
  for (const t of ['--sky', '--sun', '--coral', '--ink', '--on-accent']) assert.ok(svg.includes(`var(${t})`), `the mark uses ${t}`);
  assert.match(brand[1], /<span class="md-brand-t"><!-- slot:brand -->Learn Vedic Math<!-- \/slot:brand --><\/span>/);
});

test('both stylesheets give the 3:2 mark its size', () => {
  for (const f of ['math.css', 'theme/site.css']) assert.match(src(f), /\.md-brand svg\.lv-mark \{ width: 48px; height: 32px; \}/, f);
});

test('the landing hero keeps Bolt as the character who plays along', () => {
  assert.match(src('site/index.html'), /<svg class="lv-bolt"[^>]*aria-label="Bolt, the friendly robot who plays along"/);
});

test('every page links the favicon set and the Apple touch icon; pages with Open Graph tags use the social image', () => {
  for (const p of pages) {
    const html = src(p);
    for (const s of [16, 32, 48]) assert.ok(html.includes(`<link rel="icon" href="/icons/favicon-${s}.png" sizes="${s}x${s}" type="image/png">`), `${p} favicon-${s}`);
    assert.ok(html.includes('<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">'), `${p} favicon.svg`);
    assert.ok(html.includes('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">'), `${p} apple-touch-icon`);
    if (html.includes('og:image')) {
      assert.ok(html.includes('<meta property="og:image" content="https://learnvedicmath.com/icons/og.png">'), `${p} og:image`);
      assert.ok(html.includes('<meta property="og:image:width" content="1200">') && html.includes('<meta property="og:image:height" content="630">'), `${p} og:image size`);
      assert.match(html, /<meta property="og:image:alt" content="[^"]+">/, `${p} og:image:alt`);
    }
  }
});

test('the icons have the sizes the pages and the manifest name', () => {
  for (const [f, w, h] of [['icons/favicon-16.png', 16, 16], ['icons/favicon-32.png', 32, 32], ['icons/favicon-48.png', 48, 48],
    ['icons/apple-touch-icon.png', 180, 180], ['icons/icon-192.png', 192, 192], ['icons/icon-512.png', 512, 512],
    ['icons/maskable-512.png', 512, 512], ['icons/og.png', 1200, 630]]) {
    const p = png(f);
    assert.deepEqual([p.w, p.h], [w, h], f);
  }
  const manifest = JSON.parse(src('manifest.webmanifest'));
  for (const i of manifest.icons) if (i.type === 'image/png') {
    const p = png(i.src.slice(1));
    assert.equal(`${p.w}x${p.h}`, i.sizes, i.src);
  }
  assert.ok(manifest.icons.some(i => i.purpose === 'maskable' && i.src === '/icons/maskable-512.png'));
});

test('the published favicon is the brand source, and its eyes sit on the 16, 32 and 48 px pixel grids', () => {
  const fav = src('icons/favicon.svg');
  assert.equal(fav, src('brand/nikhilam-family/favicon.svg'), 'icons/favicon.svg is a copy of the source (tools/brand/render.mjs)');
  assert.match(fav, /viewBox="0 0 64 64"/);
  const eyes = [...fav.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(m => m.slice(1).map(Number));
  assert.equal(eyes.length, 2, 'two eyes');
  // 64 units: 4 units are 1 px at 16, 2 px at 32 and 3 px at 48
  for (const e of eyes) for (const v of e) assert.equal(v % 4, 0, `eye edge ${v} is on the grid`);
});
