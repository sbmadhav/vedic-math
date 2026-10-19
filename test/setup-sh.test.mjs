/* cloud/setup.sh (openspec change learnvedicmath, task 8.4): the project id and domains are arguments, the TTL policy
   on exp is turned on, and --dry-run prints every command without running one or writing js/cloud-config.js. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../cloud/setup.sh', import.meta.url));
const config = fileURLToPath(new URL('../js/cloud-config.js', import.meta.url));
const run = (...args) => spawnSync('bash', [script, ...args], { encoding: 'utf8', env: { ...process.env, APP_CHECK: '1' } });

test('the script parses', () => {
  assert.equal(spawnSync('bash', ['-n', script]).status, 0);
});

test('--dry-run prints the commands for the given project and domains, and changes nothing', () => {
  const before = readFileSync(config, 'utf8');
  const r = run('--dry-run', 'learnvedicmath-prod', 'learnvedicmath.com', 'www.learnvedicmath.com');
  assert.equal(r.status, 0, r.stderr);
  const out = r.stdout + r.stderr;
  assert.match(out, /\+ gcloud services enable firebase\.googleapis\.com .* --project learnvedicmath-prod/);
  assert.match(out, /\+ gcloud firestore fields ttls update exp --collection-group=scores --enable-ttl/);
  assert.match(out, /\+ firebase deploy --only firestore:rules,firestore:indexes --project learnvedicmath-prod/);
  assert.match(out, /"authorizedDomains":\["localhost", "learnvedicmath\.com", "www\.learnvedicmath\.com"\]/);
  assert.match(out, /--domains=learnvedicmath\.com,www\.learnvedicmath\.com/);
  // It checks nothing, so first-time steps show too: the project, its billing link and the web app
  assert.match(out, /\+ gcloud projects create learnvedicmath-prod/);
  assert.match(out, /\+ gcloud billing projects link learnvedicmath-prod/);
  assert.match(out, /\+ firebase apps:create WEB/);
  assert.doesNotMatch(out, /sbmadhav/);
  assert.equal(readFileSync(config, 'utf8'), before, 'a dry run writes nothing');
});

test('the domains default to learnvedicmath.com and www, and a bad domain is refused', () => {
  assert.match(run('--dry-run', 'learnvedicmath').stdout, /domains learnvedicmath\.com,www\.learnvedicmath\.com/);
  const bad = run('--dry-run', 'learnvedicmath', 'not a domain');
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /Not a domain/);
});

test('a reused App Check key gets the domains of this run, and the next steps name them', () => {
  const src = readFileSync(script, 'utf8');
  assert.match(src, /gcloud recaptcha keys update "\$\{KEY_NAME##\*\/\}" --web --domains="\$DOMAINS_CSV"/);
  assert.match(src, /REFERRERS="\$\(printf 'https:\/\/%s\/\*, ' "\$\{DOMAINS_WANT\[@\]\}"\)"/);
  assert.doesNotMatch(src.slice(src.indexOf('Next steps')), /https:\/\/learnvedicmath\.com\/\*/);
});

test('writing the config for another project clears the old App Check key; the same project keeps it', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const src = readFileSync(script, 'utf8');
  const start = src.indexOf('import json, re, sys');
  const code = src.slice(start, src.indexOf(`' "$CONFIG_JS"`, start));
  const dir = mkdtempSync(join(tmpdir(), 'setup-sh-'));
  writeFileSync(join(dir, 'w.py'), code);
  const current = readFileSync(config, 'utf8');
  const key = current.match(/export const appCheckSiteKey = ([^;]*);/)[1];
  const project = current.match(/projectId: "([^"]+)"/)[1];
  for (const [id, want] of [['another-project', '""'], [project, key]]) {
    writeFileSync(join(dir, 'c.js'), current);
    const r = spawnSync('python3', [join(dir, 'w.py'), join(dir, 'c.js')], { input: JSON.stringify({ result: { sdkConfig: { apiKey: 'k', projectId: id, appId: 'a' } } }), encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const out = readFileSync(join(dir, 'c.js'), 'utf8');
    assert.match(out, new RegExp(`projectId: "${id}"`));
    assert.equal(out.match(/export const appCheckSiteKey = ([^;]*);/)[1], want, id);
  }
});
