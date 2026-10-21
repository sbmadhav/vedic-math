/* This repo's own ESLint rules, as one plugin (lvm/...). Each has a fixture in fixtures/ that must fail as expected
   (tools/test/lint-rules.test.ts). */
import serverSafe from './server-safe.js';
import legacyImports from './legacy-imports.js';

export default {
  meta: { name: 'lvm' },
  rules: { 'server-safe': serverSafe, 'legacy-imports': legacyImports },
};
