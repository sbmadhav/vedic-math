/* lvm/legacy-imports (openspec change react-typescript, task 1.7): the one rule the legacy js/ files are linted for,
   the import rule python3 build.py enforces (CLAUDE.md): every static import or export ... from is a relative or
   absolute path that stays inside /js/, or (from task 3.1) a TypeScript module under /shared/src/ or /app/src/ that
   build.py publishes under /js/ts/ with its types taken out. A bare specifier would not be covered by the import map, a
   path outside /js/ would not be pinned, and a full URL would run code from another site. Dynamic import() is not
   checked (runtime URLs such as the vendored Firebase SDK are allowed there, marked with a @vite-ignore comment). */
import { posix } from 'node:path';

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Legacy modules import only paths inside /js/, or TypeScript modules the build publishes there (the build pins them in the import map)' },
    schema: [],
    messages: {
      url: "'{{spec}}' is a full URL: every module is served and pinned by this site.",
      bare: "'{{spec}}' is a bare import: the import map covers paths inside /js/ only.",
      outside: "'{{spec}}' resolves to {{resolved}}, outside the pinned /js/ modules and the TypeScript modules build.py publishes (/shared/src/, /app/src/).",
    },
  },
  create(context) {
    const file = context.filename.split('\\').join('/');
    const at = file.lastIndexOf('/js/');
    const self = at >= 0 ? file.slice(at) : null; // the module's own URL, /js/...
    function check(node) {
      if (!node.source || typeof node.source.value !== 'string') return;
      const spec = node.source.value;
      if (/^[a-z][a-z0-9+.-]*:/i.test(spec)) return context.report({ node: node.source, messageId: 'url', data: { spec } });
      if (!spec.startsWith('./') && !spec.startsWith('../') && !spec.startsWith('/')) return context.report({ node: node.source, messageId: 'bare', data: { spec } });
      const resolved = spec.startsWith('/') ? posix.normalize(spec) : self ? posix.normalize(posix.join(posix.dirname(self), spec)) : spec;
      const published = /^\/(shared|app)\/src\/.+\.ts$/.test(resolved) && !/\.(test|d)\.ts$/.test(resolved);
      if (!resolved.startsWith('/js/') && !published) context.report({ node: node.source, messageId: 'outside', data: { spec, resolved } });
    }
    return { ImportDeclaration: check, ExportNamedDeclaration: check, ExportAllDeclaration: check };
  },
};
