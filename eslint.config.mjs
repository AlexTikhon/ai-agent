// @ts-check
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/generated/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/prisma/migrations/**',
    ],
  },

  // TypeScript files across all packages and apps
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [...tseslint.configs.recommended],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Spread prettier config rules to disable stylistic rules that conflict
      ...prettierConfig.rules,

      // Prettier as a linting rule
      'prettier/prettier': 'error',

      // TypeScript strictness
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',

      // Allow empty catch blocks in rare cases with a comment
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },

  // NestJS API: constructor parameter types require value imports for emitDecoratorMetadata.
  // Disabling type-import rules that produce false positives for DI-injected service classes.
  {
    files: ['apps/api/src/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-import-type-side-effects': 'off',
    },
  },

  // Relaxed rules for test files
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.test.tsx', '**/test-utils/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
