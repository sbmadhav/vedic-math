/* Hindi-rule phonemes from eSpeak NG (wasm build) for the comparison set, written to espeak-hi.json.
   A separate step because the eSpeak runtime stays alive after it runs and slows the Kokoro run down.
   Mapped to Kokoro's symbols the way its Hindi pipeline does (tʃ to ʧ, dʒ to ʤ, ɦ to h). Run: node espeak-hi.mjs */
import { writeFileSync } from 'node:fs';
import ESpeakNg from 'espeak-ng';
import { NAMES } from './names.mjs';
import { toDeva } from './sanskrit.mjs';
const out = {};
for (const n of NAMES) {
  const e = await ESpeakNg({ arguments: ['--phonout', 'out', '-q', '--ipa=1', '-v', 'hi', toDeva(n.say)] });
  out[n.id] = e.FS.readFile('out', { encoding: 'utf8' }).trim().replace(/\n/g, ' ').replace(/_/g, '').replace(/tʃ/g, 'ʧ').replace(/dʒ/g, 'ʤ').replace(/ɦ/g, 'h').replace(/̪/g, '');
}
writeFileSync(new URL('./espeak-hi.json', import.meta.url), JSON.stringify(out, null, 1));
process.exit(0);
