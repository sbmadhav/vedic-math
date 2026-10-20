import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE_URL } from '../playwright.config';

/* The medians of perf/interactions.ts: a table on the console and perf/results/interactions.json */
type Sample = { name: string; inp: number; visible: number };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

export default function report() {
  const file = join(__dirname, 'results', 'interactions.jsonl');
  if (!existsSync(file)) return;
  const samples = readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l) as Sample);
  const names = [...new Set(samples.map(s => s.name))];
  const out: Record<string, { runs: number; inp: number; visible: number; samples: { inp: number; visible: number }[] }> = {};
  for (const n of names) {
    const mine = samples.filter(s => s.name === n);
    out[n] = { runs: mine.length, inp: median(mine.map(s => s.inp)), visible: median(mine.map(s => s.visible)), samples: mine.map(({ inp, visible }) => ({ inp, visible })) };
  }
  writeFileSync(join(__dirname, 'results', 'interactions.json'), JSON.stringify({ base: BASE_URL, date: new Date().toISOString(), cpuSlowdown: 4, interactions: out }, null, 1) + '\n');
  console.log('\nInteraction medians (ms, 4x CPU):');
  for (const [n, v] of Object.entries(out)) console.log(`  ${n.padEnd(16)} inp ${String(v.inp).padStart(5)}  visible ${String(v.visible).padStart(5)}  (${v.runs} runs)`);
}
