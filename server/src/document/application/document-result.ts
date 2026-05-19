import type { Dayjs } from 'dayjs';

import type { Document } from '../domain/document';

export interface VersionResult {
  readonly versionNumber: number;
  readonly status: string;
  readonly uploadedBy: string;
  readonly createdAt: Dayjs;
  // この版に付いた最新コメントの作成時刻。コメントが無い版は null。
  readonly latestCommentAt: Dayjs | null;
}

export interface DocumentResult {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly createdAt: Dayjs;
  readonly officialVersionNumber: number | null;
  readonly versions: readonly VersionResult[];
}

export function toDocumentResult(document: Document): DocumentResult {
  return {
    id: document.id.value,
    projectId: document.projectId.value,
    name: document.name.value,
    createdAt: document.createdAt,
    officialVersionNumber: document.officialVersionNumber,
    versions: document.versions.map((v) => ({
      versionNumber: v.versionNumber,
      status: v.status.value,
      uploadedBy: v.uploadedBy.value,
      createdAt: v.createdAt,
      latestCommentAt: v.latestCommentAt,
    })),
  };
}
