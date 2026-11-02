/* Every lint rule of task 1.7 fails on its fixture (openspec change react-typescript): tools/eslint-rules/fixtures/
   holds one file per rule, whose first line names the rules it must break and how often ("Expect: <rule> x3") or
   "Expect: nothing". Each is linted with the repo's own configs as if it were a file of the game (app/src/components/)
   or a legacy module (js/play/), so the rules' file scoping is tested too. */
import { test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import stylelint from 'stylelint';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const FIXTURES = join(ROOT, 'tools/eslint-rules/fixtures');
const eslint = new ESLint({ cwd: ROOT, overrideConfigFile: join(ROOT, 'eslint.config.js') });

/* What a fixture's first line expects: "Expect: <rule>[ xN], <rule>[ xN] (why)" or "Expect: nothing (why)" */
function expected(source: string): string[] {
  const head = (source.split('\n')[0] ?? '').replace(/^\s*(\/\/|\/\*)\s*/, '').replace(/\s*\*\/\s*$/, '');
  const m = head.match(/^Expect: ([^(]*)/);
  if (!m) throw new Error(`no "Expect:" line: ${head}`);
  return m[1]!.split(',').map(x => x.trim()).filter(x => x && x !== 'nothing').flatMap(x => {
    const [rule, times] = x.split(/\s+x/);
    return Array.from({ length: Number(times ?? 1) }, () => rule!);
  });
}

/* Where a fixture is linted as if it lived: a legacy module (js/play/), a component (app/src/components/), or, for
   <name>.engine.js and <name>.engine.ts, the engine file js/<name>.js or shared/src/<name>.ts (openspec change age-bands) */
const virtualPath = (file: string) => {
  const engine = file.match(/^(.+)\.engine\.(js|ts)$/);
  if (engine) return join(ROOT, engine[2] === 'js' ? 'js' : 'shared/src', `${engine[1]}.${engine[2]}`);
  return file.endsWith('.js') ? join(ROOT, 'js/play', file) : join(ROOT, 'app/src/components', file);
};

const files = readdirSync(FIXTURES).sort();

for (const file of files.filter(f => /\.(tsx?|js)$/.test(f))) {
  /* The first lint of a run loads every plugin and parser: well over the default 5 seconds on a busy machine */
  test(`ESLint: ${file}`, { timeout: 60_000 }, async () => {
    const source = readFileSync(join(FIXTURES, file), 'utf8');
    const [result] = await eslint.lintText(source, { filePath: virtualPath(file) });
    const fatal = result!.messages.filter(m => m.fatal);
    expect(fatal, 'the fixture parses').toEqual([]);
    expect(result!.messages.map(m => m.ruleId).sort()).toEqual(expected(source).sort());
  });
}

for (const file of files.filter(f => f.endsWith('.css'))) {
  test(`stylelint: ${file}`, async () => {
    const source = readFileSync(join(FIXTURES, file), 'utf8');
    const { results } = await stylelint.lint({ code: source, codeFilename: join(ROOT, 'app/src/components', file), configFile: join(ROOT, 'stylelint.config.js') });
    expect(results[0]!.warnings.map(w => w.rule).sort()).toEqual(expected(source).sort());
  });
}

test('every rule of task 1.7 has a fixture', () => {
  const all = files.flatMap(f => expected(readFileSync(join(FIXTURES, f), 'utf8')));
  for (const rule of ['react/no-danger', 'no-restricted-properties', 'lvm/server-safe', 'lvm/legacy-imports', 'react-hooks/rules-of-hooks',
    '@typescript-eslint/no-explicit-any', 'color-no-hex', 'function-disallowed-list', 'react/jsx-key', 'no-restricted-imports']) expect(all, rule).toContain(rule);
});
