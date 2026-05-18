# 認可監査（Phase 6.1）

全 HTTP エンドポイントについて、認証（誰でも/要ログイン）と認可（メンバー/
ロール条件）の強制点を一覧化する。実装は **controller でセッション解決
（未ログインは 401）→ usecase でメンバー/ロール判定（不可は 403）** の二段。
認可ルールは usecase 層に置き、controller は薄く保つ（`server-clean-architecture.md`）。

エラーは全モジュール共通の `shared-kernel/problem.ts`（`makeProblem`）で
RFC7807 `application/problem+json` に統一。`401 Unauthorized`（未認証）/
`403 Forbidden`（権限なし）/ `404 Not Found` / `409 Conflict`（状態・競合・
DB 競合）/ `415` / `400` / `500`。

## auth

| メソッド/パス         | 認証       | 認可           | 強制点                     |
| --------------------- | ---------- | -------------- | -------------------------- |
| POST `/auth/register` | 公開       | なし           | —                          |
| POST `/auth/login`    | 公開       | なし           | 資格情報不正は 401         |
| POST `/auth/logout`   | 要ログイン | 本人セッション | セッション破棄             |
| GET `/auth/me`        | 要ログイン | 本人           | `UnauthenticatedError`→401 |
| GET `/health`         | 公開       | なし           | —                          |

## project

| メソッド/パス                                | 認証       | 認可                                 | 強制点                                                           |
| -------------------------------------------- | ---------- | ------------------------------------ | ---------------------------------------------------------------- |
| GET `/projects`                              | 要ログイン | 参加プロジェクトのみ                 | `ListProjectsUseCase` が `listByMember(actingUserId)` でスコープ |
| POST `/projects`                             | 要ログイン | 任意の認証ユーザー（作成者が owner） | 設計上メンバー判定不要                                           |
| GET `/projects/{projectId}`                  | 要ログイン | メンバー                             | usecase でメンバー判定、非メンバーは 403/404                     |
| POST `/projects/{projectId}/members`         | 要ログイン | **owner のみ**                       | usecase が owner 判定、非 owner は `NotAuthorizedError`→403      |
| PUT `/projects/{projectId}/members/{userId}` | 要ログイン | **owner のみ**                       | 同上。最後の owner 降格は `LastOwnerError`→409                   |
| PUT `/projects/{projectId}/approval-policy`  | 要ログイン | **owner のみ**                       | 同上                                                             |

## document

| メソッド/パス                                                                  | 認証       | 認可                               | 強制点                                                        |
| ------------------------------------------------------------------------------ | ---------- | ---------------------------------- | ------------------------------------------------------------- |
| POST `/documents`                                                              | 要ログイン | プロジェクトメンバー               | `projectAccess.isMember`、非メンバーは 403                    |
| GET `/projects/{projectId}/documents`                                          | 要ログイン | メンバー                           | 同上                                                          |
| GET `/documents/{documentId}`                                                  | 要ログイン | メンバー                           | 同上                                                          |
| POST `/documents/{documentId}/versions`                                        | 要ログイン | メンバー                           | 同上。非 PDF は 415                                           |
| GET `/documents/{documentId}/versions/{versionNumber}/file`                    | 要ログイン | メンバー                           | 同上。版未存在 404                                            |
| POST `/documents/{documentId}/versions/{versionNumber}/comments`               | 要ログイン | メンバー                           | `AddCommentUseCase` が `isMember`、非メンバー 403             |
| GET `/documents/{documentId}/versions/{versionNumber}/comments`                | 要ログイン | メンバー                           | `ListCommentsUseCase` が `isMember`                           |
| DELETE `/documents/{documentId}/versions/{versionNumber}/comments/{commentId}` | 要ログイン | メンバー かつ **コメント著者本人** | usecase が `isMember`、ドメインが `CommentForbiddenError`→403 |

## review（ワークフロー）

`resolveProjectContext` が対象文書のプロジェクトでの acting user の
メンバーシップを必須化し（非メンバーは `NotAuthorizedError`→403）、
ロール/承認ポリシーを解決する。

| メソッド/パス                                                           | 認証       | 認可                           | 強制点                                               |
| ----------------------------------------------------------------------- | ---------- | ------------------------------ | ---------------------------------------------------- |
| POST `/documents/{documentId}/versions/{versionNumber}/submit`          | 要ログイン | メンバー                       | `resolveProjectContext`                              |
| POST `/documents/{documentId}/versions/{versionNumber}/approve`         | 要ログイン | 承認ポリシーの承認可能ロール   | ポリシー評価、不可は `UnauthorizedApproverError`→403 |
| POST `/documents/{documentId}/versions/{versionNumber}/request-changes` | 要ログイン | reviewer / owner               | `assertCanReview`、不可は 403                        |
| POST `/documents/{documentId}/versions/{versionNumber}/reject`          | 要ログイン | reviewer / owner               | `assertCanReview`                                    |
| POST `/documents/{documentId}/versions/{versionNumber}/publish`         | 要ログイン | 承認ポリシー充足後の許可ロール | usecase 判定                                         |

## 監査結論

- すべての保護エンドポイントは controller でセッションを解決し、未認証は
  `401`（`application/problem+json`）。`register` / `login` / `health` のみ
  意図的に公開。
- メンバー/ロール条件はすべて **usecase 層**で強制（`projectAccess.isMember`
  / `resolveProjectContext` / `assertCanReview` / ApprovalPolicy 評価）。
  controller には認可分岐を置かない。
- 「403 になる操作をクライアントに見せない」方針はサーバ強制とは独立した
  UX（非 owner の設定 UI 無効化など）。サーバ側は本表のとおり常に強制する。
- ギャップは検出されなかった。新規エンドポイント追加時は本表へ追記し、
  controller のセッション解決と usecase のメンバー/ロール判定を必須とする。
