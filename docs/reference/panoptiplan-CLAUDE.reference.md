> **参照用・原文ママ（編集しない）**: 本ファイルは tokyogas-tech/panoptiplan-web の
> `CLAUDE.md` をそのまま保存したもの。PR 0.3 で本リポの `CLAUDE.md` を整備する際の手本。
> **本プロジェクトでの差分（取り込み時に必ず反映すること）**:
> - `repo-settings`(Pulumi) パッケージは **対象外（作らない）**。モノレポ構成表に含めない。
> - `infra` は MVP では最小に留める。
> - 認証 `auth/` モジュールは panoptiplan に無い本リポ独自（Clean Architecture 準拠）。
> - 規約の正本は本リポ `.claude/rules/` 配下。テストの Large/E2E は本リポ Phase 6.3〈任意〉。
>
> 詳細は `docs/PLAN.md` / `docs/TASKS.md` を参照。

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ドキュメント

- `docs/current/` — 現行の仕様書。コードとの齟齬があれば指摘すること。
- `docs/archive/` — 過去の仕様書。参考情報として参照してよいが、現実のコードとの齟齬について修正を提案しないこと。

## セットアップ

```bash
pnpm install
cp .env.example .env        # デフォルト値のままで動作する
docker compose up -d         # PostgreSQL 17 + RustFS（S3 互換）起動
pnpm --filter server db:migrate  # マイグレーション適用
```

環境変数（`.env`）:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — PostgreSQL 接続情報（デフォルト: localhost:5432, panoptiplan/panoptiplan）
- `PORT` — サーバーポート（デフォルト: 3000、省略可）
- `S3_ENDPOINT` — S3 互換エンドポイント（ローカル: `http://localhost:9000`、本番: 省略で SDK デフォルト）
- `S3_REGION`, `S3_BUCKET` — S3 リージョンとバケット名
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — S3 認証情報（本番: 省略で IAM ロール）
- `S3_FORCE_PATH_STYLE` — パススタイルアクセス（ローカル: `true`、本番: `false`）

## 開発コマンド

パッケージマネージャは **pnpm**（v10.33+）、Node.js は **v24**。

```bash
pnpm dev                    # server + client 同時起動
pnpm build                  # 全パッケージビルド
pnpm lint                   # ESLint
pnpm format:check           # Prettier
pnpm typecheck              # 全パッケージの型検査
pnpm depcruise              # dependency-cruiser によるアーキテクチャ違反検出
pnpm test                   # Small + Medium テスト
pnpm test:small             # Small テスト（Docker 不要）
pnpm test:medium            # Medium テスト（Docker 必要）

# 単一テスト実行
pnpm --filter server vitest run <ファイルパス>

# DB マイグレーション
pnpm --filter server db:generate   # マイグレーション生成
pnpm --filter server db:migrate    # マイグレーション適用
```

## モノレポ構成

pnpm workspaces による5パッケージ構成。

| パッケージ      | 役割                                    |
| --------------- | --------------------------------------- |
| `client`        | React 19 SPA（Vite + TanStack Router）  |
| `server`        | Hono API サーバー（Clean Architecture） |
| `shared`        | Zod スキーマによる API コントラクト     |
| `infra`         | インフラ定義                            |
| `repo-settings` | Pulumi による GitHub リポジトリ設定 ← **本リポでは対象外（作らない）** |

**依存方向**: `client` → `shared` ← `server`。client から server への import は型のみ許可（Hono RPC の `AppType`）。

## サーバーアーキテクチャ（Clean Architecture + DDD）

`server/src/` は Clean Architecture + DDD をベースにした構成で、依存は外側→内側の一方向のみ：

- **shared-kernel/** — 複数コンテキストで共有するドメイン基盤と、汎用性の高いインフラ抽象ポート（例: `DomainError` などのエラー基盤、`IdGenerator`、`Clock`、`FileStorage` などのポートインターフェース）を置く。各モジュール固有のポートは shared-kernel には置かず、それぞれの責務に応じて domain 層または application 層に配置する。
- 各機能モジュール（`health/`, `project/` など）配下には次の3層がある：
  1. **domain/** — エンティティ、値オブジェクト（ProjectId, ProjectName）、リポジトリインターフェース
  2. **application/** — ユースケース、Result DTO、コンテキスト固有のポート
  3. **adapters/** — コントローラー（Hono ルート定義）、ゲートウェイ（リポジトリ実装）
- **infrastructure/** は `server/src/infrastructure/` に共通配置され、DB 接続、HTTP 設定、DI コンテナ（`composition/container.ts`）、エントリーポイントを担う。

## クライアントアーキテクチャ

FSD（Feature-Sliced Design）を参考にしたレイヤー構成：

- `app/` — プロバイダー、テーマ、ルーター設定
- `pages/` — ページコンポーネント
- `features/` — ユーザー操作・ビジネスアクション（案件作成など）
- `entities/` — ドメイン概念に対応するクエリオプション・UI 表現
- `routes/` — TanStack Router のファイルベースルーティング（`routeTree.gen.ts` は自動生成）
- `shared/` — API クライアント（Hono RPC）、共通ユーティリティ

UI は MUI v9。サーバー状態管理は TanStack React Query。

## 規約

- **コミット**: Conventional Commits 必須（commitlint で検証）
- **ブランチ名**: `<type>/<description>`（feat/, fix/, chore/, refactor/, docs/）
- **エラー応答**: RFC 7807 Problem Details 形式（`application/problem+json`）
- **バリデーション**: API 境界で Zod スキーマ検証。ドメイン層では値オブジェクトのコンストラクタで検証
- **ID**: ULID を使用
- **dependency-cruiser**: `.dependency-cruiser.js` で層間・パッケージ間の依存違反を検出。CI でもチェックされる
- **pre-commit フック**: ESLint --fix + Prettier 自動整形 + commitlint
- **テスト**: 新規実装には必ず対応するテスト（原則 Small）を併せて書く。サイズ分類・層別戦略・命名・Builder 等の詳細は `.claude/rules/testing.md` を参照

## レビュー規約

- PRレビュー時、クライアントコード（`client/src/`）の変更が含まれる場合は `fsd-review` スキルを実行すること
