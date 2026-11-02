/* The copy table as Markdown (openspec change age-bands, task 3.2): one row per key of shared/src/copy.ts, a column per
   variant, for the owner to review the early and growing columns before release. Repo-only: never published.

   Usage: pnpm --filter tools copy-table   (or node --no-warnings tools/copy-table.ts), Markdown on stdout */
import { COPY, VARIANTS, linesOf, type CopyEntry, type Line } from '../shared/src/copy.ts';

const cell = (l: Line | undefined): string => (l === undefined ? '' : linesOf(l).map(t => t.replace(/\|/g, '\\|')).join(' / '));
const head = `| key | ${VARIANTS.join(' | ')} |\n| --- | ${VARIANTS.map(() => '---').join(' | ')} |`;
const rows = (Object.entries(COPY) as [string, CopyEntry][]).map(([key, e]) => {
  const v = e as Partial<Record<string, Line>>;
  return `| \`${key}\` | ${VARIANTS.map(x => cell(v[x])).join(' | ')} |`;
});
const count = Object.keys(COPY).length, early = rows.length, growing = (Object.values(COPY) as CopyEntry[]).filter(e => 'growing' in e).length;
process.stdout.write(`# Copy table (${count} keys, ${early} with an early variant, ${growing} with a growing variant)\n\nA line set is shown as its lines joined by " / ". Placeholders: {n} and {a} are counts said from a sentence template (shared/src/voice-text.ts), {r} a Rating.\n\n${head}\n${rows.join('\n')}\n`);
