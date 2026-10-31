/* Nicknames and avatar colors (moved from js/store.js, openspec change react-typescript, task 3.1). Nicknames are
   generated from these fixed word lists, never typed, so no personal information is ever collected.
   cloud/firestore.rules accepts only a name made from the same lists (shared/src/names.test.ts checks they agree),
   and a Duel's server can check a name the same way (isNickname). */

export const ADJ = ['Swift', 'Clever', 'Mighty', 'Cosmic', 'Brave', 'Lucky', 'Sunny', 'Zippy', 'Witty', 'Bold', 'Jolly', 'Turbo', 'Nimble', 'Sparky', 'Quiet', 'Rapid'];
export const NOUN = ['Tiger', 'Falcon', 'Otter', 'Panda', 'Comet', 'Rocket', 'Koala', 'Dolphin', 'Phoenix', 'Lynx', 'Gecko', 'Orca', 'Yak', 'Robin', 'Badger', 'Narwhal'];
export const AVATARS = ['coral', 'teal', 'sun', 'sky', 'plum'];

/* A Nickname: an adjective, a noun and a number from 10 to 99, like "Swift Tiger 42" */
export const makeName = (): string => `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${NOUN[Math.floor(Math.random() * NOUN.length)]} ${String(Math.floor(Math.random() * 90) + 10)}`;
export const NAME_RE = /^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/;
/* A name made from the lists, as cloud/firestore.rules checks it: at most 24 characters, the form, and both words */
export const isNickname = (name: unknown): boolean => {
  if (typeof name !== 'string' || name.length > 24 || !/^[A-Z][a-z]+ [A-Z][a-z]+ [1-9][0-9]$/.test(name)) return false;
  const [a, n] = name.split(' ');
  return ADJ.includes(a as string) && NOUN.includes(n as string);
};
