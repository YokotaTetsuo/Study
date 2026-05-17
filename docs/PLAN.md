# PDF Review — 設計計画

「PDF 版 GitHub」: PDF をバージョン管理し、版にコメントを付け、承認フローを通す
マルチユーザー Web アプリ。フルスクラッチで再構築する（旧「思考の席」は全削除）。

> ステータス: ドラフト。着手前レビュー用。
> **技術選定は tokyogas-tech/panoptiplan-web の規約に準拠する**（同組織の姉妹リポ・同種ドメイン）。
> 規約の正本は `.claude/rules/` 配下と `docs/reference/`。変更時は本書・TASKS.md・該当ルールを更新してから着手。

## 0. 準拠元

実装規約は **panoptiplan-web** に揃える。取り込み済みの正本:

- `.claude/rules/server-clean-architecture.md` — サーバ設計規約
- `.claude/rules/server-aggregate-internal-entity.md` — 集約内部エンティティの配置
- `.claude/rules/server-application-result.md` — Application 層 Result の Dayjs
- `.claude/rules/server-hono-routes.md` — Hono ルート型推論保護
- `.claude/rules/client-fsd.md` — FSD 規約（Portal 配置含む）
- `.claude/rules/no-as-type-assertion.md` — `as` 禁止
- `.claude/rules/testing.md` — テスト規約（Small/Medium、Builder、観察ベース等）
- `.claude/commands/fsd-review.md` — FSD レビュースキル
- `docs/reference/dependency-cruiser.reference.js` — 依存方向の機械強制（Phase 0 で導入）
- `docs/reference/eslint.config.reference.ts` — ESLint 設定（Phase 0 で導入）
- `docs/reference/panoptiplan-CLAUDE.reference.md` — CLAUDE.md 構成の手本（PR 0.3 で本書化）

## 1. 技術判断（panoptiplan 準拠で確定）

| # | 項目 | 採用 | 備考 |
|---|------|------|------|
| 1 | API HTTP | **Hono**（`@hono/zod-openapi` / `OpenAPIHono`） | 型推論保護は `server-hono-routes.md` 厳守 |
| 2 | 型共有 | **Hono RPC `AppType`** + `shared` の Zod スキーマ | client→server は **type-only import のみ**許可 |
| 3 | DB | **PostgreSQL 17** + **Drizzle ORM** | マイグレーションは `pnpm --filter server db:generate/migrate` |
| 4 | ファイル保存 | **S3 互換**（ローカル: RustFS / 本番: S3）。`FileStorage` ポート抽象 | ポートは shared-kernel |
| 5 | 認証 | email+パスワード(argon2) + httpOnly セッション Cookie | ※ panoptiplan に認証は無いため本プロジェクト独自。Clean Arch に従い `auth/` モジュールとして実装 |
| 6 | DI | **DI コンテナ**（`server/src/infrastructure/composition/container.ts`） | エントリポイントもここ |
| 7 | フロント | **React 19 SPA**（Vite + **TanStack Router** + **TanStack React Query** + **MUI v9**） | FSD は `client-fsd.md` |
| 8 | ID | **ULID** | ドメインは値オブジェクト化（`ProjectId` 等） |
| 9 | エラー応答 | **RFC 7807 Problem Details**（`application/problem+json`） | — |
| 10 | バリデーション | API 境界で Zod、ドメインは値オブジェクトのコンストラクタ | — |
| 11 | コミット/フック | Conventional Commits（commitlint）+ husky pre-commit（ESLint --fix / Prettier / commitlint） | — |
| 12 | テスト | Vitest `projects` で **Small / Medium** 物理分離 | 詳細は `testing.md` |

## 2. リポ構成（モノレポ / pnpm workspaces、panoptiplan 準拠）

パッケージマネージャ **pnpm**（v10.33+）、Node.js **v24**。

```
pdf-review/
  client/         React 19 SPA（Vite + TanStack Router + MUI v9）— FSD
    src/
      app/      プロバイダー/テーマ/ルーター設定
      pages/    ページ
      features/ ユーザー操作・ビジネスアクション
      entities/ ドメイン概念のクエリオプション/UI 表現
      routes/   TanStack Router ファイルベース（routeTree.gen.ts は自動生成）
      shared/   API クライアント(Hono RPC)/共通ユーティリティ
      （widgets/ は将来導入）
  server/         Hono API（Clean Architecture + DDD）
    src/
      shared-kernel/   DomainError/IdGenerator/Clock/FileStorage 等の共有基盤・汎用ポート
      <module>/        health/ auth/ project/ document/ version/ … 各機能モジュール
        domain/        エンティティ・値オブジェクト・リポジトリ interface
        application/    ユースケース・Result DTO・コンテキスト固有ポート
        adapters/       controllers(Hono ルート) / gateways(リポジトリ実装)
      infrastructure/  DB 接続・HTTP 設定・DI コンテナ(composition/)・エントリポイント
  shared/         Zod スキーマによる API コントラクト（client/server から参照）
  infra/          インフラ定義
  docker-compose.yml          PostgreSQL 17 + RustFS(S3 互換)
  .dependency-cruiser.js      依存方向の機械強制（CI で fail）
  eslint.config.ts            strictTypeChecked + as 禁止 + naming 等
  .husky/                     pre-commit / commit-msg
  .claude/rules/ .claude/commands/  実装規約・スキル（正本）
  CLAUDE.md / README          PR 0.3 で本プロジェクト用に整備
```

**パッケージ依存方向**: `client` → `shared` ← `server`。client→server は型のみ（Hono RPC `AppType`）。`infra` は client/shared に依存しない。

> スコープ決定: `infra` は **MVP では最小**（docker-compose 等の最低限）に留める。
> panoptiplan の `repo-settings`(Pulumi) は **本プロジェクトでは対象外**（作らない）。

## 3. 依存ルール（機械強制 — 要望の核）

正本は `docs/reference/dependency-cruiser.reference.js`。Phase 0 で `.dependency-cruiser.js` として導入し CI で fail 化。

### サーバ層依存（外→内の一方向、severity: error）

- `domain` → `application` / `adapters` / `infrastructure` 禁止
- `application` → `adapters` / `infrastructure` 禁止
- `adapters` → `infrastructure` 禁止
- `shared-kernel` → server 内他モジュール禁止（隔離）
- 設計規約（コントローラ/ゲートウェイ/エンティティの責務、貧血ドメイン回避、ポート専用エラーと層境界）は `server-clean-architecture.md`

### パッケージ境界（severity: error）

- `shared` → client/server/infra 禁止
- `client` → `server` は type-only のみ許可、`client` → `infra` 全面禁止
- `server` → client/infra 禁止、`infra` → client/shared 禁止

### FSD 層依存（severity: error）

- `app → pages → widgets → features → entities → shared` の方向のみ
- `features` / `entities` の同層クロススライス import 禁止（Public API = `index.ts` 経由のみ）
- 詳細・Portal 配置規約は `client-fsd.md`、レビューは `fsd-review` スキル

## 4. ドメインモデル（DDD / 境界づけられたコンテキスト = Document Review）

集約は **集約ルート経由のみ**でアクセス。内部エンティティは集約ルートに同居しクラス非 export、
読み取り専用ビュー interface を export（`server-aggregate-internal-entity.md`）。

| 集約/エンティティ | 役割 | 主な不変条件 |
|---|---|---|
| **User**（auth） | 認証主体 | email 一意 |
| **Project** | 文書群の入れ物。Membership/Role/ApprovalPolicy 保持 | Owner 最低 1 名 |
| **Membership** | Project 参加 + 付与ロール | 同一ユーザー重複参加不可 |
| **Role**（設定可変） | Owner/Submitter/Reviewer/Approver … 定義変更可 | — |
| **ApprovalPolicy**（設定可変） | 必要承認数・承認可能ロール等 | 必要承認数 ≥ 1 |
| **Document** | バージョン管理対象。正式版ポインタ | 正式版は Approved 済みの版のみ |
| **DocumentVersion** | 版番号・保存キー・状態・提出者 | 状態遷移は下記マシン |
| **ReviewRequest** | 提出版の承認集約 | ポリシー充足判定を内包 |
| **Comment**（Version の内部エンティティ） | 版単位スレッド（MVP）。後段でページ/座標ピン | 著者のみ削除可・集約ルート経由 |

### DocumentVersion 状態機械

```
Draft ──submit──► UnderReview ──(policy satisfied)──► Approved ──publish──► Official
                       │
                       ├──request changes──► ChangesRequested ──(new version)──► Draft
                       └──reject──────────► Rejected
```

承認ワークフローは線形（GitHub の PR を 1 本道に簡略化）。

## 5. フェーズ計画

各フェーズは複数の小さい PR に分割。**1 PR ごとに「ローカルで動かして確認する手順」を添える**。
PR + Copilot レビュー + 品質ゲートを毎回通す。client 変更を含む PR は `fsd-review` 実行。
詳細タスクは [TASKS.md](./TASKS.md)。

| Phase | 目的 | 完了時に確認できること |
|---|---|---|
| 0 | 基盤 | `pnpm dev` で server+client 起動、画面に「API: ok」 |
| 1 | 認証/アカウント | 登録→ログイン→「ログイン中: X」→ログアウト |
| 2 | プロジェクト/メンバー/ロール | プロジェクト作成→メンバー追加→設定でロール/必要承認数変更 |
| 3 | 文書/版アップロード(不透明)+ビューア | PDF v1/v2 アップロード→版切替→ブラウザ閲覧 |
| 4 | 提出/承認ワークフロー | v2 提出→承認→正式版化／差戻し経路 |
| 5 | コメント(版スレッド) | 版にコメント→複数ユーザーでスレッド表示 |
| 6 | 仕上げ | 依存ルール CI 厳格 fail 化・認可網羅・seed・(任意)E2E |

### Post-MVP（本計画外・別途計画）

視覚的ページ差分 / ページ・座標ピンコメント / 通知 / 監査ログ。

## 6. テスト方針

正本は `.claude/rules/testing.md`。要点:

- サイズ分類を **ファイル名サフィックスで物理分離**（`*.small.test.ts(x)` / `*.medium.test.ts(x)`）、Vitest `projects` で登録。
- Domain は全 Small・副作用ゼロ。Application は原則 Small（Repository/Clock/IdGenerator はテストダブル）。Gateway(DB/S3) は Medium。Controller は Small（UseCase モック + `app.request()`）。
- 観察ベース・Builder（`a<Entity>()`）・固定 ULID/固定時刻・命名は英語 `should X when Y`。
- 集約内部エンティティは単独テストせず集約ルート経由。

## 7. 品質ゲート（Stop フック / CI 共通）

`pnpm typecheck` / `pnpm lint` / `pnpm format:check` /
`pnpm test`（Small+Medium）/ `pnpm build` / `pnpm depcruise` が全緑。
client 変更を含む PR は `fsd-review` スキルを実行する。
