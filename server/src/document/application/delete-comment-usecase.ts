import { CommentAuthorId } from '../domain/comment-author-id';
import { CommentId } from '../domain/comment-id';
import { DocumentId } from '../domain/document-id';
import { DocumentNotFoundError } from '../domain/document-not-found-error';
import type { DocumentRepository } from '../domain/document-repository';
import { VersionNotFoundError } from '../domain/version-not-found-error';

import { NotAuthorizedError } from './not-authorized-error';
import type { ProjectAccess } from './project-access';

export interface DeleteCommentCommand {
  readonly documentId: string;
  readonly versionNumber: number;
  readonly commentId: string;
  readonly actingUserId: string;
}

interface Deps {
  readonly documents: DocumentRepository;
  readonly projectAccess: ProjectAccess;
}

/**
 * 版コメントを削除する。プロジェクトメンバーであることに加え、
 * 著者本人のみ削除可（著者判定は集約が CommentForbiddenError で強制）。
 */
export class DeleteCommentUseCase {
  readonly #documents: DocumentRepository;
  readonly #projectAccess: ProjectAccess;

  constructor(deps: Deps) {
    this.#documents = deps.documents;
    this.#projectAccess = deps.projectAccess;
  }

  async execute(command: DeleteCommentCommand): Promise<void> {
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
    // 版未存在の権威的エラーはここ（アプリ境界）の VersionNotFoundError。
    // get-version-file-usecase と同じ事前チェック慣例（集約の
    // InvalidDocumentStateError は集約変更の最終ガードであり別責務）。
    if (document.findVersion(command.versionNumber) === undefined) {
      throw new VersionNotFoundError();
    }
    document.deleteComment(
      command.versionNumber,
      new CommentId(command.commentId),
      new CommentAuthorId(command.actingUserId),
    );
    await this.#documents.save(document);
  }
}
