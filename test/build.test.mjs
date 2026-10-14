/* build.py output for offline use: the service worker's precache list must hold every module at the
   exact URL the import map uses, and its VERSION must change whenever a module does. Runs build.py on
   a copy of the repo, so the working tree is never touched. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, appendFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'vedic-math-build-'));
for (const f of ['build.py', 'index.html', 'math.css', 'sw.js', 'manifest.webmanifest', 'js']) cpSync(join(repo, f), join(dir, f), { recursive: true });
test.after(() => rmSync(dir, { recursive: true, force: true }));

const build = () => execFileSync('python3', ['build.py'], { cwd: dir, encoding: 'utf8' });
const read = f => readFileSync(join(dir, f), 'utf8');
const sw = () => {
  const src = read('sw.js');
  return { version: src.match(/const VERSION = '(\w+)';/)[1], precache: JSON.parse(src.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1]) };
};
const importMap = () => JSON.parse(read('index.html').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const sha = f => createHash('sha256').update(readFileSync(join(dir, f))).digest('hex').slice(0, 10);

test('the precache list holds every import-map module, the shell and the stamped CSS, each with its file hash', () => {
  build();
  const { version, precache } = sw();
  assert.match(version, /^[0-9a-f]{10}$/);
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

test('a second build changes nothing', () => {
  build();
  const before = [read('index.html'), read('sw.js')];
  build();
  assert.deepEqual([read('index.html'), read('sw.js')], before);
});

test('changing a module changes its import-map stamp, its precache entry and VERSION', () => {
  build();
  const v1 = sw().version, url1 = importMap()['/vedic-math/js/lib.js'];
  appendFileSync(join(dir, 'js/lib.js'), '\n// changed\n');
  build();
  const { version: v2, precache } = sw(), url2 = importMap()['/vedic-math/js/lib.js'];
  assert.notEqual(v2, v1);
  assert.notEqual(url2, url1);
  const urls = precache.map(([u]) => u);
  assert.ok(urls.includes(url2) && !urls.includes(url1));
});

test('changing the worker logic changes VERSION', () => {
  build();
  const v1 = sw().version;
  writeFileSync(join(dir, 'sw.js'), read('sw.js') + '\n// changed\n');
  build();
  assert.notEqual(sw().version, v1);
});
