// ESLint is deliberately SCOPED to Next.js Core Web Vitals rules ONLY.
//
// Biome (biome.json) owns formatting, general linting, React, and React-Hooks
// rules (its `react` + `next` domains cover useExhaustiveDependencies /
// useHookAtTopLevel). ESLint here adds only the @next/eslint-plugin-next
// Core Web Vitals checks that Biome's `next` domain does not yet implement
// (image/font/script/head correctness). Keeping the two non-overlapping
// avoids double-reporting and conflicting autofixes.
import nextPlugin from '@next/eslint-plugin-next';
import tseslint from 'typescript-eslint';

export default [
  {
    // ESLint is intentionally limited to Next.js Core Web Vitals here. Existing
    // source files may still carry disables for rules owned by Biome/TypeScript;
    // don't let those stale comments fail this narrow ESLint pass.
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'coverage/**',
      'media/**',
      'node_modules/**',
      'slidev-workspace/**',
      '_reusable/**',
      'dogfood-output/**',
      // generated
      'next-env.d.ts',
      'src/payload-types.ts',
      'src/app/(payload)/admin/importMap.js',
    ],
  },
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@next/next': nextPlugin,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Next.js recommended + Core Web Vitals escalations only.
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
];
