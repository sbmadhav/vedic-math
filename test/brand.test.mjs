/* The brand mark is the Nikhilam Family (the Devanagari digits 1, 0 and 9 as a family; sources in
   brand/nikhilam-family/, PNGs made by tools/brand/render.mjs). Bolt stays the in-game teacher (inside /play/ only),
   never the brand; the landing hero is the Nikhilam Family too: the header shows the family drawn with tokens, every page links the favicon set, and the icons
   have the sizes the manifest and the pages name. */
import test from './support/node-test.mjs';
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

test('the landing hero is the Nikhilam Family, drawn with tokens, named for screen readers, and Bolt is not on it', () => {
  const html = src('site/index.html');
  const hero = html.match(/<svg class="lv-family"[^>]*>[\s\S]*?<\/svg>/);
  assert.ok(hero, 'the landing page has the family hero');
  assert.match(hero[0], /^<svg class="lv-family" viewBox="[^"]+" role="img" aria-label="The Nikhilam Family: the Devanagari digits one, zero and nine">/);
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(hero[0]), 'no hex colours: tokens only, so both schemes work');
  for (const t of ['--sky', '--sun', '--coral', '--ink', '--on-accent']) assert.ok(hero[0].includes(`var(${t})`), `the hero uses ${t}`);
  for (const c of ['lv-f-one', 'lv-f-zero', 'lv-f-nine']) assert.ok(hero[0].includes(`class="${c}"`), `the hero draws ${c}`);
  assert.ok(!/lv-bolt|--bolt-(body|accent|belly|screen|line)|aria-label="Bolt/.test(html), 'Bolt is not on the landing page');
});

test('the app home hero draws the same Nikhilam Family as the landing page, and it holds still under no motion', async () => {
  const landing = src('site/index.html').match(/<svg class="lv-family"[^>]*>[\s\S]*?<\/svg>/)[0];
  const { FAMILY_SVG } = await import('../js/family.js');
  assert.equal(FAMILY_SVG, landing, 'js/family.js is the landing hero, drawing for drawing');
  const app = src('js/app.js');
  assert.match(app, /<\/div>\$\{FAMILY_SVG\}<\/div>/, 'the Mode picker hero shows the family');
  const picker = app.slice(app.indexOf('function modePicker('), app.indexOf('function afterPick('));
  assert.doesNotMatch(picker, /icon\('bolt'\)|boltHTML/, 'no Bolt in the app home hero');
  const css = src('math.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.lv-family \*, \.mq-try::after, \.mq-try svg \{ animation: none !important; \} \}/);
  assert.match(css, /html\.motion-paused \.lv-family \*, body\.calm \.lv-family \*, html\.motion-paused \.mq-try::after, body\.calm \.mq-try::after/);
});

test('each Family helper is cut from the hero drawing (openspec family-helpers): the same group, tokens only, hidden from screen readers, never Bolt', async () => {
  const { FAMILY_SVG, friendSVG, FRIEND_IDS } = await import('../js/family.js');
  const group = { eka: 'lv-f-one', shunya: 'lv-f-zero', nava: 'lv-f-nine' };
  assert.deepEqual([...FRIEND_IDS].sort(), Object.keys(group).sort(), 'the three friends are the hero\'s three digits');
  for (const id of FRIEND_IDS) {
    const svg = friendSVG(id);
    assert.match(svg, new RegExp(`^<svg class="fh-art fh-art--${id}" viewBox="[^"]+" aria-hidden="true" focusable="false" data-pose="idle">`), id);
    const body = svg.match(/<g class="fh-body">([\s\S]*)<\/g><\/svg>$/);
    assert.ok(body && body[1].trim().length > 100, `${id} has a body`);
    const hero = FAMILY_SVG.match(new RegExp(`<g class="${group[id]}">([\\s\\S]*?)</g>`));
    assert.ok(hero, `the hero draws ${group[id]}`);
    assert.equal(body[1], hero[1], `${id} is the hero's ${group[id]} group, drawing for drawing`);
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(svg), `${id}: no hex colours, tokens only`);
    assert.ok(!/lv-bolt|--bolt-(body|accent|belly|screen|line)/.test(svg), `${id}: Bolt is not a Family helper`);
  }
});

test('every grown-up page is free of Bolt art: Bolt stays inside the game', () => {
  for (const p of pages.filter(f => f.startsWith('site'))) {
    assert.ok(!/lv-bolt|--bolt-(body|accent|belly|screen|line)|Bolt, the friendly robot/.test(src(p)), p);
  }
});

test('the hero moves only when motion is allowed: reduced motion, Pause motion and Calm stop it, and the landing page applies Calm before paint', () => {
  const css = src('theme/site.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.lv-family \* \{ animation: none !important; \} \}/);
  assert.match(css, /html\.motion-paused \.lv-family \*, html\.calm \.lv-family \* \{ animation: none !important; \}/);
  assert.match(css, /\.lv-family \{ width: clamp\(120px, 22vw, 220px\); height: auto;/, 'same width rules as before');
  assert.ok(src('site/index.html').includes("if(localStorage.getItem('vm.calm')==='1')d.classList.add('calm');"));
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
