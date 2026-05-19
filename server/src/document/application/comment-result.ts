import type { Dayjs } from 'dayjs';

import type { CommentReadonly } from '../domain/document';

export interface CommentResult {
  readonly id: string;
  readonly authorId: string;
  /** 著者の表示名。解決できなかった場合は null（呼び出し側で ID 併記）。 */
  readonly authorDisplayName: string | null;
  readonly content: string;
  readonly createdAt: Dayjs;
  readonly updatedAt: Dayjs;
}

export function toCommentResult(
  comment: CommentReadonly,
  authorDisplayName: string | null,
): CommentResult {
  return {
    id: comment.id.value,
    authorId: comment.authorId.value,
    authorDisplayName,
    content: comment.content.value,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}
