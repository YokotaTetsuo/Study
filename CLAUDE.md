# CLAUDE.md

このファイルは Claude Code (claude.ai/code) がこのリポジトリで作業する際の指針です。
**この指示はデフォルト挙動より優先され、記載どおりに従うこと。**

## このリポジトリ

体験コンセプト **「思考の席」** を実装した単一の TypeScript ブラウザアプリ。
打った言葉が生き物になって画面を漂い、放置すると枯れ、クリックで水やりすると
息を吹き返す「考えたことの生態系」。**永続化しない**（リロードで消えるのは仕様）。

> 注: `README.md` 冒頭の pip / venv / 社内プロキシのメモは別作業の名残で、
> このアプリの動作には無関係。アプリは pnpm + Node のみで動く。

## セットアップ / 開発コマンド

パッケージマネージャは **pnpm**、Node.js は **v24**。

```bash
pnpm install
pnpm dev            # Vite 開発サーバ（ブラウザで開く）
pnpm build          # 型ビルド + Vite 本番ビルド
pnpm preview        # ビルド成果物をローカル配信
pnpm typecheck      # tsc --noEmit
pnpm lint           # ESLint
pnpm lint:fix       # ESLint --fix
pnpm format:check   # Prettier チェック
pnpm format         # Prettier 整形
pnpm test           # Vitest（1回実行）
pnpm test:watch     # Vitest watch

# 単一テスト実行
pnpm test <ファイルパス>
```

## アーキテクチャ

テスト容易性のため **純粋なシミュレーション層を描画から完全に分離** する。
これがこのリポの最重要設計方針。

```
src/
  main.ts          # DOM/入力/RAF ループの配線のみ（ロジックを持たない）
  sim/             # DOM・canvas に触れない純粋ロジック（単体テスト対象）
    rng.ts         # seed 付き決定的 RNG（注入可能）
    hash.ts        # text → 決定的 hue
    thought.ts     # Thought 型と純粋関数（create/step/water）
    world.ts       # 思考集合の管理（spawn/step/water/link/prune）
  render/
    renderer.ts    # canvas2D 描画のみ（薄く保つ。単体テスト対象外）
test/              # Vitest。sim 層を決定的にテスト
```

- `sim/` は **副作用なし**。乱数は `rng`、時間は明示 `dt` で注入し、テストを決定的にする。
- 新しいロジックは原則 `sim/` に置き、`render/` `main.ts` には状態やルールを持たせない。

## 規約

- **`as` 型アサーション禁止**: `.claude/rules/no-as-type-assertion.md` に従う。
  `as const` のみ可。ESLint (`@typescript-eslint/consistent-type-assertions`) で
  機械的に error 化されている。
- **TypeScript strict**: `tsconfig.json` の strict 系オプションを緩めない。
- **コミット**: Conventional Commits（`feat:`, `fix:`, `chore:`, `refactor:`,
  `docs:`, `test:` …）。
- **ブランチ名**: `<type>/<description>`。
- **品質ゲート**: TS を変更したら停止前に `pnpm typecheck` / `pnpm lint` /
  `pnpm test` がすべて通ること（Stop フックが自動で確認し、失敗時のみ block する）。
- **永続化を足さない**: localStorage 等で思考を保存しないこと（コンセプトの核）。

## 実装フロー（PR ベース）

実装は **必ず PR を経由** し、main へ直接コミットしない。

1. `<type>/<description>` ブランチを切って実装する。
2. ローカルで `pnpm typecheck` / `pnpm lint` / `pnpm format:check` / `pnpm test`
   / `pnpm build` をすべて通す。
3. push して PR を作成し、**GitHub Copilot にレビューを依頼**する
   （`gh pr edit <n> --add-reviewer copilot-pull-request-reviewer`、
   または Copilot review を request）。
4. Copilot の指摘をすべて反映し、再 push してレビューを再依頼する。
   **新規コメントが付かなくなるまで** これを繰り返す。
5. コメントが収束し、CI（typecheck/lint/format/test/build）が緑になったら
   **squash マージ**し、ブランチを削除する。
