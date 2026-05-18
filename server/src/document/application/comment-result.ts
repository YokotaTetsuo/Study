import type { Dayjs } from 'dayjs';

import type { CommentReadonly } from '../domain/document';

export interface CommentResult {
  readonly id: string;
  readonly authorId: string;
  readonly content: string;
  readonly createdAt: Dayjs;
}

export function toCommentResult(comment: CommentReadonly): CommentResult {
  return {
    id: comment.id.value,
    authorId: comment.authorId.value,
    content: comment.content.value,
    createdAt: comment.createdAt,
  };
}
