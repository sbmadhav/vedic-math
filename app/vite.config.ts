/* The game's build (openspec change react-typescript, task 1.2): app/index.html is the /play/ shell, js/app.js its
   entry (through src/main.ts), and Vite bundles today's modules into hashed files in /play/assets/. build.py runs it
   (python3 build.py --out DIR) and does the rest of the site; run alone it writes ../_vite/play/.

   Phase 1 keeps the legacy modules apart: every module in js/ is its own entry with its exports kept, so each is one
   hashed file (assets/js/<path>-<hash>.js) and loads the way it did before, one module per file. modules.json maps each
   source path (/js/store.js) to its built file; the Playwright suite uses it to reach the page's own module instances.
   The design system, theme, fonts, math.css and the classic scripts stay plain <link>s and <script>s (vite-ignore):
   build.py stamps and precaches them as before.

   Environment set by build.py:
     LVM_OUT            the output directory (the site root; the game goes to LVM_OUT/play/)
     LVM_OVERRIDES      JSON {"js/voice-index.js": "/path/to/replacement.js"}: a module's source replaced for this build
                        (build.py --voice off)
*/
import { defineConfig, type Plugin } from 'vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const JS = join(ROOT, 'js');
const BASE = '/play/';
/* Not bundled: analytics.js is a classic script every page loads; voice-worker.js is built as a worker by the
   new Worker(new URL(...)) in js/voice.js */
const NOT_ENTRIES = new Set(['js/analytics.js', 'js/voice-worker.js']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/* js/store.js -> { 'js/store': '/abs/js/store.js' } */
export function legacyEntries(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of walk(JS).sort()) {
    const rel = relative(ROOT, p).split('\\').join('/');
    if (!rel.endsWith('.js') || NOT_ENTRIES.has(rel)) continue;
    out[rel.slice(0, -3)] = p;
  }
  return out;
}

/* LVM_OVERRIDES: the replacement source for a module in this build */
function overrides(): Plugin {
  const map: Record<string, string> = JSON.parse(process.env.LVM_OVERRIDES || '{}');
  const byPath = new Map(Object.entries(map).map(([rel, file]) => [join(ROOT, rel), file]));
  return {
    name: 'lvm-overrides',
    enforce: 'pre',
    load(id) {
      const file = byPath.get(id.split('?')[0] ?? id);
      return file ? readFileSync(file, 'utf8') : null;
    },
  };
}

/* modules.json: { "/js/store.js": "/play/assets/js/store-<hash>.js", ... } for every legacy module and the voice worker */
function moduleMap(): Plugin {
  return {
    name: 'lvm-module-map',
    generateBundle(_options, bundle) {
      const map: Record<string, string> = {};
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk' && chunk.isEntry && chunk.facadeModuleId) {
          const rel = relative(ROOT, chunk.facadeModuleId).split('\\').join('/');
          if (rel.startsWith('js/')) map['/' + rel] = BASE + chunk.fileName;
        } else if (chunk.type === 'asset' && /(^|\/)voice-worker-[\w-]+\.js$/.test(chunk.fileName)) {
          map['/js/voice-worker.js'] = BASE + chunk.fileName;
        }
      }
      const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
      this.emitFile({ type: 'asset', fileName: 'modules.json', source: JSON.stringify(sorted, null, 1) + '\n' });
    },
  };
}

export default defineConfig(({ mode }) => ({
  root: import.meta.dirname,
  base: BASE,
  publicDir: false,
  plugins: [overrides(), moduleMap()],
  server: { fs: { allow: [ROOT] } },
  worker: {
    format: 'es',
    rolldownOptions: { output: { entryFileNames: 'assets/[name]-[hash].js', chunkFileNames: 'assets/[name]-[hash].js' } },
  },
  build: {
    outDir: join(process.env.LVM_OUT ? resolve(process.env.LVM_OUT) : join(ROOT, '_vite'), 'play'),
    emptyOutDir: false,
    manifest: true,
    target: 'esnext',
    minify: mode !== 'development',
    cssCodeSplit: true,
    assetsInlineLimit: 0,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 2000,
    rolldownOptions: {
      input: { index: join(import.meta.dirname, 'index.html'), ...legacyEntries() },
      /* every legacy module keeps all its exports (the suite and other modules use them) */
      preserveEntrySignatures: 'strict',
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
}));
