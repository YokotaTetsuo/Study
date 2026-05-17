import type { Dayjs } from 'dayjs';

import type { Document } from '../domain/document';

export interface VersionResult {
  readonly versionNumber: number;
  readonly status: string;
  readonly uploadedBy: string;
  readonly createdAt: Dayjs;
}

export interface DocumentResult {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly createdAt: Dayjs;
  readonly versions: readonly VersionResult[];
}

export function toDocumentResult(document: Document): DocumentResult {
  return {
    id: document.id.value,
    projectId: document.projectId.value,
    name: document.name.value,
    createdAt: document.createdAt,
    versions: document.versions.map((v) => ({
      versionNumber: v.versionNumber,
      status: v.status.value,
      uploadedBy: v.uploadedBy.value,
      createdAt: v.createdAt,
    })),
  };
}
