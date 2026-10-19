/* Vendored files and the theme (openspec change learnvedicmath, site-assets spec; design D6, D10).
   - Each vendored package with a SHA256SUMS file matches it byte for byte: a vendored file is never edited by hand,
     a new version is vendored instead (build.py checks the same before every build).
   - theme/learnvedicmath.css only gives new values to token names the pinned design system defines, in both schemes,
     and the five category colours (Belts, avatars, tiles) are distinct from each other in each scheme. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

export function checkSums(dir) {
  const bad = [];
  for (const line of readFileSync(join(dir, 'SHA256SUMS'), 'utf8').split('\n').filter(Boolean)) {
    const [want, name] = line.split(/\s+\*?/);
    const p = join(dir, name);
    if (!existsSync(p)) bad.push(`${name}: missing`);
    else if (createHash('sha256').update(readFileSync(p)).digest('hex') !== want) bad.push(`${name}: differs from SHA256SUMS; vendor a new version instead`);
  }
  return bad;
}

const sums = walk(join(root, 'vendor')).filter(f => f.endsWith('/SHA256SUMS'));

test('every vendored package with SHA256SUMS matches it', () => {
  assert.ok(sums.some(f => f.includes('design-system/2.1.0')) && sums.some(f => f.includes('firebase/')) && sums.some(f => f.includes('goatcounter')));
  for (const f of sums) assert.deepEqual(checkSums(join(f, '..')), [], f);
});

test('the design system 2.1.0 copy lists every file it holds', () => {
  const dir = join(root, 'vendor/design-system/2.1.0');
  const listed = readFileSync(join(dir, 'SHA256SUMS'), 'utf8').split('\n').filter(Boolean).map(l => l.split(/\s+/)[1]).sort();
  assert.deepEqual(listed, readdirSync(dir).filter(f => f !== 'SHA256SUMS').sort());
  for (const f of ['tokens.css', 'components.css', 'header.js', 'header.html', 'compose.py', 'LICENSE']) assert.ok(listed.includes(f), f);
});

test('the Firebase SDK is vendored with no import of another origin', () => {
  const dirs = readdirSync(join(root, 'vendor/firebase'));
  assert.equal(dirs.length, 1, 'one version at a time');
  for (const f of walk(join(root, 'vendor/firebase'))) {
    const text = readFileSync(f, 'utf8');
    assert.doesNotMatch(text, /gstatic\.com\/firebasejs/, f);
    for (const m of text.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)) assert.ok(m[1].startsWith('./'), `${f}: imports ${m[1]}`);
  }
  // Once js/cloud.js loads the SDK from this site (the move to learnvedicmath.com), it names this version
  const [, v, cdn] = readFileSync(join(root, 'js/cloud.js'), 'utf8').match(/const V = '([\d.]+)', CDN = `([^`]+)`/);
  if (cdn.startsWith('/vendor/firebase/')) assert.equal(v, dirs[0]);
});

/* ---------- the theme ---------- */
const tokens = readFileSync(join(root, 'vendor/design-system/2.1.0/tokens.css'), 'utf8');
const theme = readFileSync(join(root, 'theme/learnvedicmath.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const defined = new Set([...tokens.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));

test('the theme sets only token names the pinned tokens.css defines', () => {
  const set = [...theme.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]);
  assert.ok(set.length > 0);
  for (const name of set) assert.ok(defined.has(name), `${name} is not a design system token`);
  assert.doesNotMatch(theme, /[^-]\b(color|background|font|margin|padding)\s*:/, 'the theme only sets tokens');
});

/* The value of each token in a scheme: tokens.css's block for it, then the theme's block for it */
function scheme(css, which) {
  const blocks = which === 'light'
    ? [...css.matchAll(/(?:^|\n):root\s*\{([^}]*)\}/g)].map(m => m[1])
    : [...css.matchAll(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/g)].map(m => m[1]);
  return Object.fromEntries(blocks.flatMap(b => [...b.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim().toLowerCase()])));
}
const CATEGORY = ['--coral', '--teal', '--sun', '--sky', '--plum'];

for (const which of ['light', 'dark']) {
  test(`the five category colours are distinct in ${which === 'light' ? 'Daybreak' : 'Deep Space'}`, () => {
    const values = { ...scheme(tokens, which), ...scheme(theme, which) };
    const seen = CATEGORY.map(t => values[t]);
    for (const v of seen) assert.match(v, /^#[0-9a-f]{6}$/);
    assert.equal(new Set(seen).size, 5, CATEGORY.map((t, i) => `${t} ${seen[i]}`).join(', '));
  });
}

test('the system-dark block and the picked-dark block of the theme agree', () => {
  const media = theme.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)\s*\{([^}]*)\}/)[1];
  const picked = theme.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/)[1];
  assert.equal(media.replace(/\s+/g, ' ').trim(), picked.replace(/\s+/g, ' ').trim());
});
