/**
 * ESLint 9 flat config for La French Tech Denver.
 *
 * Two layers:
 *
 *   1. `eslint-plugin-astro`'s recommended config — covers `.astro` template
 *      and frontmatter linting (unused imports, accessibility hints, parser
 *      wiring for the JS-in-Astro tooling, etc.).
 *
 *   2. `typescript-eslint`'s recommended config — covers `.ts` files
 *      (Playwright specs, content-collection schemas, the Astro config).
 *      We keep the strict variant off because the codebase is small and
 *      the recommended set already catches the bugs we care about.
 *
 * Globs intentionally exclude `dist/`, `.astro/`, `node_modules/`,
 * `playwright-report/`, `test-results/`, and `.lighthouseci/` — those
 * are build artifacts or third-party caches.
 */
import eslintPluginAstro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      '.lighthouseci/**',
      'pnpm-lock.yaml',
    ],
  },
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    files: ['**/*.{ts,mts,cts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Playwright specs commonly use `any` in `evaluate(() => ...)` browser
      // context returns; warn rather than fail so it stays in our radar
      // without blocking PRs.
      '@typescript-eslint/no-explicit-any': 'warn',
      // The frontmatter for content collections occasionally re-declares the
      // same variable names; `no-unused-vars` is too aggressive for a small
      // brochure site.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
