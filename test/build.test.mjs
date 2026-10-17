/* build.py --out: the stamped copy CI publishes. The precache list must hold every module at the exact
   URL the import map uses, VERSION must change whenever a module does, repo-only files stay out, and
   the source must stay unstamped. Runs build.py on a throwaway git repo holding a copy of this one,
   so the working tree is never touched. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, appendFileSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'vedic-math-build-'));
for (const f of ['build.py', '_config.yml', '.gitignore', 'index.html', 'math.css', 'sw.js', 'manifest.webmanifest', 'js', 'CLAUDE.md', 'README.md', 'cloud/firestore.rules', 'test/index.js', '.github', 'tools/voice/ci-fetch.mjs'])
  cpSync(join(repo, f), join(dir, f), { recursive: true });
writeFileSync(join(dir, '_notes.txt'), 'starts with _');
/* Run git and the build in the temp copy only. A pre-commit hook exports GIT_DIR, GIT_INDEX_FILE and friends;
   inherited, they would point `git init` at the real repository (which marks it core.bare = true) and make
   build.py list the real repository's files. */
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
execFileSync('git', ['init', '-q'], { cwd: dir, env });
const out = join(dir, 'out');
test.after(() => rmSync(dir, { recursive: true, force: true }));

const build = () => execFileSync('python3', ['build.py', '--out', out], { cwd: dir, env, encoding: 'utf8' });
const tryBuild = () => spawnSync('python3', ['build.py', '--out', out], { cwd: dir, env, encoding: 'utf8' });
const read = f => readFileSync(join(out, f), 'utf8');
const sw = () => {
  const src = read('sw.js');
  return { version: src.match(/const VERSION = '(\w+)';/)[1], precache: JSON.parse(src.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1]) };
};
const importMap = () => JSON.parse(read('index.html').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const sha = f => createHash('sha256').update(readFileSync(join(out, f))).digest('hex').slice(0, 10);

test('the source in git is unstamped: no import map, plain URLs, a dev worker', () => {
  const html = readFileSync(join(repo, 'index.html'), 'utf8'), src = readFileSync(join(repo, 'sw.js'), 'utf8');
  assert.ok(!html.includes('type="importmap"'));
  assert.ok(!/\?v=/.test(html));
  assert.match(html, /<script type="module" src="\/vedic-math\/js\/app\.js"><\/script>/);
  assert.match(src, /\nconst VERSION = 'dev';\nconst PRECACHE = \[\];\n/);
});

test('the output is stamped, has .nojekyll and holds only publishable files', () => {
  build();
  assert.ok(existsSync(join(out, '.nojekyll')));
  assert.match(sw().version, /^[0-9a-f]{10}$/);
  assert.match(read('index.html'), /<script type="module" src="\/vedic-math\/js\/app\.js\?v=[0-9a-f]{10}"><\/script>/);
  assert.match(read('index.html'), /href="\/vedic-math\/math\.css\?v=[0-9a-f]{10}"/);
  for (const f of ['CLAUDE.md', 'README.md', 'build.py', '_config.yml', 'cloud', 'test', 'tools', '.github', '.gitignore', '_notes.txt', 'out'])
    assert.ok(!existsSync(join(out, f)), `${f} must not be published`);
  for (const f of ['index.html', 'sw.js', 'math.css', 'manifest.webmanifest', 'js/app.js', 'js/skills/index.js']) assert.ok(existsSync(join(out, f)), `${f} is published`);
  // Modules are copied byte for byte
  assert.equal(read('js/app.js'), readFileSync(join(dir, 'js/app.js'), 'utf8'));
});

test('the precache list holds every import-map module, the shell and the stamped CSS, each with its file hash', () => {
  build();
  const { precache } = sw();
  const urls = new Map(precache);
  for (const url of Object.values(importMap())) assert.ok(urls.has(url), `${url} is not precached`);
  assert.equal(urls.get('/vedic-math/'), sha('index.html'));
  const css = read('index.html').match(/href="(\/vedic-math\/math\.css\?v=\w+)"/)[1];
  assert.equal(urls.get(css), sha('math.css'));
  assert.equal(urls.get(importMap()['/vedic-math/js/app.js']), sha('js/app.js'));
  for (const u of ['/design-system/tokens.css', '/design-system/components.css', '/assets/explore.js', '/assets/fonts/nunito-sans-latin-wght-normal.woff2'])
    assert.equal(urls.get(u), null, `${u} should be precached without a hash`);
  for (const [u] of precache) assert.ok(u.startsWith('/'), `${u} is not an absolute path`);
});

test('a second build gives the same output, and the build never edits the source', () => {
  const before = ['index.html', 'sw.js'].map(f => readFileSync(join(dir, f), 'utf8'));
  build();
  const first = [read('index.html'), read('sw.js')];
  build();
  assert.deepEqual([read('index.html'), read('sw.js')], first);
  assert.deepEqual(['index.html', 'sw.js'].map(f => readFileSync(join(dir, f), 'utf8')), before);
});

test('changing a module changes its import-map stamp, its precache entry and VERSION', () => {
  build();
  const v1 = sw().version, url1 = importMap()['/vedic-math/js/lib.js'];
  const orig = readFileSync(join(dir, 'js/lib.js'), 'utf8');
  appendFileSync(join(dir, 'js/lib.js'), '\n// changed\n');
  build();
  writeFileSync(join(dir, 'js/lib.js'), orig);
  const { version: v2, precache } = sw(), url2 = importMap()['/vedic-math/js/lib.js'];
  assert.notEqual(v2, v1);
  assert.notEqual(url2, url1);
  const urls = precache.map(([u]) => u);
  assert.ok(urls.includes(url2) && !urls.includes(url1));
});

test('changing the worker logic changes VERSION', () => {
  build();
  const v1 = sw().version, orig = readFileSync(join(dir, 'sw.js'), 'utf8');
  writeFileSync(join(dir, 'sw.js'), orig + '\n// changed\n');
  build();
  writeFileSync(join(dir, 'sw.js'), orig);
  assert.notEqual(sw().version, v1);
});

test('the build fails if stamps are committed to the source', () => {
  for (const [f, edit] of [
    ['sw.js', s => s.replace("const VERSION = 'dev';", "const VERSION = 'abc1234567';")],
    ['index.html', s => s.replace('src="/vedic-math/js/app.js"', 'src="/vedic-math/js/app.js?v=abc1234567"')],
    ['index.html', s => s.replace('<script type="module"', '<script type="importmap">{"imports":{}}</script>\n<script type="module"')],
  ]) {
    const orig = readFileSync(join(dir, f), 'utf8');
    writeFileSync(join(dir, f), edit(orig));
    const r = tryBuild();
    writeFileSync(join(dir, f), orig);
    assert.notEqual(r.status, 0, `a stamped ${f} must fail the build`);
    assert.match(r.stderr, /source must/);
  }
});

/* Content-Security-Policy (openspec/specs/content-security): written into the built index.html only. */
const policy = () => {
  const m = read('index.html').match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  assert.ok(m, 'the built index.html has a CSP <meta>');
  return Object.fromEntries(m[1].split(/;\s*/).map(d => { const [k, ...v] = d.split(/\s+/); return [k, v]; }));
};

test('the build writes a CSP that allows each inline script, the import map included, by its hash', () => {
  build();
  const html = read('index.html'), csp = policy();
  assert.ok(html.indexOf('http-equiv="Content-Security-Policy"') < html.indexOf('<script'), 'the policy comes before the first script');
  assert.ok(html.indexOf('<meta charset="utf-8">') < html.indexOf('http-equiv="Content-Security-Policy"'));
  assert.match(html, /<meta name="referrer" content="strict-origin-when-cross-origin">/);
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.equal(inline.length, 3, 'the color scheme script, the import map and the color mode buttons');
  for (const body of inline) assert.ok(csp['script-src'].includes(`'sha256-${createHash('sha256').update(body).digest('base64')}'`), `no hash for ${body.slice(0, 40)}`);
  for (const bad of ["'unsafe-inline'", "'unsafe-eval'", "'wasm-unsafe-eval'", '*', 'https:', 'data:', 'blob:']) assert.ok(!csp['script-src'].includes(bad), `script-src must not allow ${bad}`);
  assert.deepEqual(csp['object-src'], ["'none'"]);
  assert.deepEqual(csp['default-src'], ["'self'"]);
  assert.ok(csp['frame-src'].includes('https://www.youtube-nocookie.com'));
  assert.ok(csp['img-src'].includes('https://i.ytimg.com'));
  assert.ok(csp['connect-src'].includes('https://firestore.googleapis.com'));
  assert.ok(csp['script-src'].includes('https://www.gstatic.com/firebasejs/'));
  assert.ok(!JSON.stringify(csp).includes('gc.zgo.at'), 'GoatCounter count.js is served from this site');
  assert.ok(!/http-equiv="Content-Security-Policy"/.test(readFileSync(join(repo, 'index.html'), 'utf8')), 'the source has no policy');
});

test('with leaderboards off the CSP lists no Firebase or Google host', () => {
  const cfg = join(dir, 'js/cloud-config.js'), orig = readFileSync(cfg, 'utf8');
  writeFileSync(cfg, orig.replace(/export const FIREBASE = \{[\s\S]*?\};/, 'export const FIREBASE = null;'));
  try { build(); } finally { writeFileSync(cfg, orig); }
  const text = JSON.stringify(policy());
  assert.ok(!/google|gstatic|firebase/.test(text), text);
});

test('the build fails on a CSP in the source, an inline event handler or a javascript: URL', () => {
  for (const edit of [
    s => s.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="default-src 'self'">`),
    s => s.replace('<button type="button" class="linkbtn mq-reset" id="resetMode">', '<button type="button" class="linkbtn mq-reset" id="resetMode" onclick="go()">'),
    s => s.replace('href="#/learn"', 'href="javascript:void(0)"'),
  ]) {
    const orig = readFileSync(join(dir, 'index.html'), 'utf8');
    const changed = edit(orig);
    assert.notEqual(changed, orig);
    writeFileSync(join(dir, 'index.html'), changed);
    const r = tryBuild();
    writeFileSync(join(dir, 'index.html'), orig);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /CSP|Content-Security-Policy/);
  }
});

/* Studio voice (openspec better-voice): recordings never come from git, and the site never names a speech provider
   or carries a key. The Firebase web config's apiKey is public and is the one key allowed. */
test('the build fails on committed audio or a voice/ folder', () => {
  for (const f of ['voice/l/0123456789abcd.m4a', 'js/clip.mp3']) {
    const p = join(dir, f);
    cpSync(join(repo, 'js/voice-plan.js'), p, { recursive: true }); // any bytes will do
    execFileSync('git', ['add', '-f', f], { cwd: dir, env }); // committed by force, past .gitignore
    const r = tryBuild();
    execFileSync('git', ['rm', '-q', '--cached', f], { cwd: dir, env });
    rmSync(p); rmSync(join(dir, 'voice'), { recursive: true, force: true });
    assert.notEqual(r.status, 0, f);
    assert.match(r.stderr, /audio is never committed/);
  }
});

test('the build fails when a published file names a speech provider or holds a key or token', () => {
  const key = 'AIza' + 'Sy'.padEnd(35, 'x'), token = 'ya29' + '.'.padEnd(30, 'a');
  for (const line of ["fetch('https://texttospeech.googleapis.com/v1/text:synthesize')", `const k = '${key}';`, `const t = '${token}';`, "const u = 'https://api.elevenlabs.io/v1';"]) {
    const f = join(dir, 'js/voice-plan.js'), orig = readFileSync(f, 'utf8');
    writeFileSync(f, orig + '\n// ' + line + '\n');
    const r = tryBuild();
    writeFileSync(f, orig);
    assert.notEqual(r.status, 0, line);
    assert.match(r.stderr, /speech provider|API key or token/, line);
  }
  build(); // and the real source passes, Firebase apiKey included
});
