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

export const documentVersionSchema = z.object({
  versionNumber: z.number().int().min(1),
  status: versionStatusSchema,
  uploadedBy: z.string(),
  createdAt: z.string().datetime(),
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

/** 版に紐づくコメント（スレッド表示用）。 */
export const commentSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  content: z.string().min(1).max(2000),
  createdAt: z.string().datetime(),
});
export type Comment = z.infer<typeof commentSchema>;

export const addCommentRequestSchema = z.object({
  content: z.string().min(1).max(2000),
});
export type AddCommentRequest = z.infer<typeof addCommentRequestSchema>;

export const commentListResponseSchema = z.array(commentSchema);
export type CommentListResponse = z.infer<typeof commentListResponseSchema>;
