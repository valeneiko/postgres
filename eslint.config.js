import eslint from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import n from 'eslint-plugin-n';
import oxlint from 'eslint-plugin-oxlint';
import promise from 'eslint-plugin-promise';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactPerf from 'eslint-plugin-react-perf';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    name: 'import',
    extends: [importPlugin.flatConfigs.recommended, importPlugin.flatConfigs.typescript],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
  unicorn.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  {
    name: 'react-settings',
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  reactHooks.configs.flat['recommended-latest'],
  // oxlint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
  reactPerf.configs.flat.recommended,
  // oxlint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
  jsxA11y.flatConfigs.recommended,
  n.configs['flat/recommended'],
  {
    name: 'node',
    rules: {
      'n/no-extraneous-import': 'off',
    },
  },
  // oxlint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
  promise.configs['flat/recommended'],
  {
    files: ['**/*.test.ts'],
    ...vitest.configs.recommended,
  },
  {
    name: 'override-ts',
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allow: [{ name: ['Error', 'URL', 'URLSearchParams'], from: 'lib' }],
          allowAny: true,
          allowBoolean: true,
          allowNever: false,
          allowNullish: true,
          allowNumber: true,
          allowRegExp: true,
        },
      ],
      '@typescript-eslint/no-unnecessary-condition': [
        'error',
        {
          allowConstantLoopConditions: 'only-allowed-literals',
        },
      ],
    },
  },
  {
    name: 'override-test',
    files: ['**/*.test.ts'],
    rules: {
      'unicorn/consistent-function-scoping': 'off',
    },
  },
  {
    name: 'override-bench',
    files: ['**/*.bench.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  {
    name: 'custom',
    rules: {
      '@typescript-eslint/no-misused-spread': 'off',
      'unicorn/import-style': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/prefer-ternary': 'off',
      'unicorn/prefer-switch': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-new-array': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-hex-escape': 'off',
      'unicorn/prefer-code-point': 'off',
      'unicorn/number-literal-case': 'off',
      'react/react-in-jsx-scope': 'off',
      'promise/catch-or-return': 'off',
      'n/no-missing-import': 'off',
      'no-empty': 'off',
      'no-constant-condition': ['error', { checkLoops: false }],
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
      '@typescript-eslint/no-this-alias': ['error', { allowDestructuring: true }],
      '@typescript-eslint/prefer-literal-enum-member': [
        'error',
        { allowBitwiseExpressions: false },
      ],
      '@typescript-eslint/no-invalid-void-type': [
        'off',
        {
          allowAsThisParameter: true,
          allowInGenericTypeArguments: true,
        },
      ],
    },
  },
  prettier,
  /**
   * Disable rules covered by Biome
   */
  {
    name: 'biome-eslint-config',
    rules: {
      curly: 'off',
      'no-misleading-character-class': 'off',
      'prefer-const': 'off',
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unified-signatures': 'off',
      'jsx-a11y/no-interactive-element-to-noninteractive-role': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/interactive-supports-focus': 'off',
      'jsx-a11y/aria-proptypes': 'off',
      'unicorn/no-for-loop': 'off',
    },
  },
  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json', { typeAware: true }),
  {
    ignores: ['**/dist/', '**/.tanstack/', '**/coverage/', '**/*.d.ts'],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      ecmaVersion: 2024,
      globals: {
        ...globals.nodeBuiltin,
      },
      parserOptions: {
        allowAutomaticSingleRunInference: true,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
