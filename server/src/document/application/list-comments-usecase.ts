import { DocumentId } from '../domain/document-id';
import { DocumentNotFoundError } from '../domain/document-not-found-error';
import type { DocumentRepository } from '../domain/document-repository';
import { VersionNotFoundError } from '../domain/version-not-found-error';

import { toCommentResult } from './comment-result';
import type { CommentResult } from './comment-result';
import { NotAuthorizedError } from './not-authorized-error';
import type { ProjectAccess } from './project-access';

export interface ListCommentsQuery {
  readonly documentId: string;
  readonly versionNumber: number;
  readonly actingUserId: string;
}

interface Deps {
  readonly documents: DocumentRepository;
  readonly projectAccess: ProjectAccess;
}

/** 版のコメント一覧を追加順で返す（プロジェクトメンバーのみ）。 */
export class ListCommentsUseCase {
  readonly #documents: DocumentRepository;
  readonly #projectAccess: ProjectAccess;

  constructor(deps: Deps) {
    this.#documents = deps.documents;
    this.#projectAccess = deps.projectAccess;
  }

  async execute(query: ListCommentsQuery): Promise<readonly CommentResult[]> {
    const document = await this.#documents.findById(
      new DocumentId(query.documentId),
    );
    if (document === null) {
      throw new DocumentNotFoundError();
    }
    if (
      !(await this.#projectAccess.isMember(
        document.projectId.value,
        query.actingUserId,
      ))
    ) {
      throw new NotAuthorizedError();
    }
    if (document.findVersion(query.versionNumber) === undefined) {
      throw new VersionNotFoundError();
    }
    return document.commentsOf(query.versionNumber).map(toCommentResult);
  }
}
