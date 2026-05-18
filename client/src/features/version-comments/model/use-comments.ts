import type { Comment } from '@pdf-review/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import {
  addComment,
  COMMENTS_QUERY_KEY,
  commentsQueryOptions,
  deleteComment,
} from '../../../entities/document';

export function useComments(
  documentId: string,
  versionNumber: number,
): UseQueryResult<Comment[]> {
  return useQuery(commentsQueryOptions(documentId, versionNumber));
}

/** この版のコメント一覧クエリだけを再取得する key。 */
function versionCommentsKey(
  documentId: string,
  versionNumber: number,
): readonly unknown[] {
  return [...COMMENTS_QUERY_KEY, documentId, versionNumber];
}

export function useAddComment(
  documentId: string,
  versionNumber: number,
): UseMutationResult<Comment, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      addComment(documentId, versionNumber, content),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: versionCommentsKey(documentId, versionNumber),
      });
    },
  });
}

export function useDeleteComment(
  documentId: string,
  versionNumber: number,
): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      deleteComment(documentId, versionNumber, commentId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: versionCommentsKey(documentId, versionNumber),
      });
    },
  });
}
