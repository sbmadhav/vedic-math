// Expect: no-restricted-imports x2 (the engine never imports the band or copy modules, openspec change age-bands, design decision 5; linted as js/adapt.js)
import { bandOf } from '../shared/src/bands.ts';
import { copyFor } from '../shared/src/copy.ts';
import * as store from './store.js';

export const start = () => (bandOf(store.player().reading) === 'early' ? 1 : 5) + copyFor('x').length;
