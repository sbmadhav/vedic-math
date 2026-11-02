/* VoiceLedger (workers/src/ledger.ts): one Durable Object counts every paid endpoint's turns, strongly consistent, each
   row gone when its period ends (openspec family-helpers design D18, tasks 3.7 and 3.12; react-typescript design D16).
   Runs inside the Workers runtime with the SQLite-backed Durable Object the vitest config declares. */
import { test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { HOUR_MS, ledgerOf, periods } from './ledger.ts';

const T0 = Date.UTC(2026, 10, 3, 10, 15); /* 2026-11-03 10:15 UTC */
const tag = () => Math.random().toString(36).slice(2, 8); /* each test its own keys: the Durable Object is shared */

test('take counts every counter at once, and refuses at the limit without counting any', async () => {
  const L = ledgerOf(env), k = tag(), p = periods(T0);
  const wants = [{ key: `a:${k}`, limit: 2, expires: p.hourEnd }, { key: `b:${k}`, limit: 5, expires: p.dayEnd }];
  expect(await L.take(wants, T0)).toBeNull();
  expect(await L.take(wants, T0)).toBeNull();
  expect(await L.take(wants, T0)).toBe(`a:${k}`);
  expect(await L.count(`a:${k}`, T0)).toBe(2);
  expect(await L.count(`b:${k}`, T0)).toBe(2); /* the refused take counted nothing */
});

test('a count is deleted when its period ends: the next hour starts afresh', async () => {
  const L = ledgerOf(env), k = tag(), p = periods(T0);
  for (let i = 0; i < 3; i++) await L.take([{ key: `h:${k}`, limit: 3, expires: p.hourEnd }], T0);
  expect(await L.take([{ key: `h:${k}`, limit: 3, expires: p.hourEnd }], T0 + 10)).toBe(`h:${k}`);
  const later = p.hourEnd + 1, q = periods(later);
  expect(await L.keys(later)).not.toContain(`h:${k}`);
  expect(await L.take([{ key: `h:${k}`, limit: 3, expires: q.hourEnd }], later)).toBeNull();
  expect(await L.count(`h:${k}`, later)).toBe(1);
});

test('a cap load test: 1,300 turns at once never pass a limit of 1,250', async () => {
  const L = ledgerOf(env), k = tag(), p = periods(T0);
  const results = await Promise.all(Array.from({ length: 1300 }, () => L.take([{ key: `day:${k}`, limit: 1250, expires: p.dayEnd }], T0)));
  expect(results.filter(r => r === null).length).toBe(1250);
  expect(results.filter(r => r === `day:${k}`).length).toBe(50);
  expect(await L.count(`day:${k}`, T0)).toBe(1250);
});

test('periods: the hour, the UTC day and the month, each with its end', () => {
  const p = periods(T0);
  expect(p.day).toBe('2026-11-03');
  expect(p.month).toBe('2026-11');
  expect(p.hourEnd - T0).toBe(45 * 60_000);
  expect(p.hourEnd % HOUR_MS).toBe(0);
  expect(new Date(p.dayEnd).toISOString()).toBe('2026-11-04T00:00:00.000Z');
  expect(new Date(p.monthEnd).toISOString()).toBe('2026-12-01T00:00:00.000Z');
  expect(periods(Date.UTC(2026, 11, 31, 23, 59)).monthEnd).toBe(Date.UTC(2027, 0, 1));
});
