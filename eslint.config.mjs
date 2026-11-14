// @ts-check
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/.playwright-report/**'] },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.mts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-constant-condition': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'e2e/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  prettier,
];
