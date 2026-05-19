import type { Clock } from '../../shared-kernel/clock';
import { CommentAuthorId } from '../domain/comment-author-id';
import { CommentContent } from '../domain/comment-content';
import { CommentId } from '../domain/comment-id';
import { DocumentId } from '../domain/document-id';
import { DocumentNotFoundError } from '../domain/document-not-found-error';
import type { DocumentRepository } from '../domain/document-repository';

import { toCommentResult } from './comment-result';
import type { CommentResult } from './comment-result';
import { NotAuthorizedError } from './not-authorized-error';
import type { ProjectAccess } from './project-access';

export interface EditCommentCommand {
  readonly documentId: string;
  readonly versionNumber: number;
  readonly commentId: string;
  readonly actingUserId: string;
  readonly content: string;
}

interface Deps {
  readonly documents: DocumentRepository;
  readonly projectAccess: ProjectAccess;
  readonly clock: Clock;
}

/**
 * 版コメントの本文を編集する。プロジェクトメンバーであることに加え、
 * 著者本人のみ編集可（著者判定は集約が CommentForbiddenError で強制）。
 */
export class EditCommentUseCase {
  readonly #documents: DocumentRepository;
  readonly #projectAccess: ProjectAccess;
  readonly #clock: Clock;

  constructor(deps: Deps) {
    this.#documents = deps.documents;
    this.#projectAccess = deps.projectAccess;
    this.#clock = deps.clock;
  }

  async execute(command: EditCommentCommand): Promise<CommentResult> {
    const document = await this.#documents.findById(
      new DocumentId(command.documentId),
    );
    if (document === null) {
      throw new DocumentNotFoundError();
    }
    if (
      !(await this.#projectAccess.isMember(
        document.projectId.value,
        command.actingUserId,
      ))
    ) {
      throw new NotAuthorizedError();
    }
    // 版/コメント未存在・著者違いは集約が各エラーを送出する。
    const comment = document.editComment(
      command.versionNumber,
      new CommentId(command.commentId),
      {
        content: new CommentContent(command.content),
        requesterId: new CommentAuthorId(command.actingUserId),
        editedAt: this.#clock.now(),
      },
    );
    await this.#documents.save(document);
    return toCommentResult(comment);
  }
}
