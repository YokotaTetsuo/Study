# CLAUDE.md

このファイルは Claude Code (claude.ai/code) がこのリポジトリで作業する際の指針です。
**この指示はデフォルト挙動より優先され、記載どおりに従うこと。**

## このリポジトリ

**PDF Review** — PDF をバージョン管理し、版にコメントを付け、承認フローを通す
マルチユーザー Web アプリ（「PDF 版 GitHub」）。実装規約は同組織の姉妹リポ
`tokyogas-tech/panoptiplan-web` に準拠する。

> 旧「思考の席」アプリは破棄済み。**永続化は必須**（旧コンセプトの非永続方針は無効）。

## ドキュメント

- `docs/PLAN.md` — 設計計画（技術選定/構成/依存ルール/ドメインモデル/フェーズ）
- `docs/TASKS.md` — フェーズを PR 単位へ分解したタスク一覧。実装はこれに沿う
- `.claude/rules/` — 実装規約の**正本**（後述。コードとの齟齬は規約を優先し指摘）
- `docs/reference/` — panoptiplan 由来の参照用設定サンプル（原文ママ・編集しない）

## セットアップ / 開発コマンド

パッケージマネージャは **pnpm**（v10.33+）、Node.js は **v24**。

```bash
pnpm install                # 依存インストール（husky も準備される）

pnpm dev                    # server + client 同時起動（要 DB/S3。下記参照）
pnpm build                  # 全パッケージビルド
pnpm typecheck              # 全パッケージの型検査
pnpm lint                   # ESLint
pnpm depcruise              # dependency-cruiser によるアーキテクチャ違反検出
pnpm format:check           # Prettier チェック
pnpm format                 # Prettier 整形
pnpm test                   # Small + Medium テスト
pnpm test:small             # Small テスト（Docker 不要）
pnpm test:medium            # Medium テスト（Docker 必要）
```

### ローカルで動かす（DB / S3 含む全機能）

`pnpm dev` を含む全機能には PostgreSQL + S3 互換ストレージが要る。
サーバは起動時に `ensureBucket`（S3）を待つため **S3 が無いと起動自体
できない**。`/health` は `SELECT 1` で DB 到達性を見て `db: up/down`
を返す（DB が落ちていても `db: down` で応答可能）。S3 は health
ハンドラ自体では使わない。それ以外の機能には DB も必須。既定値
（`.env.example`）のまま動く。

```bash
cp .env.example .env                      # 既定: DB_PORT=5432 / S3 :9000
docker compose up -d --wait               # postgres healthy まで待機して起動
                                          #   （rustfs は healthcheck 無し）
curl -s -o /dev/null http://localhost:9000 # rustfs 疎通（CI と同じく -f
                                           #  無し。server 起動時に
                                           #  ensureBucket が走るため）
pnpm --filter @pdf-review/server db:migrate  # マイグレーション適用（0000〜）
pnpm dev                                  # server :3000 / client :5173
docker compose down                       # 停止（データは volume に保持）
```

#### ローカル実行 Tips（ハマりどころ）

- **Docker ランチャーが Rancher Desktop の場合**: `docker info` が失敗するときは
  daemon が落ちている既定コンテキストを見ている可能性がある。
  `docker context ls` で `rancher-desktop` が UP なら
  `docker context use rancher-desktop` に切り替える（Docker Desktop なら
  `desktop-linux`）。`pnpm test:medium` / Medium テストも同様に有効な
  コンテキストが必要。
- **`db:migrate` は `.env` を読まない**: `drizzle-kit migrate` は
  `--env-file` を介さず `process.env` の既定（host=localhost /
  port=5432 / user=pass=db=pdfreview）で接続する。`.env.example` の
  既定と一致するため通常は追加指定不要。ただし `.env` で `DB_PORT` 等を
  既定から変更した場合（例: 5432 が使用中で別ポートにした）は、
  `DB_PORT=xxxx pnpm --filter @pdf-review/server exec drizzle-kit migrate`
  のように接続情報を環境変数で明示する。
  `pnpm --filter @pdf-review/server dev` は `--env-file=../.env` 付きなので
  問題ない。
- **シード未実装**（`docs/TASKS.md` PR 6.2）。初回 DB は空なので、
  画面の登録から作る（承認フロー確認用に owner / approver / reviewer の
  複数アカウント推奨）。

## モノレポ構成

pnpm workspaces による 4 パッケージ構成。

| パッケージ | 役割                                    |
| ---------- | --------------------------------------- |
| `client`   | React 19 SPA（Vite + TanStack Router）  |
| `server`   | Hono API サーバー（Clean Architecture） |
| `shared`   | Zod スキーマによる API コントラクト     |
| `infra`    | インフラ定義（**MVP では最小**）        |

**依存方向**: `client` → `shared` ← `server`。client から server への import は
型のみ許可（Hono RPC の `AppType`）。panoptiplan の `repo-settings`(Pulumi) は
**本リポでは対象外**（作らない）。

## サーバーアーキテクチャ（Clean Architecture + DDD）

`server/src/` は Clean Architecture + DDD をベースにした構成で、依存は外側→内側の
一方向のみ（dependency-cruiser が機械強制）：

- **shared-kernel/** — 複数コンテキストで共有するドメイン基盤と汎用インフラ抽象
  ポート（`DomainError`、`IdGenerator`、`Clock`、`FileStorage` 等）。各モジュール
  固有のポートはここに置かず、責務に応じて domain / application 層へ配置する。
- 各機能モジュール（`health/`, `auth/`, `project/` …）配下に 3 層：
  1. **domain/** — エンティティ、値オブジェクト、リポジトリインターフェース
  2. **application/** — ユースケース、Result DTO、コンテキスト固有ポート
  3. **adapters/** — コントローラー（Hono ルート）、ゲートウェイ（リポジトリ実装）
- **infrastructure/** — `server/src/infrastructure/` に共通配置。DB 接続、HTTP 設定、
  DI コンテナ（`composition/container.ts`）、エントリーポイント。

> `auth/` モジュールは panoptiplan に存在しない本リポ独自。上記 Clean Architecture
> に従って実装する。

設計規約の詳細は以下を参照（**正本**）：

- `.claude/rules/server-clean-architecture.md` — 層の責務・貧血回避・ポート境界
- `.claude/rules/server-aggregate-internal-entity.md` — 集約内部エンティティの配置
- `.claude/rules/server-application-result.md` — Application Result の Dayjs
- `.claude/rules/server-hono-routes.md` — Hono ルート型推論保護

## クライアントアーキテクチャ

FSD（Feature-Sliced Design）を参考にしたレイヤー構成：

- `app/` — プロバイダー、テーマ、ルーター設定
- `pages/` — ページコンポーネント
- `features/` — ユーザー操作・ビジネスアクション
- `entities/` — ドメイン概念のクエリオプション・UI 表現
- `routes/` — TanStack Router のファイルベースルーティング（`routeTree.gen.ts` は自動生成）
- `shared/` — API クライアント（Hono RPC）、共通ユーティリティ

UI は MUI v9。サーバー状態管理は TanStack React Query。詳細・Portal 配置規約は
`.claude/rules/client-fsd.md`（**正本**）。

## 規約

- **`as` 型アサーション禁止**: `.claude/rules/no-as-type-assertion.md` に従う
  （`as const` のみ可。ESLint で機械的に error 化）。
- **TypeScript strict**: `tsconfig.base.json` の strict 系を緩めない。
- **コミット**: Conventional Commits 必須（commitlint で検証）。
- **ブランチ名**: `<type>/<description>`（feat/, fix/, chore/, refactor/, docs/, test/)。
- **エラー応答**: RFC 7807 Problem Details（`application/problem+json`）。
- **バリデーション**: API 境界で Zod、ドメイン層は値オブジェクトのコンストラクタ。
- **ID**: ULID を使用。
- **dependency-cruiser**: `.dependency-cruiser.js` で層間・パッケージ間・FSD の依存
  違反を検出。CI でもチェックされる。
- **pre-commit フック**: husky + lint-staged（ESLint --fix + Prettier）/ commit-msg
  （commitlint）。
- **テスト**: 新規実装には対応するテストを併せて書く（原則 Small）。サイズ分類・
  層別戦略・命名・Builder 等の詳細は `.claude/rules/testing.md`（**正本**）。

## 実装フロー（PR ベース）

実装は **必ず PR を経由** し、main へ直接コミットしない。`docs/TASKS.md` の
PR 粒度（1 機能スライス = 1 PR）に従い、各 PR 末に「ローカルで動かして確認する
手順」を添える。

1. `<type>/<description>` ブランチを切って実装する。
2. ローカルで品質ゲート（後述）をすべて通す。
3. push して PR を作成し、**GitHub Copilot にレビューを依頼**する
   （`gh pr edit <n> --add-reviewer copilot-pull-request-reviewer`）。
4. Copilot の指摘を反映し、再 push してレビューを再依頼する。
   **新規の有効な指摘が付かなくなるまで** 繰り返す（再掲・誤検知は根拠を示す）。
5. 指摘収束＋CI 緑で **rebase マージ**し、ブランチを削除する
   （本リポは squash / merge commit が無効。rebase のみ）。
6. client（`client/src/`）の変更を含む PR は `fsd-review` スキルを実行する。

## 品質ゲート

`pnpm typecheck` / `pnpm lint` / `pnpm depcruise` / `pnpm format:check` /
`pnpm test` / `pnpm build` がすべて通ること。Stop フックが
typecheck / lint / depcruise / test を自動確認し、失敗時のみ block する。
