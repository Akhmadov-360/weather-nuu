import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        window: 'readonly',
        document: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    // The air-quality scale module must stay pure and portable: the map and
    // other projects take it as-is, so it may not reach into app layers or
    // UI frameworks.
    files: ['src/shared/lib/air-quality/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/entities/*', '@/features/*', '@/widgets/*', '@/pages/*', '@/app/*',
                // the same layers reached by a relative path
                '**/entities/**', '**/features/**', '**/widgets/**', '**/pages/**', '**/app/**',
              ],
              message: 'shared/lib/air-quality must stay pure: it cannot import from upper layers.',
            },
          ],
          paths: ['react', 'react-dom', 'react-i18next', 'i18next'].map((name) => ({
            name,
            message: 'shared/lib/air-quality must stay framework-free so it can be reused elsewhere.',
          })),
        },
      ],
    },
  },
);
