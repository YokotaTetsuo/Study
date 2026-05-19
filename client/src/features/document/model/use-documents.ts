import type {
  CreateDocumentRequest,
  DocumentResponse,
  RenameDocumentRequest,
} from '@pdf-review/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import {
  DOCUMENTS_QUERY_KEY,
  createDocument,
  documentQueryOptions,
  documentsByProjectQueryOptions,
  renameDocument,
} from '../../../entities/document';

export function useDocuments(
  projectId: string,
): UseQueryResult<DocumentResponse[]> {
  return useQuery(documentsByProjectQueryOptions(projectId));
}

export function useDocument(
  documentId: string,
): UseQueryResult<DocumentResponse> {
  return useQuery(documentQueryOptions(documentId));
}

export function useCreateDocument(): UseMutationResult<
  DocumentResponse,
  Error,
  CreateDocumentRequest
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDocument,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
    },
  });
}

export function useRenameDocument(
  documentId: string,
): UseMutationResult<DocumentResponse, Error, RenameDocumentRequest> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RenameDocumentRequest) =>
      renameDocument(documentId, input),
    onSuccess: () => {
      // 一覧・詳細双方に名前変更を反映する（DOCUMENTS_QUERY_KEY 配下で
      // project 一覧・detail の両クエリが無効化される）。
      void qc.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
    },
  });
}
