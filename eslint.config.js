// Análise estática: ESLint + typescript-eslint + SonarJS (regras do SonarQube).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'reports', 'node_modules', '.stryker-tmp', 'docs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // Complexidade
      complexity: ['warn', { max: 5 }], // complexidade ciclomática por função
      'sonarjs/cognitive-complexity': ['warn', 8],
      'max-depth': ['warn', 2],
      'max-params': ['warn', 4],
      'max-lines-per-function': ['warn', { max: 30, skipBlankLines: true, skipComments: true }],
      // Boas práticas
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': ['warn', 'always'],
      'no-else-return': 'warn',
      '@typescript-eslint/no-magic-numbers': [
        'warn',
        { ignore: [0, 1], ignoreReadonlyClassProperties: true, ignoreEnums: true },
      ],
      // Nomenclatura
      'id-length': ['warn', { min: 2, exceptions: ['_', 'i'] }],
      '@typescript-eslint/naming-convention': [
        'warn',
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
      ],
    },
  },
  {
    // Scripts de desenvolvimento (Node): executam `npx` localmente por design.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
    rules: { 'sonarjs/no-os-command-from-path': 'off' },
  },
  {
    // Nos testes, números literais são os próprios dados de teste (valores-limite).
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
      'max-lines-per-function': 'off',
    },
  },
);
