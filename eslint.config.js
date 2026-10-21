/* ESLint for the workspace (openspec change react-typescript, task 1.7; design D7, D14, B1, B5).
   - TypeScript everywhere (app/src, workers/src, shared/src, tools): typescript-eslint's strict set.
   - The game (app/src): React and the React hooks rules with the React Compiler's rules, react/no-danger as an error,
     no innerHTML, outerHTML or insertAdjacentHTML (markup from content goes through one component, design B1), and
     lvm/server-safe in route modules and components (no page globals or Date.now() where a server render reaches
     them, design D14).
   - The legacy js/ files only for the import rule build.py enforces (lvm/legacy-imports), until they move.
   Local rules live in tools/eslint-rules/; each has a fixture that must fail (tools/test/lint-rules.test.ts). */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import lvm from './tools/eslint-rules/index.js';

const TS = ['app/src/**/*.{ts,tsx}', 'workers/src/**/*.ts', 'shared/src/**/*.ts', 'tools/**/*.ts', '*.config.ts', 'workers/*.config.ts'];
const APP = ['app/src/**/*.{ts,tsx}'];
/* Where a server render reaches: the root layout, route modules, views, shell pieces and shared components */
const RENDERED = ['app/src/root.tsx', 'app/src/routes/**/*.{ts,tsx}', 'app/src/views/**/*.{ts,tsx}', 'app/src/shell/**/*.{ts,tsx}', 'app/src/components/**/*.{ts,tsx}'];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**', '_site/**', '_dev/**', '_moved/**', '_preview/**', '.wrangler/**',
      'vendor/**', 'e2e/**', 'cloud/**', 'deploy/**', 'tools/voice/**', 'tools/sutra-voice/**', 'tools/brand/**',
      'tools/eslint-rules/fixtures/**', 'test/**', 'site/**', 'moved/**', 'theme/**', 'docs/**', 'openspec/**',
    ],
  },
  {
    files: TS,
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      // The node:test-style harnesses and fixtures read loosely typed objects; an `any` must say why where it is used
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Tests read what they just made: a non-null assertion there says "the setup put it there"
    files: ['**/*.test.ts', 'app/src/sw/harness.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    files: ['app/src/sw/**/*.ts'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  {
    files: ['workers/src/**/*.ts'],
    languageOptions: { globals: { ...globals.worker } },
  },
  {
    files: APP,
    ...react.configs.flat.recommended,
    ...react.configs.flat['jsx-runtime'],
    languageOptions: { ...react.configs.flat.recommended.languageOptions, globals: { ...globals.browser } },
    settings: { react: { version: '19.2' } },
  },
  {
    files: APP,
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'react/no-danger': 'error',
      'no-restricted-properties': ['error',
        { property: 'innerHTML', message: 'Render markup through the Markup component (design B1), never innerHTML.' },
        { property: 'outerHTML', message: 'Render markup through the Markup component (design B1), never outerHTML.' },
        { property: 'insertAdjacentHTML', message: 'Render markup through the Markup component (design B1), never insertAdjacentHTML.' },
      ],
    },
  },
  {
    files: RENDERED,
    plugins: { lvm },
    rules: { 'lvm/server-safe': 'error' },
  },
  {
    // Legacy modules: only the import rule (they keep their own style until they move to app/src)
    files: ['js/**/*.js'],
    plugins: { lvm },
    languageOptions: { sourceType: 'module', ecmaVersion: 'latest' },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: { 'lvm/legacy-imports': 'error' },
  },
  {
    files: ['tools/eslint-rules/*.js', 'eslint.config.js', 'stylelint.config.js', 'tools/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { sourceType: 'module', globals: { ...globals.node } },
  },
);
