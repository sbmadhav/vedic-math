/* The service worker's build (openspec change react-typescript, task 1.4; design D9): app/src/sw/sw.ts to one classic
   script at the site root, /sw.js (registered by js/app.js with scope /play/). Not minified, so the published worker
   reads like its source. tools/vite-plugin-precache.ts fills VERSION and PRECACHE from the game's build (python3
   build.py runs this after the game's build and sets LVM_OUT, LVM_APP_MANIFEST and LVM_PRECACHE_EXTRA). */
import { defineConfig } from 'vite';
import { join, resolve } from 'node:path';
import precache from '../tools/vite-plugin-precache.ts';

const ROOT = resolve(import.meta.dirname, '..');

export default defineConfig({
  root: import.meta.dirname,
  publicDir: false,
  plugins: [precache()],
  build: {
    outDir: process.env.LVM_OUT ? resolve(process.env.LVM_OUT) : join(ROOT, '_vite'),
    emptyOutDir: false,
    copyPublicDir: false,
    target: 'esnext',
    minify: false,
    reportCompressedSize: false,
    rolldownOptions: {
      input: join(import.meta.dirname, 'src/sw/sw.ts'),
      /* the 'dev', KILL and live branches all stay: the published file is the worker as written */
      treeshake: false,
      output: { format: 'es', entryFileNames: 'sw.js', codeSplitting: false },
    },
  },
});
