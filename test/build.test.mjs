/* build.py: the stamped site CI deploys to Cloudflare (openspec change learnvedicmath: hosting, security-headers,
   content-security, offline-app, site-assets, third-party-requests). The precache list must hold every module at the
   exact URL the import map uses, VERSION must change whenever a module does, repo-only files stay out, the source
   stays unstamped, and the headers carry a policy per page. Runs build.py on a throwaway git repo holding a copy of
   this one, so the working tree is never touched. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, appendFileSync, rmSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'lvm-build-'));
for (const f of ['build.py', '_config.yml', '.gitignore', 'play', 'site', 'theme', 'vendor', 'fonts', 'icons', 'thumbs', 'math.css', 'css', 'app/src/sw',
  'tools/build-sw.mjs', 'tools/build-ts.mjs', 'shared/src', 'tools/budget.ts', 'manifest.webmanifest', 'js', 'sounds', 'THIRD-PARTY-NOTICES.md', 'docs/legal', 'moved', 'AGENTS.md', 'CODING_STANDARDS.md', 'README.md',
  'wrangler.jsonc', 'workers/src', 'package.json', 'pnpm-workspace.yaml', 'tsconfig.base.json', 'vitest.config.ts',
  'cloud/firestore.rules', 'test/support/verify.mjs', '.github', 'tools/voice/ci-fetch.mjs', 'tools/sutra-voice/names.mjs'])
  if (existsSync(join(repo, f))) cpSync(join(repo, f), join(dir, f), { recursive: true });
writeFileSync(join(dir, '_notes.txt'), 'starts with _');
/* The first-load budget (tools/budget.ts, task 1.8): every test but the budget's own builds against a roomy limit, so an
   edit made to test something else never trips it; the budget tests set the limit to a real build's total */
const BUDGET = join(dir, 'docs/perf/baseline.json');
const setBudget = (total, files = {}) => { mkdirSync(dirname(BUDGET), { recursive: true }); writeFileSync(BUDGET, JSON.stringify({ firstLoad: { total, files } })); };
setBudget(1e9);
/* Run git and the build in the temp copy only. A pre-commit hook exports GIT_DIR, GIT_INDEX_FILE and friends;
   inherited, they would point `git init` at the real repository (which marks it core.bare = true) and make
   build.py list the real repository's files. */
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_') && k !== 'BUILD_TODAY'));
execFileSync('git', ['init', '-q'], { cwd: dir, env });
/* Inside the copy, so its name starts with _ as build.py requires of an output inside the repo */
const out = join(dir, '_out');
test.after(() => rmSync(dir, { recursive: true, force: true }));

const build = (...args) => execFileSync('python3', ['build.py', '--out', out, ...args], { cwd: dir, env, encoding: 'utf8' });
const tryBuild = (args = [], extra = {}) => spawnSync('python3', ['build.py', '--out', out, ...args], { cwd: dir, env: { ...env, ...extra }, encoding: 'utf8' });
const read = f => readFileSync(join(out, f), 'utf8');
const sw = () => {
  const src = read('sw.js');
  return { version: src.match(/const VERSION = '(\w+)';/)[1], precache: JSON.parse(src.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1]) };
};
const importMap = () => JSON.parse(read('play/index.html').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const sha = f => createHash('sha256').update(readFileSync(join(out, f))).digest('hex').slice(0, 10);
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
/* Edit a file in the temp copy for one build, then put it back */
function withEdit(f, edit, fn) {
  const p = join(dir, f), orig = readFileSync(p, 'utf8'), changed = edit(orig);
  assert.notEqual(changed, orig, `the edit to ${f} changed nothing`);
  writeFileSync(p, changed);
  try { return fn(); } finally { writeFileSync(p, orig); }
}
/* Add a file to the temp copy's git index for one build */
function withFile(f, body, fn) {
  const p = join(dir, f);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body);
  execFileSync('git', ['add', '-f', f], { cwd: dir, env });
  try { return fn(); } finally { execFileSync('git', ['rm', '-q', '--cached', f], { cwd: dir, env }); rmSync(p); }
}
const fails = (r, re) => { assert.notEqual(r.status, 0, 'the build must fail'); assert.match(r.stderr, re); };

test('the source in git is unstamped: no import map, plain URLs, a dev worker', () => {
  const html = readFileSync(join(repo, 'play/index.html'), 'utf8'), src = readFileSync(join(repo, 'app/src/sw/sw.ts'), 'utf8');
  assert.ok(!html.includes('type="importmap"'));
  assert.ok(!/\?v=/.test(html));
  assert.match(html, /<script type="module" src="\/js\/app\.js"><\/script>/);
  assert.match(src, /\nconst VERSION: string = 'dev';\nconst PRECACHE: \[string, string\]\[\] = \[\];\n/);
  assert.ok(!existsSync(join(repo, 'index.html')), 'the game moved to play/index.html');
});

test('--out inside the repo must start with _ (git and ESLint ignore _*/), and is never the repo itself', () => {
  const run = o => spawnSync('python3', ['build.py', '--out', o], { cwd: dir, env, encoding: 'utf8' });
  fails(run(join(dir, 'out')), /--out inside the repo must be a folder starting with _/);
  assert.ok(!existsSync(join(dir, 'out')), 'nothing is written');
  fails(run(dir), /must not be the repo itself/);
});

test('the output has the pages at the root, is stamped, and holds only publishable files', () => {
  build();
  for (const f of ['play/index.html', 'index.html', 'js/app.js', 'parents/index.html', 'teachers/index.html', 'privacy/index.html', 'terms/index.html',
    'licenses/index.html', '404.html', 'sw.js', 'math.css', 'manifest.webmanifest', 'js/skills/index.js', 'ds/2.1.0/tokens.css', 'ds/2.1.0/components.css',
    'ds/2.1.0/header.js', 'theme/learnvedicmath.css', 'theme/fonts.css', 'fonts/nunito-sans-latin-wght-normal.woff2', 'icons/icon-192.png',
    '_headers', '_redirects', 'robots.txt', 'sitemap.xml', '.well-known/security.txt', '.assetsignore'])
    assert.ok(existsSync(join(out, f)), `${f} is published`);
  assert.match(sw().version, /^[0-9a-f]{10}$/);
  assert.match(read('play/index.html'), /<script type="module" src="\/js\/app\.js\?v=[0-9a-f]{10}"><\/script>/);
  assert.match(read('play/index.html'), /href="\/math\.css\?v=[0-9a-f]{10}"/);
  assert.match(read('index.html'), /href="\/theme\/site\.css\?v=[0-9a-f]{10}"/);
  for (const f of ['AGENTS.md', 'CODING_STANDARDS.md', 'README.md', 'build.py', '_config.yml', 'cloud', 'test', 'tools', '.github', '.gitignore', '_notes.txt', 'out', 'site',
    'moved', 'workers', 'app', 'shared', 'package.json', 'pnpm-workspace.yaml', 'tsconfig.base.json', 'vitest.config.ts', 'wrangler.jsonc', 'THIRD-PARTY-NOTICES.md', 'theme/header.html', 'vendor/design-system', 'docs', 'vendor/goatcounter/SHA256SUMS'])
    assert.ok(!existsSync(join(out, f)), `${f} must not be published`);
  assert.equal(read('js/life.js'), readFileSync(join(dir, 'js/life.js'), 'utf8'), 'modules are copied byte for byte');
  for (const p of walk(out)) {
    const rel = relative(out, p);
    if (rel === '_redirects' || /\.(png|woff2|webp|m4a|gz|wasm)$/.test(rel)) continue;
    assert.ok(!readFileSync(p, 'utf8').includes('/vedic-math/'), `${rel} names /vedic-math/`);
  }
  assert.match(read('_redirects'), /^\/vedic-math \/play\/ 301$/m);
  assert.match(read('_redirects'), /^\/vedic-math\/\* \/play\/ 301$/m);
});

/* react-typescript task 3.1: a js/ module that only re-exports a TypeScript module is skipped by every static import,
   so the first load requests the TypeScript module once, a level sooner, and js/mental.js's module stays off it */
test('static imports of a re-export-only js/ module point at its TypeScript module, and the first load graph is no deeper', () => {
  build();
  const STATIC = /(?:^|[;\n}])\s*(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|(?:^|[;\n}])\s*import\s*['"]([^'"]+)['"]/g;
  const seen = new Set(), queue = ['js/app.js'];
  while (queue.length) {
    const f = queue.pop(); if (seen.has(f)) continue; seen.add(f);
    for (const m of read(f).matchAll(STATIC)) {
      const s = m[1] || m[2];
      if (s.startsWith('/')) queue.push(s.slice(1));
      else if (s.startsWith('.')) queue.push(new URL(s, 'file:///' + f).pathname.slice(1));
    }
  }
  for (const f of ['js/vedic.js', 'js/viz.js', 'js/lib.js', 'js/skills/index.js', 'js/skills/middle.js', 'js/mental.js', 'js/ts/shared/src/mental.js', 'js/ts/shared/src/questions.js'])
    assert.ok(!seen.has(f), `${f} is in the first load's static graph`);
  for (const f of ['js/ts/shared/src/vedic.js', 'js/ts/shared/src/skills/index.js', 'js/story-plan.js']) assert.ok(seen.has(f), `${f} is in the graph`);
  assert.match(read('js/app.js'), /from '\/js\/ts\/shared\/src\/skills\/index\.js'/);
  assert.ok(existsSync(join(out, 'js/vedic.js')), 'the re-export file is still published, for a dynamic import');
});

test('the published design system drops its @font-face lines: the fonts are declared once, from /fonts/', () => {
  build();
  assert.doesNotMatch(read('ds/2.1.0/tokens.css'), /@font-face|\/assets\/fonts/);
  assert.match(read('theme/fonts.css'), /url\(\/fonts\/nunito-sans-latin-wght-normal\.woff2\)/);
  assert.equal(read('ds/2.1.0/components.css'), readFileSync(join(dir, 'vendor/design-system/2.1.0/components.css'), 'utf8'));
  for (const page of ['play/index.html', 'index.html', 'parents/index.html']) {
    assert.doesNotMatch(read(page), /@font-face/, `${page} declares no fonts of its own`);
    assert.match(read(page), /<link rel="preload" href="\/fonts\/nunito-sans-latin-wght-normal\.woff2" as="font"/);
    assert.match(read(page), /<link rel="preload" href="\/fonts\/fredoka-latin-600-normal\.woff2" as="font"/);
  }
});

test('the precache list holds every import-map module, the shell, the styles, fonts, icons and manifest, each with its hash', () => {
  build();
  const { precache } = sw();
  const urls = new Map(precache);
  for (const url of Object.values(importMap())) assert.ok(urls.has(url), `${url} is not precached`);
  assert.equal(urls.get('/play/'), sha('play/index.html'));
  const css = read('play/index.html').match(/href="(\/math\.css\?v=\w+)"/)[1];
  assert.equal(urls.get(css), sha('math.css'));
  assert.equal(urls.get(importMap()['/js/app.js']), sha('js/app.js'));
  const tokens = read('play/index.html').match(/href="(\/ds\/2\.1\.0\/tokens\.css\?v=\w+)"/)[1];
  assert.equal(urls.get(tokens), sha('ds/2.1.0/tokens.css'), 'the published tokens.css, as served');
  for (const u of ['/fonts/nunito-sans-latin-wght-normal.woff2', '/fonts/jetbrains-mono-latin-500-normal.woff2', '/icons/icon-192.png', '/icons/maskable-192.png', '/icons/maskable-512.png',
    '/icons/favicon-16.png', '/icons/favicon-32.png', '/icons/favicon-48.png', '/icons/favicon.svg', '/icons/apple-touch-icon.png', '/manifest.webmanifest'])
    assert.equal(urls.get(u), sha(u.slice(1)), `${u} is precached with its hash`);
  for (const [u, hash] of precache) {
    assert.ok(u.startsWith('/'), `${u} is not an absolute path`);
    assert.match(String(hash), /^[0-9a-f]{10}$/, `${u} has no hash`);
    assert.ok(!u.startsWith('/vendor/') && !u.startsWith('/thumbs/'), `${u} is fetched on first use, never precached`);
    assert.ok(!u.startsWith('/screenshots/'), `${u}: the install screenshots are for the browser's install dialog, never precached`);
  }
});

test('a second build gives the same output, and the build never edits the source', () => {
  const before = ['play/index.html', 'app/src/sw/sw.ts'].map(f => readFileSync(join(dir, f), 'utf8'));
  build();
  const first = [read('play/index.html'), read('sw.js'), read('_headers')];
  build();
  assert.deepEqual([read('play/index.html'), read('sw.js'), read('_headers')], first);
  assert.deepEqual(['play/index.html', 'app/src/sw/sw.ts'].map(f => readFileSync(join(dir, f), 'utf8')), before);
});

test('changing a module changes its import-map stamp, its precache entry and VERSION', () => {
  build();
  const v1 = sw().version, url1 = importMap()['/js/lib.js'];
  const orig = readFileSync(join(dir, 'js/lib.js'), 'utf8');
  appendFileSync(join(dir, 'js/lib.js'), '\n// changed\n');
  try { build(); } finally { writeFileSync(join(dir, 'js/lib.js'), orig); }
  const { version: v2, precache } = sw(), url2 = importMap()['/js/lib.js'];
  assert.notEqual(v2, v1);
  assert.notEqual(url2, url1);
  const urls = precache.map(([u]) => u);
  assert.ok(urls.includes(url2) && !urls.includes(url1));
});

test('changing the worker logic changes VERSION', () => {
  build();
  const v1 = sw().version;
  withEdit('app/src/sw/sw.ts', s => s + '\n// changed\n', () => build());
  assert.notEqual(sw().version, v1);
});

test('the build fails if stamps are committed to the source', () => {
  for (const [f, edit] of [
    ['app/src/sw/sw.ts', s => s.replace("const VERSION: string = 'dev';", "const VERSION: string = 'abc1234567';")],
    ['play/index.html', s => s.replace('src="/js/app.js"', 'src="/js/app.js?v=abc1234567"')],
    ['play/index.html', s => s.replace('<script type="module"', '<script type="importmap">{"imports":{}}</script>\n<script type="module"')],
    ['site/index.html', s => s.replace('href="/theme/site.css"', 'href="/theme/site.css?v=abc1234567"')],
  ]) withEdit(f, edit, () => fails(tryBuild(), /source must/));
});

test('--dev builds the same layout with no stamps and the dev worker', () => {
  build('--dev');
  assert.ok(existsSync(join(out, 'play/index.html')) && existsSync(join(out, 'index.html')) && existsSync(join(out, '_headers')));
  assert.doesNotMatch(read('play/index.html'), /\?v=|type="importmap"/);
  assert.match(read('sw.js'), /\nconst VERSION = 'dev';\nconst PRECACHE = \[\];\n/);
  assert.doesNotMatch(read('_headers'), /X-Robots-Tag/);
});

test('--preview sends X-Robots-Tag: noindex, nofollow on every response; production does not', () => {
  build('--preview');
  assert.match(read('_headers'), /^\/\*\n(?: {2}.*\n)*? {2}X-Robots-Tag: noindex, nofollow\n/m);
  build();
  assert.doesNotMatch(read('_headers'), /X-Robots-Tag/);
});

test('robots.txt allows crawling and names the sitemap, which lists the landing, game and grown-up pages', () => {
  build();
  assert.equal(read('robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: https://learnvedicmath.com/sitemap.xml\n');
  const urls = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  for (const p of ['/', '/play/', '/parents/', '/teachers/', '/privacy/', '/terms/']) assert.ok(urls.includes('https://learnvedicmath.com' + p), p);
  assert.ok(!urls.some(u => /404|import/.test(u)));
  for (const [page, url] of [['index.html', '/'], ['play/index.html', '/play/'], ['parents/index.html', '/parents/'], ['privacy/index.html', '/privacy/']])
    assert.match(read(page), new RegExp(`<link rel="canonical" href="https://learnvedicmath\\.com${url.replace(/\//g, '\\/')}">`), page);
});

test('the not-found page links to the landing page and the game', () => {
  build();
  const html = read('404.html');
  assert.match(html, /href="\/play\/"/);
  assert.match(html, /href="\/\?home"/);
});

/* ---------- headers and policies (security-headers, content-security) ---------- */
const headerRules = () => {
  const rules = {};
  let cur = null;
  for (const line of read('_headers').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (!line.startsWith(' ')) rules[cur = line.trim()] = {};
    else { const i = line.indexOf(':'); rules[cur][line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  }
  return rules;
};
const parse = p => Object.fromEntries(p.split(/;\s*/).map(d => { const [k, ...v] = d.split(/\s+/); return [k, v]; }));
const inlineHashes = html => [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(m => !/type="application\/json"/.test(m[1])).map(m => `'sha256-${createHash('sha256').update(m[2]).digest('base64')}'`);

test('every response carries the security headers, without HSTS preload', () => {
  build();
  const all = headerRules()['/*'];
  assert.equal(all['Strict-Transport-Security'], 'max-age=63072000; includeSubDomains');
  assert.equal(all['X-Content-Type-Options'], 'nosniff');
  assert.equal(all['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(all['Cross-Origin-Resource-Policy'], 'same-origin');
  assert.equal(all['X-Frame-Options'], 'DENY');
  assert.equal(all['Reporting-Endpoints'], 'csp="/_csp"', 'relative: a preview reports to its own endpoint');
  for (const off of ['geolocation=()', 'payment=()', 'usb=()', 'serial=()', 'bluetooth=()', 'browsing-topics=()'])
    assert.ok(all['Permissions-Policy'].includes(off), off);
  assert.doesNotMatch(all['Permissions-Policy'], /camera|microphone/, 'per page: Cloudflare would join a second value for the same feature');
  assert.ok(all['Permissions-Policy'].includes('fullscreen=(self "https://www.youtube-nocookie.com")'));
  assert.ok(!all['Content-Security-Policy'], 'no policy on /*: Cloudflare would join it with each page policy');
});

test('each page has its own policy from its inline script hashes; COOP is same-origin except /import/', () => {
  build();
  const rules = headerRules();
  for (const [url, file] of [['/', 'index.html'], ['/play/', 'play/index.html'], ['/parents/', 'parents/index.html'], ['/teachers/', 'teachers/index.html'], ['/privacy/', 'privacy/index.html'], ['/terms/', 'terms/index.html']]) {
    const r = rules[url];
    assert.ok(r, `${url} has a rule`);
    const html = read(file), csp = parse(r['Content-Security-Policy']), ro = parse(r['Content-Security-Policy-Report-Only']);
    assert.doesNotMatch(html, /http-equiv="Content-Security-Policy"/i, `${file} has no policy <meta>`);
    for (const h of inlineHashes(html)) assert.ok(csp['script-src'].includes(h), `${url}: no hash for an inline script`);
    for (const bad of ["'unsafe-inline'", "'unsafe-eval'", '*', 'https:', 'http:', 'data:', 'blob:']) assert.ok(!csp['script-src'].includes(bad), `${url} script-src allows ${bad}`);
    assert.deepEqual(csp['frame-ancestors'], ["'none'"]);
    assert.deepEqual(csp['object-src'], ["'none'"]);
    assert.deepEqual(csp['base-uri'], ["'none'"]);
    assert.deepEqual(csp['form-action'], ["'self'"]);
    assert.deepEqual(csp['report-to'], ['csp']);
    assert.deepEqual(csp['report-uri'], ['/_csp']);
    assert.ok('upgrade-insecure-requests' in csp);
    assert.equal(r['Cross-Origin-Opener-Policy'], 'same-origin');
    // The game asks for the camera (Math Lens) and the microphone (Tala Lab); no other page may
    assert.equal(r['Permissions-Policy'], url === '/play/' ? 'camera=(self), microphone=(self)' : 'camera=(), microphone=()', url);
    assert.deepEqual(ro['style-src'], ["'self'"], 'the Report-Only policy tries style-src without unsafe-inline');
    assert.deepEqual(ro['require-trusted-types-for'], ["'script'"]);
    assert.ok(!('report-uri' in ro), 'the Report-Only policy reports through report-to only (batched)');
    assert.ok(!('upgrade-insecure-requests' in ro), 'browsers ignore upgrade-insecure-requests in Report-Only and log a warning');
    assert.deepEqual(ro['report-to'], ['csp']);
    const all = JSON.stringify(csp);
    for (const gone of ['i.ytimg.com', 'gstatic.com/firebasejs', 'gc.zgo.at', 'sbmadhav.com', 'sbmadhav.goatcounter']) assert.ok(!all.includes(gone), `${url} allows ${gone}`);
    if (url !== '/play/') assert.ok(!/google|gstatic|firebase|youtube/.test(all), `${url} lists a Google or YouTube host`);
  }
  const play = parse(rules['/play/']['Content-Security-Policy']);
  assert.ok(play['script-src'].includes("'wasm-unsafe-eval'"), 'the Math Lens reader compiles WebAssembly (vendor/tesseract/)');
  assert.deepEqual(play['worker-src'], ["'self'"]);
  assert.ok(play['frame-src'].includes('https://www.youtube-nocookie.com'));
  assert.ok(play['media-src'].includes('https://voice.learnvedicmath.com') && play['connect-src'].includes('https://voice.learnvedicmath.com'));
  // Launch state (tasks 1.8 and 8.5): js/cloud-config.js has FIREBASE = null, so no page lists a Firebase or Google
  // host; the test below builds with a config and checks the hosts come back
  if (/export const FIREBASE = null;/.test(readFileSync(join(dir, 'js/cloud-config.js'), 'utf8')))
    assert.ok(!/firebase|googleapis|recaptcha|gstatic/.test(JSON.stringify(play)), 'device-only launch: /play/ lists no Firebase host');
  else assert.ok(play['connect-src'].includes('https://firestore.googleapis.com'));
  assert.ok(play['connect-src'].includes('https://learnvedicmath.goatcounter.com'));
  assert.ok(!parse(rules['/']['Content-Security-Policy'])['script-src'].includes("'wasm-unsafe-eval'"));
  assert.ok(Object.keys(rules).length <= 100);
  for (const line of read('_headers').split('\n')) assert.ok(line.length <= 2000, `a _headers line of ${line.length} characters`);
});

/* The committed config and a sample one: the launch ships with Device boards only (FIREBASE = null, tasks 1.8 and 8.5),
   and task 8.5 pastes the new project's config, which must bring back exactly the Firebase and App Check hosts */
const OFF = s => s.replace(/export const FIREBASE = (?:null|\{[\s\S]*?\});/, 'export const FIREBASE = null;').replace(/export const appCheckSiteKey = [^;]*;/, "export const appCheckSiteKey = '';");
const ON = s => s.replace(/export const FIREBASE = (?:null|\{[\s\S]*?\});/, `export const FIREBASE = {
  apiKey: "AIzaSyB-sample-key-for-the-build-test-0000",
  authDomain: "learnvedicmath.firebaseapp.com",
  projectId: "learnvedicmath",
  storageBucket: "learnvedicmath.firebasestorage.app",
  messagingSenderId: "1",
  appId: "1:1:web:1"
};`).replace(/export const appCheckSiteKey = [^;]*;/, "export const appCheckSiteKey = 'sample-site-key';");

test('with leaderboards off no policy lists a Firebase or Google host', () => {
  const cfg = readFileSync(join(dir, 'js/cloud-config.js'), 'utf8');
  if (OFF(cfg) === cfg) build(); else withEdit('js/cloud-config.js', OFF, () => build());
  assert.ok(!/google|gstatic|firebase/.test(read('_headers')));
});

test('the launch ships with Device boards only: js/cloud-config.js has no Firebase config and no App Check key (task 8.5 restores them)', () => {
  const cfg = readFileSync(join(dir, 'js/cloud-config.js'), 'utf8');
  assert.match(cfg, /export const FIREBASE = null;/);
  assert.match(cfg, /export const appCheckSiteKey = '';/);
  assert.match(cfg, /task 8\.5/i, 'the comment says which task turns World boards on');
});

test('with a Firebase config and an App Check key, /play/ lists the Firebase and App Check hosts and no other page does', () => {
  withEdit('js/cloud-config.js', ON, () => build());
  const rules = headerRules(), play = parse(rules['/play/']['Content-Security-Policy']);
  for (const h of ['https://firestore.googleapis.com', 'https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com', 'https://content-firebaseappcheck.googleapis.com'])
    assert.ok(play['connect-src'].includes(h), h);
  assert.ok(play['frame-src'].includes('https://learnvedicmath.firebaseapp.com'), 'the authDomain');
  assert.ok(play['script-src'].includes('https://www.google.com/recaptcha/'));
  for (const url of ['/', '/parents/', '/privacy/']) assert.ok(!/google|gstatic|firebase/.test(rules[url]['Content-Security-Policy']), url);
});

test('the build fails on a CSP <meta> in a page, an inline event handler or a javascript: URL', () => {
  for (const [f, edit, re] of [
    ['play/index.html', s => s.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="default-src 'self'">`), /Content-Security-Policy/],
    ['site/index.html', s => s.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="default-src 'self'">`), /Content-Security-Policy/],
    ['play/index.html', s => s.replace('<button type="button" class="linkbtn mq-reset" id="resetMode">', '<button type="button" class="linkbtn mq-reset" id="resetMode" onclick="go()">'), /inline event handler/],
    ['play/index.html', s => s.replace('href="#/learn"', 'href="javascript:void(0)"'), /javascript: URL/],
  ]) withEdit(f, edit, () => fails(tryBuild(), re));
});

test('the build fails when a _headers line would be too long for Cloudflare', () => {
  const many = Array.from({ length: 40 }, (_, i) => `<script>var x${i}=${i};</script>`).join('\n');
  withEdit('site/teachers/index.html', s => s.replace('</head>', many + '\n</head>'), () => fails(tryBuild(), /_headers: a line is \d+ characters/));
});

/* ---------- the site's own brand and hosts (hosting, landing-pages, third-party-requests) ---------- */
test('the build fails on a reference to sbmadhav.com, an https:// module import or an unlisted host', () => {
  withEdit('js/lib.js', s => s + "\nexport const u = 'https://sbmadhav.com/design-system/tokens.css';\n", () => fails(tryBuild(), /refers to .*sbmadhav\.com/));
  withEdit('js/lib.js', s => s + "\nexport const u = '/assets/explore.js';\n", () => fails(tryBuild(), /old shared site/));
  withEdit('js/lib.js', s => "import { x } from 'https://cdn.example.com/x.js';\n" + s, () => fails(tryBuild(), /imports https:\/\/cdn\.example\.com\/x\.js/));
  withEdit('js/lib.js', s => s + "\nexport const u = 'https://tracker.example.net/pixel.gif';\n", () => fails(tryBuild(), /names tracker\.example\.net, which is not in THIRD_PARTIES/));
  withEdit('js/lib.js', s => s + "\nexport const u = 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';\n", () => fails(tryBuild(), /gstatic\.com\/firebasejs/));
  withEdit('js/lib.js', s => s + "\nexport const u = '/vedic-math/js/app.js';\n", () => fails(tryBuild(), /names a \/vedic-math\/ path/));
  withEdit('js/lib.js', s => s + "\nexport const u = 'https://sbmadhav.com/vm-export/';\n", () => build()); // the export page: the one allowed
});

test('the build fails on a file over 25 MiB', () => {
  withFile('big.bin', Buffer.alloc(26 * 1024 * 1024), () => fails(tryBuild(), /big\.bin: \d+ bytes; Cloudflare Workers serves files up to 25 MiB/));
});

test('the build fails when a page header differs from theme/header.html', () => {
  withEdit('site/parents/index.html', s => s.replace('aria-label="Learn Vedic Math, home"', 'aria-label="Home"'), () => fails(tryBuild(), /header differs from theme\/header\.html/));
  withEdit('play/index.html', s => s.replace('<!-- md-header -->\n', ''), () => fails(tryBuild(), /md-header/));
});

test('the build fails when a vendored file does not match its SHA256SUMS', () => {
  withEdit('vendor/design-system/2.1.0/components.css', s => s + '\n/* edited by hand */\n', () => fails(tryBuild(), /does not match .*SHA256SUMS; vendor a new version/));
});

test('the build fails on a vendored or font file without an entry in THIRD-PARTY-NOTICES.md', () => {
  withFile('vendor/newlib/lib.js', 'export const x = 1;\n', () => fails(tryBuild(), /vendor\/newlib\/lib\.js: no entry in THIRD-PARTY-NOTICES\.md/));
});

/* ---------- no draft placeholder on a published page (UX audit 2026-10-29, task 1.1) ---------- */
/* A reader never sees text in [square brackets]: the legal drafts keep what is still to be decided in their
   "(remove before publishing)" sections, and the build fails on anything left in the published text. */
const pageText = html => html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '');
test('no published page shows a [bracketed] placeholder, and the legal pages keep their open items out', () => {
  build();
  const pages = walk(out).filter(f => f.endsWith('.html'));
  assert.ok(pages.length >= 8, 'every page is checked');
  const hits = pages.flatMap(f => (pageText(readFileSync(f, 'utf8')).match(/\[[^[\]]+\]/g) || []).map(m => `${relative(out, f)}: ${m}`));
  assert.deepEqual(hits, []);
  for (const p of ['privacy/index.html', 'privacy/retention/index.html', 'terms/index.html']) {
    const html = read(p);
    assert.doesNotMatch(html, /Open items|remove before publishing|For the reviewing lawyer|DRAFT\./, p);
    assert.match(html, /Last updated: |Owner of this policy/, p);
  }
});

test('the build fails on a [bracketed] placeholder in a page or in the Markdown it includes', () => {
  withEdit('docs/legal/terms.md', s => s.replace('## 8. Contact', '## 8. Contact\n\nGoverning law: [lawyer].'), () => fails(tryBuild(), /site\/terms\/index\.html: shows the placeholder \[lawyer\]/));
  withEdit('site/teachers/index.html', s => s.replace('</main>', '<p>Last updated: [date]</p>\n</main>'), () => fails(tryBuild(), /site\/teachers\/index\.html: shows the placeholder \[date\]/));
  // At any length and across a line break
  withEdit('site/parents/index.html', s => s.replace('</main>', '<p>Write to [postal\naddress].</p>\n</main>'), () => fails(tryBuild(), /site\/parents\/index\.html: shows the placeholder \[postal\naddress\]/));
  withEdit('site/teachers/index.html', s => s.replace('</main>', `<p>[${'x'.repeat(400)}]</p>\n</main>`), () => fails(tryBuild(), /site\/teachers\/index\.html: shows the placeholder \[x{400}\]/));
  // A Markdown link is a link, and a section to remove before publishing may hold placeholders
  withEdit('docs/legal/terms.md', s => s + '\n## Notes (remove before publishing)\n\n[owner name]\n', () => build());
});

test('the licences page lists every vendored package', () => {
  build();
  const html = read('licenses/index.html');
  for (const p of ['vendor/design-system/2.1.0/', 'vendor/firebase/', 'vendor/goatcounter/', 'vendor/tesseract/', 'fonts/']) assert.ok(html.includes(p), p);
});

test('security.txt: contact, canonical, policy, and the build fails within 30 days of Expires', () => {
  build();
  const txt = read('.well-known/security.txt');
  assert.match(txt, /^Contact: mailto:security@learnvedicmath\.com$/m);
  assert.match(txt, /^Preferred-Languages: en$/m);
  assert.match(txt, /^Canonical: https:\/\/learnvedicmath\.com\/\.well-known\/security\.txt$/m);
  assert.match(txt, /^Policy: https:\/\/learnvedicmath\.com\/privacy\/security\/$/m);
  const expires = new Date(txt.match(/^Expires: (\S+)$/m)[1]);
  const day = n => new Date(expires.getTime() - n * 86400000).toISOString().slice(0, 10);
  fails(tryBuild([], { BUILD_TODAY: day(20) }), /renew security\.txt/);
  assert.equal(tryBuild([], { BUILD_TODAY: day(40) }).status, 0);
});

/* ---------- Studio voice and sounds (openspec better-voice, sutra-pronunciation; design D17) ---------- */
test('the build fails on committed audio or a voice/ folder', () => {
  for (const f of ['voice/l/0123456789abcd.m4a', 'js/clip.mp3', 'sounds-extra/clip.m4a'])
    withFile(f, 'any bytes', () => fails(tryBuild(), /audio is never committed/));
});

test('the build fails when a published file names a speech provider or holds a key or token', () => {
  const key = 'AIza' + 'Sy'.padEnd(35, 'x'), token = 'ya29' + '.'.padEnd(30, 'a');
  for (const line of ["fetch('https://texttospeech.googleapis.com/v1/text:synthesize')", `const k = '${key}';`, `const t = '${token}';`, "const u = 'https://api.elevenlabs.io/v1';"])
    withEdit('js/voice-plan.js', s => s + '\n// ' + line + '\n', () => fails(tryBuild(), /speech provider|API key or token/));
  withFile('leak.svg', `<svg xmlns="http://www.w3.org/2000/svg"><!-- ${key} --></svg>`, () => fails(tryBuild(), /leak\.svg: holds something shaped like an API key or token/));
  build(); // and the real source passes, Firebase apiKey included
});

test('sounds/ is published and left out of the precache; tools/ is not published; no voice file is in the output', () => {
  build();
  for (const f of ['sounds/om.m4a', 'sounds/sutras/s1.m4a', 'sounds/sutras/u13.m4a']) assert.ok(existsSync(join(out, f)), `${f} is published`);
  assert.ok(!existsSync(join(out, 'tools')) && !existsSync(join(out, 'voice')));
  const urls = sw().precache.map(([u]) => u);
  assert.deepEqual(urls.filter(u => /\/sounds\/|\.m4a/.test(u)), []);
  assert.ok(urls.some(u => u.startsWith('/js/say-clips.js?v=')), 'the clip index is a module and is precached');
  assert.match(read('sw.js'), /url\.pathname\.startsWith\(SOUNDS\)\) return event\.respondWith\(soundFile\(req\)\)/);
  assert.ok(walk(out).length < 20000, 'under the Workers Free file limit');
});

/* CI deploys with --voice off while R2 is not set up (vars.R2_ACCOUNT_ID empty; deploy-pipeline spec): the site must
   never point at voice files that are not on the voice host, and read aloud uses the device voice */
test('--voice off: no published file names the voice host, the index names no recording, the worker has no voice origin', async () => {
  build('--voice', 'off');
  for (const f of walk(out)) assert.ok(!readFileSync(f, 'utf8').includes('voice.learnvedicmath.com'), `${relative(out, f)} names the voice host`);
  const rules = read('_headers');
  assert.match(rules, /^\/play\/$/m);
  assert.ok(!/voice\.learnvedicmath/.test(rules), 'no policy allows the voice host');
  const { STUDIO } = await import(join(out, 'js/voice-index.js') + '?off');
  assert.equal(STUDIO.tag, null, 'no recording: js/voice.js falls back to the built-in voice');
  assert.equal(STUDIO.base, null);
  assert.match(read('sw.js'), /^const VOICE_ORIGIN = null;/m);
  const v = sha('js/voice-index.js');
  assert.equal(importMap()['/js/voice-index.js'], `/js/voice-index.js?v=${v}`, 'the import map pins the published index, not the source');
  assert.ok(sw().precache.some(([u, hash]) => u === `/js/voice-index.js?v=${v}` && hash === v), 'the worker precaches the published index');
  // The default build keeps the voice host
  build();
  assert.match(read('_headers'), /media-src 'self' https:\/\/voice\.learnvedicmath\.com/);
  assert.match(read('js/voice-index.js'), /"base": "https:\/\/voice\.learnvedicmath\.com\/"/);
  // A source file naming the host fails a --voice off build
  withEdit('js/voice-plan.js', s => s + "\n// https://voice.learnvedicmath.com/l/x.m4a\n", () => fails(tryBuild(['--voice', 'off']), /js\/voice-plan\.js: names the voice host/));
  // Any case, and any published file, text or not
  withEdit('js/voice-plan.js', s => s + "\n// https://VOICE.LearnVedicMath.com/l/x.m4a\n", () => fails(tryBuild(['--voice', 'off']), /js\/voice-plan\.js: names the voice host/));
  withFile('thumbs/probe.png', Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0xff]), Buffer.from('voice.learnvedicmath.com')]), () => fails(tryBuild(['--voice', 'off']), /thumbs\/probe\.png: names the voice host/));
});

test('every static page has a canonical link and Open Graph tags with the site image', () => {
  build();
  for (const [page, url] of [['index.html', '/'], ['play/index.html', '/play/'], ['parents/index.html', '/parents/'], ['teachers/index.html', '/teachers/'],
    ['privacy/index.html', '/privacy/'], ['terms/index.html', '/terms/'], ['licenses/index.html', '/licenses/']]) {
    const html = read(page);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://learnvedicmath\\.com${url.replace(/\//g, '\\/')}">`), page);
    assert.match(html, new RegExp(`<meta property="og:url" content="https://learnvedicmath\\.com${url.replace(/\//g, '\\/')}">`), page);
    for (const p of ['og:title', 'og:description', 'og:type', 'og:site_name']) assert.match(html, new RegExp(`<meta property="${p}" content="[^"]+">`), `${page} ${p}`);
    assert.match(html, /<meta property="og:image" content="https:\/\/learnvedicmath\.com\/icons\/og\.png">/, page);
  }
});

test('a Markdown link keeps its query string: the URL is escaped once', () => {
  const r = spawnSync('python3', ['-B', '-c', 'import sys; sys.argv = ["build.py"]; import build; print(build.inline_md(sys.stdin.read()))'], { cwd: dir, env, input: 'see [the rule](https://example.org/a?x=1&y="2") & more', encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'see <a href="https://example.org/a?x=1&amp;y=&quot;2&quot;">the rule</a> &amp; more');
});

/* ---------- the progress hand-off (progress-handoff spec; tasks 10.1, 10.4, 16.1) ---------- */
test('the import page clears the fragment in its first script, sends events only, and gets its own policy', () => {
  build();
  const html = read('import/index.html');
  const first = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.match(first, /history\.replaceState\(null,'',location\.pathname\)/);
  assert.ok(html.indexOf(first) < html.indexOf('/js/analytics.js'), 'before analytics');
  assert.match(html, /<html lang="en" data-analytics="events-only">/);
  assert.match(html, /<script type="module" src="\/js\/handoff\.js\?v=\w+"><\/script>/);
  const r = headerRules()['/import/'];
  assert.equal(r['Cross-Origin-Opener-Policy'], 'same-origin-allow-popups');
  const csp = parse(r['Content-Security-Policy']);
  for (const h of inlineHashes(html)) assert.ok(csp['script-src'].includes(h));
  for (const bad of ["'unsafe-inline'", "'unsafe-eval'"]) assert.ok(!csp['script-src'].includes(bad));
  assert.ok(!read('sitemap.xml').includes('/import/'));
});

test('--target moved builds the moved page, its pinned packer and the KILL worker under /vedic-math/', () => {
  const moved = join(dir, '_moved_test');
  execFileSync('python3', ['build.py', '--target', 'moved', '--out', moved], { cwd: dir, env, encoding: 'utf8' });
  const m = f => readFileSync(join(moved, f), 'utf8');
  assert.deepEqual(walk(moved).map(p => relative(moved, p)).sort(), ['.nojekyll', '404.html', 'index.html', 'js/handoff-pack.js', 'js/handoff-schema.js', 'sw.js']);
  assert.equal(m('index.html'), m('404.html'), 'deep paths get the same page');
  const html = m('index.html');
  assert.match(html, /<link rel="canonical" href="https:\/\/learnvedicmath\.com\/">/);
  assert.match(html, /<noscript><meta http-equiv="refresh" content="0; url=https:\/\/learnvedicmath\.com\/"><\/noscript>/);
  assert.match(html, /<a id="go"[^>]*href="https:\/\/learnvedicmath\.com\/"/);
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  const pin = f => createHash('sha256').update(readFileSync(join(dir, f))).digest('hex').slice(0, 10);
  assert.equal(map['/vedic-math/js/handoff-schema.js'], `/vedic-math/js/handoff-schema.js?v=${pin('js/handoff-schema.js')}`);
  assert.match(html, new RegExp(`<script type="module" src="/vedic-math/js/handoff-pack\\.js\\?v=${pin('moved/handoff-pack.js')}"></script>`));
  const policy = parse(html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)[1]);
  for (const h of inlineHashes(html)) assert.ok(policy['script-src'].includes(h));
  assert.deepEqual(policy['connect-src'], ['https://sbmadhav.goatcounter.com'], 'the one hand-off count; nothing else leaves');
  assert.doesNotMatch(html, /firebase|gstatic|\/vedic-math\/js\/app\.js|analytics\.js/);
  for (const [, u] of html.matchAll(/(?:src|href)="(\/[^"]*)"/g)) assert.match(u, /^\/(vedic-math|design-system)\//, u);
  const sw = m('sw.js');
  assert.match(sw, /^const KILL = true;$/m);
  assert.match(sw, /^const PREFIX = 'vedic-math-';$/m);
  assert.match(sw, /^const VERSION = '[0-9a-f]{10}';$/m, 'a built VERSION: the KILL branch never runs on dev');
  // The packer never puts progress in a query string
  assert.match(m('js/handoff-pack.js'), /\/import\/\$\{fragment\(/);
  assert.match(m('js/handoff-schema.js'), /`#v=\$\{VERSION\}&d=\$\{data\}`/);
});

/* The first-load byte gate (openspec change react-typescript, performance-budget spec, task 1.8): 20 KB more in the
   entry fails the build, and so does a 20 KB file that only the worker's install downloads */
test('the build prints the first-load table and fails above the budget: 20 KB in the entry, or 20 KB only in PRECACHE', () => {
  build();
  const json = join(dir, '_measured.json');
  execFileSync('node', ['--no-warnings', join(dir, 'tools/budget.ts'), out, '--json', json], { cwd: dir, env, encoding: 'utf8' });
  const measured = JSON.parse(readFileSync(json, 'utf8'));
  try {
    setBudget(measured.total, measured.files);
    assert.match(build(), /First load of \/play\/ \(Brotli, \d+ files\): \d+ bytes/);
    const noise = randomBytes(20 * 1024);
    withEdit('js/app.js', src => `${src}\n/* ${noise.toString('base64')} */\n`, () =>
      fails(tryBuild(), /first-load budget: \d+ bytes Brotli is above the baseline's \d+ bytes \(docs\/perf\/baseline\.json\); largest new or grown file: \/js\/app\.js/));
    withFile('icons/budget-test.png', noise, () => withEdit('manifest.webmanifest',
      m => m.replace('"icons": [', '"icons": [\n    { "src": "/icons/budget-test.png", "sizes": "96x96", "type": "image/png" },'),
      () => {
        const r = tryBuild();
        fails(r, /largest new or grown file: \/icons\/budget-test\.png \(\+\d+ bytes, new\)/);
      }));
    assert.doesNotThrow(() => build('--dev'), 'a --dev build has no PRECACHE and is not measured');
  } finally { setBudget(1e9); }
});
