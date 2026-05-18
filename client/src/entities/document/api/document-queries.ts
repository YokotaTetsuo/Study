import { queryOptions } from '@tanstack/react-query';

import { getDocument, listComments, listDocuments } from './document-api';

export const DOCUMENTS_QUERY_KEY = ['documents'] as const;
export const COMMENTS_QUERY_KEY = ['comments'] as const;

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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- queryOptions の戻り型推論を保持するため
export function commentsQueryOptions(
  documentId: string,
  versionNumber: number,
) {
  return queryOptions({
    queryKey: [...COMMENTS_QUERY_KEY, documentId, versionNumber],
    queryFn: () => listComments(documentId, versionNumber),
    retry: false,
  });
}
