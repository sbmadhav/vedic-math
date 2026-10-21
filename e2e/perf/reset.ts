import { rmSync } from 'node:fs';
import { join } from 'node:path';

/* Each run of perf/interactions.ts starts with no samples and no report from an earlier one */
export default function reset() {
  rmSync(join(__dirname, 'results', 'interactions.jsonl'), { force: true });
  rmSync(join(__dirname, 'results', 'interactions.json'), { force: true });
}
