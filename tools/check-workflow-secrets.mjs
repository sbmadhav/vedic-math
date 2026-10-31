/* CI check (openspec change learnvedicmath, deploy-pipeline spec; task 11.6): the deploy credentials are named only
   where they belong.
   - CLOUDFLARE_API_TOKEN (production): only by the `deploy` job of ci.yml, which uses the `production` environment.
   - R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY: only by the `voice-upload` job of ci.yml, environment `production`.
   - CLOUDFLARE_PREVIEW_TOKEN: only by the `preview` job of preview.yml, environment `preview`, in a workflow that runs
     on pull_request and never on pull_request_target (which would hand secrets to forks); and by the `reference` job of
     e2e.yml, environment `preview`, which uploads the pinned perf reference build after a deploy (openspec change
     perf-gate-same-runner-post-deploy, design D3) in a workflow with no pull request trigger at all, so only a push to
     main, the daily run or a run by hand from someone with write access ever reaches it.
     node tools/check-workflow-secrets.mjs [dir]     (default .github/workflows; exits 1 and names each problem)
   A tiny reader of the workflow files, enough for their shape: two-space indented job ids under `jobs:`. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/* Each secret's allowed places: the file, the job and the environment it must ask for; pullRequestOnly: the workflow
   runs on pull_request alone; noPullRequest: the workflow has no pull request trigger of either kind */
export const RULES = {
  CLOUDFLARE_API_TOKEN: [{ file: 'ci.yml', job: 'deploy', environment: 'production' }],
  R2_ACCESS_KEY_ID: [{ file: 'ci.yml', job: 'voice-upload', environment: 'production' }],
  R2_SECRET_ACCESS_KEY: [{ file: 'ci.yml', job: 'voice-upload', environment: 'production' }],
  CLOUDFLARE_PREVIEW_TOKEN: [
    { file: 'preview.yml', job: 'preview', environment: 'preview', pullRequestOnly: true },
    { file: 'e2e.yml', job: 'reference', environment: 'preview', noPullRequest: true },
  ],
};

const places = rules => rules.map(r => `${r.file} job ${r.job}`).join(' or ');

/* A line without its comment: a # at the start or after a space, outside quotes (so `echo "a #b ${{ secrets.X }}"` keeps
   its secret reference; \" inside double quotes does not end them) */
export function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '\\' && q === '"') i++; else if (c === q) q = null; }
    else if (c === '"' || c === "'") q = c;
    else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

/* { jobId: text of that job } for one workflow, plus the text before `jobs:`, with comments left out */
export function jobs(text) {
  const lines = text.split('\n').map(stripComment);
  const start = lines.findIndex(l => /^jobs:\s*$/.test(l));
  const out = { _head: lines.slice(0, start < 0 ? lines.length : start).join('\n') };
  let cur = null;
  for (const l of lines.slice(start + 1)) {
    const m = l.match(/^ {2}([\w-]+):\s*$/);
    if (m) { cur = m[1]; out[cur] = ''; continue; }
    if (cur) out[cur] += l + '\n';
  }
  return out;
}

const envOf = job => (job.match(/^ {4}environment:(?:[ \t]*\n {6}name:)?[ \t]*([\w-]+)/m) || [])[1];

export function check(files) {
  const problems = [];
  for (const [file, text] of Object.entries(files)) {
    const js = jobs(text);
    for (const [secret, rules] of Object.entries(RULES)) {
      const re = new RegExp(`secrets\\.${secret}\\b`);
      if (re.test(js._head)) problems.push(`${file}: ${secret} is named outside a job`);
      for (const [id, body] of Object.entries(js)) {
        if (id === '_head' || !re.test(body)) continue;
        const rule = rules.find(r => r.file === file && r.job === id);
        if (!rule) { problems.push(`${file}: job ${id} names ${secret}; only ${places(rules)} may`); continue; }
        if (envOf(body) !== rule.environment) problems.push(`${file}: job ${id} names ${secret} without environment ${rule.environment}`);
        if (rule.pullRequestOnly && (/pull_request_target/.test(js._head) || !/^\s*pull_request:/m.test(js._head) || /^\s*(push|workflow_dispatch|schedule):/m.test(js._head)))
          problems.push(`${file}: ${secret} is used by a workflow that does not run on pull_request alone (never pull_request_target)`);
        if (rule.noPullRequest && /pull_request/.test(js._head))
          problems.push(`${file}: ${secret} is used by a workflow with a pull request trigger; this job may only run on trusted events`);
      }
    }
  }
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const dir = process.argv[2] || '.github/workflows';
  const files = Object.fromEntries(readdirSync(dir).filter(f => /\.ya?ml$/.test(f)).map(f => [f, readFileSync(join(dir, f), 'utf8')]));
  const problems = check(files);
  for (const p of problems) console.error(`::error::${p}`);
  if (problems.length) process.exit(1);
  console.log(`workflow secrets: ${Object.keys(files).length} workflows checked, each deploy credential is named only by its own job`);
}
