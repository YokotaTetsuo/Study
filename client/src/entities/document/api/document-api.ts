import {
  documentListResponseSchema,
  documentResponseSchema,
} from '@pdf-review/shared';
import type {
  CreateDocumentRequest,
  DocumentResponse,
} from '@pdf-review/shared';

import { ApiError } from '../../../shared/api/api-error';
import { apiBase } from '../../../shared/api/client';

async function request(
  path: string,
  init: RequestInit,
  okStatus: number,
): Promise<unknown> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: 'include',
  });
  if (res.status !== okStatus) {
    throw new ApiError(res.status);
  }
  return res.json();
}

export async function listDocuments(
  projectId: string,
): Promise<DocumentResponse[]> {
  return documentListResponseSchema.parse(
    await request(`/projects/${projectId}/documents`, { method: 'GET' }, 200),
  );
}

export async function getDocument(
  documentId: string,
): Promise<DocumentResponse> {
  return documentResponseSchema.parse(
    await request(`/documents/${documentId}`, { method: 'GET' }, 200),
  );
}

export async function createDocument(
  input: CreateDocumentRequest,
): Promise<DocumentResponse> {
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  return documentResponseSchema.parse(
    await request(
      '/documents',
      { method: 'POST', headers, body: JSON.stringify(input) },
      201,
    ),
  );
}

export async function uploadVersion(
  documentId: string,
  file: File,
): Promise<DocumentResponse> {
  const form = new FormData();
  form.set('file', file);
  return documentResponseSchema.parse(
    await request(
      `/documents/${documentId}/versions`,
      { method: 'POST', body: form },
      201,
    ),
  );
}

/** 版 PDF のダウンロード URL（pdf.js / リンクから直接参照する）。 */
export function versionFileUrl(
  documentId: string,
  versionNumber: number,
): string {
  return `${apiBase}/documents/${documentId}/versions/${String(
    versionNumber,
  )}/file`;
}
