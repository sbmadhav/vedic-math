/* Types for the independent answer checker (verify.mjs), for the TypeScript tests that use it (openspec change
   react-typescript, task 3.1). Only what those tests call is declared. */
export interface Verdict { status: 'ok' | 'wrong' | 'skip' | 'ambiguous'; text?: string; expected?: unknown; why?: string }
export function plain(html: string): string;
export function verifyQuestion(item: { q: string; kind: string; answer?: unknown; choices?: unknown[]; fields?: unknown[] }): Verdict;
