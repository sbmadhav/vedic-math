/* What the game sends and reads (openspec change react-typescript, task 3.1; design D11): the World board entry
   js/cloud.js writes to Firestore, and the rows a Board shows. Types and the field list only. cloud/firestore.rules is
   the authority on what is accepted; shared/src/messages.test.ts checks ENTRY_FIELDS against it. Nothing else about
   a Player is ever sent (docs/adr/0002, docs/adr/0006). */

/* boards/<board>/scores/<uid>: one entry per Player's identity per board */
export interface BoardEntry {
  /* A generated Nickname (names.ts), never typed */
  name: string;
  /* One of AVATARS (names.ts) */
  avatar: string;
  /* boardScore() of the result (scoring.ts) */
  score: number;
  /* The server's time of the write (a Firestore server timestamp) */
  ts: unknown;
  /* When the entry expires, KEEP_DAYS ahead (a Firestore timestamp); the TTL policy deletes it after */
  exp: unknown;
}
/* Every field an entry holds, in the order js/cloud.js writes them; the rules accept exactly these */
export const ENTRY_FIELDS = ['name', 'avatar', 'score', 'ts', 'exp'] as const satisfies readonly (keyof BoardEntry)[];

/* What a caller hands js/cloud.js submit(): only the nickname and color are sent with the score */
export interface EntryInput { name: string; avatar: string; score: number }

/* A row of a World board as the game shows it: me marks the Player's own entry (known only on their device) */
export interface BoardRow { name: string; avatar: string; score: number; me: boolean }

/* Board ids: daily-2026-10-12-challenger, week-2026-W42-challenger, g_<game>-daily-..., xp-week-2026-W42-pro */
export type BoardId = string;
