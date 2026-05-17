import type {
  CreateDocumentRequest,
  DocumentResponse,
} from '@pdf-review/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import {
  DOCUMENTS_QUERY_KEY,
  createDocument,
  documentQueryOptions,
  documentsByProjectQueryOptions,
  uploadVersion,
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

export function useUploadVersion(
  documentId: string,
): UseMutationResult<DocumentResponse, Error, File> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadVersion(documentId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
    },
  });
}
