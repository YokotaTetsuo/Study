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

## ローカルで動かす（DB / S3 / シード）

全機能には PostgreSQL + S3 互換ストレージが必要（サーバは起動時に S3 バケット
を待つため S3 必須）。既定値（`.env.example`）のまま動く。

```bash
cp .env.example .env                          # 既定: DB :5432 / S3 :9000
docker compose up -d --wait                   # postgres healthy まで待機

# rustfs は healthcheck 対象外。回数上限付きで疎通待ち
for i in $(seq 1 30); do
  curl -s -o /dev/null http://localhost:9000 && break
  [ "$i" -eq 30 ] && { echo "rustfs not ready" >&2; exit 1; }
  sleep 2
done

pnpm --filter @pdf-review/server db:migrate   # マイグレーション適用
pnpm --filter @pdf-review/server seed         # サンプルデータ投入（任意・冪等）
pnpm dev                                      # server :3000 / client :5173
```

停止: `pnpm dev` を Ctrl+C 後、`docker compose down`（データは volume 保持）。

### シードで入るアカウント

`seed` は冪等（`owner@example.com` が居れば何もしない）。投入後は以下で
ログインでき、承認フロー一通りを確認できる（パスワード共通 `password1234`）:

| メール                  | ロール    |
| ----------------------- | --------- |
| `owner@example.com`     | owner     |
| `approver@example.com`  | approver  |
| `reviewer@example.com`  | reviewer  |
| `submitter@example.com` | submitter |

「サンプルプロジェクト」/ 文書「設計仕様書」v1（コメント 1 件）が作成される。

### 確認フロー（手動）

1. `submitter` で v1 を提出 → `under_review`
2. `approver` で承認（承認ポリシー充足）→ `approved`
3. `owner` で正式版化 → `official`（文書詳細に正式版バッジ）
4. 別経路: `reviewer` で差戻し（`changes_requested`）/ 却下を確認
5. 版プレビューのコメントスレッドで投稿・著者本人の削除を確認

> ハマりどころ（Rancher Desktop の docker context、`db:migrate` の接続先など）
> は [CLAUDE.md](CLAUDE.md) の「ローカル実行 Tips」を参照。

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
