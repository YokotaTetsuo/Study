import type { Comment } from '@pdf-review/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import {
  addComment,
  COMMENTS_QUERY_KEY,
  commentsQueryOptions,
  deleteComment,
  updateComment,
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

/** 編集対象を一意に決める引数（コメント ID と新本文）。 */
export interface EditCommentInput {
  readonly commentId: string;
  readonly content: string;
}

export function useEditComment(
  documentId: string,
  versionNumber: number,
): UseMutationResult<Comment, Error, EditCommentInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, content }: EditCommentInput) =>
      updateComment(documentId, versionNumber, commentId, content),
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
