import { z } from 'zod';

/**
 * 文書/版の API コントラクト（client/server 共有）。
 * 版の状態は Phase 4 で拡張予定（現状は draft のみ）。
 */

export const versionStatusSchema = z.enum(['draft']);
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
  versions: z.array(documentVersionSchema),
});
export type DocumentResponse = z.infer<typeof documentResponseSchema>;

export const documentListResponseSchema = z.array(documentResponseSchema);
export type DocumentListResponse = z.infer<typeof documentListResponseSchema>;
