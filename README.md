# PDF Review

PDF をバージョン管理し、版にコメントを付け、承認フローを通すマルチユーザー
Web アプリ（「PDF 版 GitHub」）。実装規約は同組織の姉妹リポ
`tokyogas-tech/panoptiplan-web` に準拠する。

- 線形バージョン + 承認ゲート（提出 → レビュー → 承認/差戻し → 正式版確定）
- 版単位のコメントスレッド
- 設定可能なロール（Owner/Submitter/Reviewer/Approver）と承認ポリシー

設計・タスクは [docs/PLAN.md](docs/PLAN.md) / [docs/TASKS.md](docs/TASKS.md) を参照。

## セットアップ

パッケージマネージャは **pnpm**（v10.33+）、Node.js は **v24**。

```bash
pnpm install        # 依存インストール（husky も準備される）
```

> DB / S3 / マイグレーション（docker compose、`.env.example` 等）は
> Phase 0 PR 0.4 以降で導入する（[docs/TASKS.md](docs/TASKS.md)）。

## 開発コマンド

```bash
pnpm dev            # server + client 同時起動（Phase 0 PR 0.4 以降）
pnpm build          # 全パッケージビルド
pnpm typecheck      # 全パッケージの型検査
pnpm lint           # ESLint
pnpm depcruise      # dependency-cruiser による依存方向の検査
pnpm format:check   # Prettier チェック
pnpm format         # Prettier 整形
pnpm test           # Small + Medium テスト
pnpm test:small     # Small テスト（Docker 不要）
pnpm test:medium    # Medium テスト（Docker 必要）
```

## 構成（モノレポ / pnpm workspaces）

| パッケージ | 役割                                    |
| ---------- | --------------------------------------- |
| `client`   | React 19 SPA（Vite + TanStack Router）  |
| `server`   | Hono API サーバー（Clean Architecture） |
| `shared`   | Zod スキーマによる API コントラクト     |
| `infra`    | インフラ定義（MVP では最小）            |

- サーバーは Clean Architecture + DDD（`shared-kernel` + 機能モジュールごとの
  `domain` / `application` / `adapters` + 共通 `infrastructure`）。
- クライアントは FSD（`app`/`pages`/`features`/`entities`/`shared`、`routes` は
  TanStack Router）。
- 依存方向は `.dependency-cruiser.js` で機械強制（CI でも検査）。

## コントリビューション

- 実装は **必ず PR を経由**（main 直コミット禁止）。Conventional Commits 必須
  （commitlint）。ブランチ名は `<type>/<description>`。
- PR は GitHub Copilot レビューを依頼し、指摘が収束＋CI 緑で rebase マージ。
- 詳細な実装規約は [`.claude/rules/`](.claude/rules/) と
  [CLAUDE.md](CLAUDE.md) を参照（こちらが正本）。
