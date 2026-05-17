import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // docs/ は panoptiplan からの参照用設定サンプル等を含む。
    // 現行プロジェクトの tsconfig 配下ではないため lint/型検査の対象外とする。
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'docs/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // .claude/rules/no-as-type-assertion.md の機械強制。
      // assertionStyle: 'never' は `as` / angle-bracket の型アサーションを全面禁止する。
      // ただし `const` アサーション（`as const`）は consistent-type-assertions の
      // 仕様上、style 設定に関わらず常に許可されるため、ルールに従い `as const` は使用可。
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // 設定ファイル（JS）は型情報を使わずに lint する。
    // flat config として曖昧さのないよう、disableTypeChecked を files 付きで spread する。
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
