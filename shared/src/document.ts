import { z } from 'zod';

/**
 * 文書/版の API コントラクト（client/server 共有）。
 * 版の状態機械（Phase 4）:
 *   draft ─submit→ under_review ─approve(policy 充足)→ approved ─publish→ official
 *                        ├─request changes→ changes_requested
 *                        └─reject→ rejected
 */

export const versionStatusSchema = z.enum([
  'draft',
  'under_review',
  'approved',
  'official',
  'changes_requested',
  'rejected',
]);
export type VersionStatus = z.infer<typeof versionStatusSchema>;

export const createDocumentRequestSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(200),
});
export type CreateDocumentRequest = z.infer<typeof createDocumentRequestSchema>;

// 文書名の変更リクエスト。入力は前後空白を正規化してから 1〜200 文字を
// 判定する。domain DocumentName も trim 後に同条件で検証するため判定が
// 一致し、「空白のみ送信が Zod を通過して domain で例外（400）」を防ぐ
// （addCommentRequestSchema と同じ方針）。
export const renameDocumentRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
});
export type RenameDocumentRequest = z.infer<typeof renameDocumentRequestSchema>;

export const documentVersionSchema = z.object({
  versionNumber: z.number().int().min(1),
  status: versionStatusSchema,
  uploadedBy: z.string(),
  createdAt: z.string().datetime(),
  // この版に付いた最新コメントの作成時刻。コメントが無い版は null
  // （版履歴一覧でフォールバック表示する契約）。
  latestCommentAt: z.string().datetime().nullable(),
});
export type DocumentVersion = z.infer<typeof documentVersionSchema>;

export const documentResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
  // 正式版ポインタ（null=未公開）。
  officialVersionNumber: z.number().int().min(1).nullable(),
  versions: z.array(documentVersionSchema),
});
export type DocumentResponse = z.infer<typeof documentResponseSchema>;

export const documentListResponseSchema = z.array(documentResponseSchema);
export type DocumentListResponse = z.infer<typeof documentListResponseSchema>;

/** 版に紐づくコメント（スレッド表示用のレスポンス形状）。 */
export const commentSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  // 著者の表示名。著者が解決できない場合（ユーザー削除・参照不能等）は
  // null とし、表示側は authorId を併記してフォールバックする契約。
  authorDisplayName: z.string().min(1).nullable(),
  // レスポンスは server 側の意味的な値をそのまま表現する契約のため、
  // ここで .trim() による正規化はしない（受信値を書き換えない）。
  // 「trim 済み」は domain CommentContent 経由で生成される前提に基づく
  // 想定であり、この schema が検証・強制する不変条件ではない点に注意。
  content: z.string().min(1).max(2000),
  createdAt: z.string().datetime(),
  // 最終更新時刻。未編集なら createdAt と一致する（編集で更新される）。
  updatedAt: z.string().datetime(),
});
export type Comment = z.infer<typeof commentSchema>;

// 入力は前後空白を正規化してから 1〜2000 文字を判定する。domain の
// CommentContent も trim 後に同条件で検証するため判定が一致し、
// 「空白のみ送信が Zod を通過して domain で例外」を防ぐ。
export const addCommentRequestSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});
export type AddCommentRequest = z.infer<typeof addCommentRequestSchema>;

// 編集も追加と同じ本文制約。trim 後 1〜2000 文字。
export const updateCommentRequestSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});
export type UpdateCommentRequest = z.infer<typeof updateCommentRequestSchema>;

export const commentListResponseSchema = z.array(commentSchema);
export type CommentListResponse = z.infer<typeof commentListResponseSchema>;
