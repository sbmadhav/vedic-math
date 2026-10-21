// Expect: lvm/legacy-imports x3 (a full URL, a bare specifier, a path outside /js/)
import { x } from 'https://cdn.example/x.js';
import { y } from 'lodash';
import { z } from '../../vendor/z.js';
import { ok } from './lib.js';
export { x, y, z, ok };
