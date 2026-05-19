// 本ファイル限定の lint 無効化。アプリコードでは各ルール有効のまま。
// - no-unsafe-argument: `eslint/config` の defineConfig と typescript-eslint の
//   フラット設定配列の型定義差による誤検知（設定値は妥当な ESLint 設定）。
/* eslint @typescript-eslint/naming-convention: "off", import-x/no-named-as-default-member: "off", @typescript-eslint/no-unsafe-argument: "off" */
import { defineConfig } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/dist/',
      '**/node_modules/',
      '**/coverage/',
      '.dependency-cruiser.js',
      '.husky/**',
      // Claude Code エージェントの作業用 git worktree。リポジトリ本体の
      // 配下に作られるため、無視しないと eslint . が全 worktree を走査し
      // OOM する。lint 対象外（各 worktree 内で個別に lint される）。
      '.claude/worktrees/**',
      '**/routeTree.gen.ts',
      // panoptiplan からの参照用サンプル（原文ママ保持・現行 tsconfig 配下外）
      'docs/reference/**',
    ],
  },
  ...tseslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  prettierConfig,
  {
    languageOptions: {
      parserOptions: {
        // ルートの設定ファイル（eslint/vitest）はどの package tsconfig にも
        // 含まれないため、strict 設定を持つ tsconfig.eslint.json を
        // default project として割り当てて型情報付き lint の対象に含める。
        projectService: {
          allowDefaultProject: [
            'eslint.config.ts',
            'vitest.config.ts',
            'server/drizzle.config.ts',
          ],
          defaultProject: 'tsconfig.eslint.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/naming-convention': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      eqeqeq: 'error',
      'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      'import-x/no-duplicates': 'error',
      'import-x/no-unresolved': 'error',
      'import-x/order': [
        'error',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
      'no-console': 'error',
    },
  },
  {
    files: ['client/**/*.{ts,tsx}'],
    settings: {
      'import-x/resolver': {
        typescript: {
          project: 'client/tsconfig.json',
        },
      },
    },
  },
  {
    files: ['client/src/**/*.tsx'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
      ],
    },
  },
);
