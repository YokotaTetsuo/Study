import {
  commentListResponseSchema,
  commentSchema,
  documentListResponseSchema,
  documentResponseSchema,
} from '@pdf-review/shared';
import type {
  Comment,
  CreateDocumentRequest,
  DocumentResponse,
  RenameDocumentRequest,
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

export async function renameDocument(
  documentId: string,
  input: RenameDocumentRequest,
): Promise<DocumentResponse> {
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  return documentResponseSchema.parse(
    await request(
      `/documents/${documentId}`,
      { method: 'PUT', headers, body: JSON.stringify(input) },
      200,
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

/** ワークフロー操作。いずれも更新後の文書を返す（200）。 */
async function versionAction(
  documentId: string,
  versionNumber: number,
  action: 'submit' | 'approve' | 'request-changes' | 'reject' | 'publish',
): Promise<DocumentResponse> {
  return documentResponseSchema.parse(
    await request(
      `/documents/${documentId}/versions/${String(versionNumber)}/${action}`,
      { method: 'POST' },
      200,
    ),
  );
}

export function submitVersion(
  documentId: string,
  versionNumber: number,
): Promise<DocumentResponse> {
  return versionAction(documentId, versionNumber, 'submit');
}

export function approveVersion(
  documentId: string,
  versionNumber: number,
): Promise<DocumentResponse> {
  return versionAction(documentId, versionNumber, 'approve');
}

export function requestChangesVersion(
  documentId: string,
  versionNumber: number,
): Promise<DocumentResponse> {
  return versionAction(documentId, versionNumber, 'request-changes');
}

export function rejectVersion(
  documentId: string,
  versionNumber: number,
): Promise<DocumentResponse> {
  return versionAction(documentId, versionNumber, 'reject');
}

export function publishVersion(
  documentId: string,
  versionNumber: number,
): Promise<DocumentResponse> {
  return versionAction(documentId, versionNumber, 'publish');
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

/** ボディを持たない応答（204 等）。指定 status 以外は ApiError。 */
async function requestNoContent(
  path: string,
  init: RequestInit,
  okStatus: number,
): Promise<void> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: 'include',
  });
  if (res.status !== okStatus) {
    throw new ApiError(res.status);
  }
}

export async function listComments(
  documentId: string,
  versionNumber: number,
): Promise<Comment[]> {
  return commentListResponseSchema.parse(
    await request(
      `/documents/${documentId}/versions/${String(versionNumber)}/comments`,
      { method: 'GET' },
      200,
    ),
  );
}

export async function addComment(
  documentId: string,
  versionNumber: number,
  content: string,
): Promise<Comment> {
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  return commentSchema.parse(
    await request(
      `/documents/${documentId}/versions/${String(versionNumber)}/comments`,
      { method: 'POST', headers, body: JSON.stringify({ content }) },
      201,
    ),
  );
}

export function deleteComment(
  documentId: string,
  versionNumber: number,
  commentId: string,
): Promise<void> {
  return requestNoContent(
    `/documents/${documentId}/versions/${String(
      versionNumber,
    )}/comments/${commentId}`,
    { method: 'DELETE' },
    204,
  );
}
