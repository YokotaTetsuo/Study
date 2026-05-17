import { queryOptions } from '@tanstack/react-query';

import { getDocument, listDocuments } from './document-api';

export const DOCUMENTS_QUERY_KEY = ['documents'] as const;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- queryOptions の戻り型推論を保持するため
export function documentsByProjectQueryOptions(projectId: string) {
  return queryOptions({
    queryKey: [...DOCUMENTS_QUERY_KEY, 'project', projectId],
    queryFn: () => listDocuments(projectId),
    retry: false,
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- queryOptions の戻り型推論を保持するため
export function documentQueryOptions(documentId: string) {
  return queryOptions({
    queryKey: [...DOCUMENTS_QUERY_KEY, 'detail', documentId],
    queryFn: () => getDocument(documentId),
    retry: false,
  });
}
