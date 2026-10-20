/* tools/check-workflow-secrets.mjs (openspec change learnvedicmath, deploy-pipeline spec; task 11.6): the production
   token only in ci.yml's deploy job (environment production), the R2 keys only in voice-upload, the preview token only
   in preview.yml's preview job on pull_request. The real workflows pass; a workflow naming a token elsewhere fails. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { check } from '../tools/check-workflow-secrets.mjs';

const dir = new URL('../.github/workflows/', import.meta.url);
const real = Object.fromEntries(readdirSync(dir).filter(f => f.endsWith('.yml')).map(f => [f, readFileSync(new URL(f, dir), 'utf8')]));

test('the workflows in this repo pass', () => {
  assert.deepEqual(check(real), []);
  // Once ci.yml deploys to Cloudflare, the deploy waits for the voice upload (design D17)
  if (/\n {2}voice-upload:/.test(real['ci.yml'])) assert.match(real['ci.yml'], /deploy:\n\s+needs: \[check, rules, voice-upload\]/);
  assert.match(real['preview.yml'], /^on:\n {2}pull_request:/m);
  assert.doesNotMatch(real['preview.yml'].replace(/#.*$/gm, ''), /pull_request_target/);
});

/* A deploy job as ci.yml has it on main once the site deploys to Cloudflare */
const CI = `on:\n  push:\n    branches: [main]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    environment:\n      name: production\n    steps:\n      - run: npx wrangler deploy\n        env:\n          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}\n`;
const job = (name, env, secret) => `  ${name}:\n    runs-on: ubuntu-latest\n${env ? `    environment: ${env}\n` : ''}    steps:\n      - run: echo\n        env:\n          T: \${{ secrets.${secret} }}\n`;

test('a test workflow naming either token elsewhere fails the check', () => {
  const base = { ...real, 'ci.yml': CI };
  assert.deepEqual(check(base), [], 'the Cloudflare deploy job alone passes');
  for (const [file, text, re] of [
    ['other.yml', `on:\n  push:\njobs:\n${job('build', 'production', 'CLOUDFLARE_API_TOKEN')}`, /other\.yml: job build names CLOUDFLARE_API_TOKEN/],
    ['ci.yml', CI + job('extra', 'production', 'CLOUDFLARE_API_TOKEN'), /ci\.yml: job extra names CLOUDFLARE_API_TOKEN/],
    ['ci.yml', CI.replace('    environment:\n      name: production\n', ''), /deploy names CLOUDFLARE_API_TOKEN without environment production/],
    ['e2e.yml', real['e2e.yml'] + job('leak', 'preview', 'CLOUDFLARE_PREVIEW_TOKEN'), /e2e\.yml: job leak names CLOUDFLARE_PREVIEW_TOKEN/],
    ['preview.yml', real['preview.yml'].replace('on:\n  pull_request:', 'on:\n  pull_request_target:'), /does not run on pull_request alone/],
    ['preview.yml', real['preview.yml'].replace('on:\n  pull_request:', 'on:\n  push:\n  pull_request:'), /does not run on pull_request alone/],
    ['other.yml', `on:\n  push:\njobs:\n${job('up', 'production', 'R2_SECRET_ACCESS_KEY')}`, /other\.yml: job up names R2_SECRET_ACCESS_KEY/],
    /* A # inside quotes is not a comment, so a secret after it is still seen */
    ['other.yml', `on:\n  push:\njobs:\n  quoted:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "a #b \${{ secrets.CLOUDFLARE_API_TOKEN }}"\n`, /other\.yml: job quoted names CLOUDFLARE_API_TOKEN/],
    ['other.yml', `on:\n  push:\njobs:\n  escaped:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "a \\" #b \${{ secrets.CLOUDFLARE_API_TOKEN }}"\n`, /other\.yml: job escaped names CLOUDFLARE_API_TOKEN/],
  ]) {
    const problems = check({ ...base, [file]: text });
    assert.ok(problems.some(p => re.test(p)), `${file}: ${problems.join(' | ') || 'no problem found'}`);
  }
});
