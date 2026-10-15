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
for (const f of ['build.py', '_config.yml', '.gitignore', 'index.html', 'math.css', 'sw.js', 'manifest.webmanifest', 'js', 'CLAUDE.md', 'README.md', 'cloud/firestore.rules', 'test/index.js', '.github'])
  cpSync(join(repo, f), join(dir, f), { recursive: true });
writeFileSync(join(dir, '_notes.txt'), 'starts with _');
execFileSync('git', ['init', '-q'], { cwd: dir });
const out = join(dir, 'out');
test.after(() => rmSync(dir, { recursive: true, force: true }));

const build = () => execFileSync('python3', ['build.py', '--out', out], { cwd: dir, encoding: 'utf8' });
const tryBuild = () => spawnSync('python3', ['build.py', '--out', out], { cwd: dir, encoding: 'utf8' });
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
  for (const f of ['CLAUDE.md', 'README.md', 'build.py', '_config.yml', 'cloud', 'test', '.github', '.gitignore', '_notes.txt', 'out'])
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
