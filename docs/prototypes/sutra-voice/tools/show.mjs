/* Prints every name with its Devanagari, respelling and Kokoro phonemes: node show.mjs */
import { NAMES } from './names.mjs';
import { toDeva, toIPA, respell } from './sanskrit.mjs';
for (const n of NAMES) console.log([n.id, toDeva(n.say), n.iast, respell(n.say), toIPA(n.say)].join(' | '));
