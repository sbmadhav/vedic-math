// Expect: lvm/legacy-imports x5 (a full URL, a bare specifier, a path outside /js/, a test, a TypeScript file build.py does not publish)
import { x } from 'https://cdn.example/x.js';
import { y } from 'lodash';
import { z } from '../../vendor/z.js';
import { t } from '../../shared/src/lib.test.ts';
import { w } from '../../workers/src/csp.ts';
import { ok } from './lib.js';
import { ts } from '../../shared/src/lib.ts';
export { x, y, z, t, w, ok, ts };
