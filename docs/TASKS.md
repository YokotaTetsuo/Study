# PDF Review — タスク一覧

[PLAN.md](./PLAN.md) のフェーズを実行可能タスクへ分解したもの。
規約は panoptiplan 準拠（`.claude/rules/`・`docs/reference/` が正本）。

- 粒度: **1 機能スライス = 1 PR**。各 PR は末尾の「確認手順」で挙動確認できる状態にする。
- 各 PR は PR 作成 → Copilot レビュー → 指摘収束 → CI/品質ゲート緑 → マージ。
- client 変更を含む PR は `fsd-review` スキルを実行する。
- 新規実装には対応するテストを併せて書く（原則 Small。`testing.md` 準拠）。

凡例: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了

---

## Phase 0 — 基盤

### PR 0.1 旧コード削除 + モノレポ骨格

- [ ] 旧「思考の席」`src/` `test/` `index.html` 等を削除
- [ ] pnpm workspaces（`pnpm-workspace.yaml`、ルート `package.json`、Node v24 / pnpm v10.33+）
- [ ] `client` `server` `shared` `infra` パッケージ雛形
- [ ] TS project references / 共通 `tsconfig` 基盤
- **確認手順**: `pnpm install` 成功、`pnpm -r typecheck` が通る

### PR 0.2 依存ルール + Lint 基盤

- [ ] `docs/reference/dependency-cruiser.reference.js` を `.dependency-cruiser.js` として導入
- [ ] `docs/reference/eslint.config.reference.ts` を `eslint.config.ts` として導入（`as` 禁止 / strictTypeChecked / naming-convention / explicit-function-return-type / import order）
- [ ] Prettier、`pnpm depcruise` / `pnpm lint` / `pnpm format:check` スクリプト
- **確認手順**: 依存違反のダミー import を一時追加 → `pnpm depcruise` が fail → 削除して緑

### PR 0.3 ドキュメント + フック + テスト基盤

- [ ] CLAUDE.md を `docs/reference/panoptiplan-CLAUDE.reference.md` を手本に本プロジェクト用へ整備（旧コンセプト/永続化禁止を削除、`.claude/rules` 参照を明記）
- [ ] README 全面書き換え（セットアップ・コマンド・確認手順）
- [ ] husky pre-commit（ESLint --fix + Prettier）/ commit-msg（commitlint, Conventional Commits）
- [ ] Vitest `projects` で Small/Medium 物理分離（`*.small.test.ts(x)` / `*.medium.test.ts(x)`）、`pnpm test` / `test:small` / `test:medium`
- [ ] Stop フック品質ゲートに depcruise を追加
- **確認手順**: `pnpm typecheck/lint/format:check/test/build/depcruise` 全緑、規約違反コミットが commitlint で弾かれる

### PR 0.4 疎通（health + DB + S3）

- [ ] docker-compose に PostgreSQL 17 + RustFS（S3 互換）、`.env.example`
- [ ] server: `health/` モジュール（domain/application/adapters）+ Hono `OpenAPIHono` で `GET /health`、DI コンテナ（`infrastructure/composition/container.ts`）
- [ ] shared: health の Zod スキーマ、Hono RPC `AppType` export
- [ ] client: Vite + React 19 + TanStack Router 雛形、`shared/api`(Hono RPC) で `/health` 取得し表示
- [ ] `pnpm dev`（server+client 同時起動）
- [ ] health の Small テスト（domain/application/controller）
- **確認手順**: `pnpm dev` → ブラウザで「API: ok」表示

---

## Phase 1 — 認証 / アカウント（panoptiplan に無い独自モジュール）

### PR 1.1 shared: 認証スキーマ

- [ ] `shared` に register/login/me の Zod スキーマ + 型
- **確認手順**: 型が client/server 双方から import できる（`pnpm -r typecheck` 緑）

### PR 1.2 server domain/application: User + 認証ユースケース

- [ ] `auth/domain`: `User` 集約、値オブジェクト（`Email`/`PasswordHash`/`UserId`(ULID)）、`UserRepository` interface
- [ ] ポート: `PasswordHasher` / `SessionStore`（位置は `server-clean-architecture.md` のポート規約に従う）/ shared-kernel の `Clock` `IdGenerator`
- [ ] `auth/application`: register / login / logout / me（Command/Query、Result は Dayjs）
- [ ] Small テスト（値オブジェクト境界値、ユースケース正常+全エラー分岐、テストダブル）
- **確認手順**: `pnpm --filter server test:small` 緑

### PR 1.3 server adapters/infrastructure: 永続化 + セッション

- [ ] Drizzle スキーマ（users）+ マイグレーション
- [ ] `auth/adapters/gateways`: `UserRepository` Drizzle 実装（toEntity/toRow のみ）、argon2 ハッシャ、Cookie セッション
- [ ] Medium テスト（実 Postgres ラウンドトリップ・unique 制約）
- **確認手順**: `pnpm --filter server test:medium` 緑（docker compose 起動済み）

### PR 1.4 server adapters: 認証 API

- [ ] `auth/adapters/controllers`: `OpenAPIHono` で `/auth/register|login|logout|me`、Zod 検証、httpOnly Cookie、エラーは RFC7807
- [ ] Controller Small テスト（HTTP 境界・status・エラーマッピングのみ）
- **確認手順**: curl で register→login→me（Cookie 付き）→logout 成功、不正入力で problem+json 400

### PR 1.5 client: ログイン/登録画面（FSD）

- [ ] `shared/api`(Hono RPC) 認証コール、`features/auth`、`pages/login` `pages/register`、`routes/`
- [ ] React Query でセッション状態、認証ガード、ヘッダに「ログイン中: X」
- [ ] features/entities の Small テスト（操作→mutation 起動）
- **確認手順**: ブラウザで 登録→ログイン→ユーザー名表示→ログアウト（`fsd-review` 実行）

---

## Phase 2 — プロジェクト / メンバー / ロール

### PR 2.1 shared: プロジェクト/ロール/ポリシー スキーマ

- [ ] project 作成 / member 追加 / role 設定 / approvalPolicy 設定の Zod スキーマ
- **確認手順**: `pnpm -r typecheck` 緑

### PR 2.2 server domain/application: Project 集約

- [ ] `project/domain`: `Project` 集約、`Membership`、`Role`(可変)、`ApprovalPolicy`(可変)、値オブジェクト（`ProjectId`/`ProjectName`）
- [ ] ビジネスルールはエンティティのメソッドで表現（貧血回避）。不変条件（Owner≥1 / 重複参加不可 / 必要承認数≥1）
- [ ] `project/application`: createProject / addMember / setMemberRole / updateApprovalPolicy
- [ ] Small テスト（集約ルート経由で網羅）
- **確認手順**: `pnpm --filter server test:small` 緑

### PR 2.3 server adapters/infra: プロジェクト API

- [ ] Drizzle スキーマ（projects/memberships/roles/policies）+ gateway 実装
- [ ] controllers（Hono）、認可（操作可能ロールチェックは usecase 層）
- [ ] Controller Small + Gateway Medium テスト
- **確認手順**: curl でプロジェクト作成→メンバー追加→ロール/ポリシー変更 成功

### PR 2.4 client: プロジェクト一覧 + 設定画面

- [ ] `pages/projects`（一覧/作成）、`pages/project-settings`（メンバー/ロール/必要承認数）、`entities/project`、`features/*`
- **確認手順**: ブラウザで プロジェクト作成→メンバー追加→設定でロール/必要承認数変更し反映確認（`fsd-review` 実行）

---

## Phase 3 — 文書 / 版アップロード（不透明）+ ビューア

### PR 3.1 shared + server domain/application

- [ ] document 作成 / version アップロード / version 一覧 の Zod スキーマ
- [ ] `document/domain` `version/domain`: `Document` 集約・`DocumentVersion`（状態 Draft 初期）。`FileStorage` ポート（shared-kernel）
- [ ] application: createDocument / uploadVersion / listVersions / getVersionFile
- [ ] Small テスト
- **確認手順**: `pnpm --filter server test:small` 緑

### PR 3.2 server adapters/infra

- [ ] Drizzle スキーマ（documents/versions）、`FileStorage` の S3(RustFS) gateway 実装
- [ ] アップロード(multipart)/ダウンロード controller、サイズ/MIME 検証（PDF のみ）
- [ ] Controller Small + Gateway Medium（実 S3）テスト
- **確認手順**: curl で PDF アップロード→版一覧→ダウンロード 成功

### PR 3.3 client: アップロード + 版履歴 + pdf.js ビューア

- [ ] `features/upload-version`、`entities/version`、版履歴 UI、`pdfjs-dist` ビューア（MUI v9）
- **確認手順**: ブラウザで PDF v1/v2 アップロード→版履歴から切替→各版を閲覧（`fsd-review` 実行）

---

## Phase 4 — 提出 / 承認ワークフロー

### PR 4.1 shared + server domain: 状態機械 / ReviewRequest

- [ ] version 状態遷移、`ReviewRequest` 集約、ApprovalPolicy 評価ロジック
- [ ] 状態機械の Small テスト（全遷移・不正遷移拒否、状態遷移テスト技法）
- **確認手順**: `pnpm --filter server test:small` 緑（遷移網羅）

### PR 4.2 server application/adapters/infra: ワークフロー API

- [ ] usecase: submitVersion / approve / requestChanges / reject / publishOfficial（単一責務・Command/Query）
- [ ] ロール権限を ApprovalPolicy で判定（usecase 層）、永続化(persistence) + controller
- [ ] Small + 必要に応じ Medium（複数集約アトミック更新時は理由コメント付き）
- **確認手順**: curl で submit→approve×必要数→Approved→publish→Official、別経路で requestChanges

### PR 4.3 client: ワークフロー UI

- [ ] 状態バッジ、提出ボタン、レビュアーの承認/差戻し（Button/Dialog 分離・Portal 規約遵守）、正式版表示
- **確認手順**: ブラウザで（複数ユーザー）v2 提出→承認→正式版化、差戻し経路も確認（`fsd-review` 実行）

---

## Phase 5 — コメント（版スレッド）

### PR 5.1 shared + server domain/application

- [ ] comment 追加/一覧/削除 の Zod スキーマ
- [ ] `Comment` を `Version` 集約の**内部エンティティとして同居**（クラス非 export、`CommentReadonly` を export、`server-aggregate-internal-entity.md` 準拠）
- [ ] usecase + Small テスト（集約ルート経由で網羅、内部エンティティ単独テストは作らない）
- **確認手順**: `pnpm --filter server test:small` 緑

### PR 5.2 server adapters/infra + client

- [ ] gateway は生データ配列を `Version.reconstruct` に渡す（集約境界侵犯しない）
- [ ] controller + 版ページのスレッド UI（Button/Dialog 分離）
- **確認手順**: ブラウザで（複数ユーザー）版にコメント→スレッド表示→著者が削除（`fsd-review` 実行）

---

## Phase 6 — 仕上げ

### PR 6.1 依存ルール厳格化 + 認可網羅

- [ ] dependency-cruiser を CI 必須 fail 化、全違反解消
- [ ] 全エンドポイントの認可レビュー、RFC7807 エラーマッピング統一
- **確認手順**: CI で depcruise 緑、未認可アクセスが problem+json で 403

### PR 6.2 開発体験 / seed

- [ ] seed スクリプト（サンプルプロジェクト/ユーザー/版）
- [ ] README に起動・確認手順を整備
- **確認手順**: seed 後、ブラウザで一連のフローを通しで確認

### PR 6.3（任意）Large / E2E

- [ ] Playwright で主要ハッピーパス（登録→プロジェクト→アップロード→承認→コメント）
- **確認手順**: E2E 緑（retry 無し方針・`testing.md` §6）
