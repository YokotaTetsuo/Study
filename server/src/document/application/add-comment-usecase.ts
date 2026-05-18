import type { Clock } from '../../shared-kernel/clock';
import type { IdGenerator } from '../../shared-kernel/id-generator';
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

export interface AddCommentCommand {
  readonly documentId: string;
  readonly versionNumber: number;
  readonly actingUserId: string;
  readonly content: string;
}

interface Deps {
  readonly documents: DocumentRepository;
  readonly projectAccess: ProjectAccess;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
}

/** 版にコメントを追加する（プロジェクトメンバーのみ）。 */
export class AddCommentUseCase {
  readonly #documents: DocumentRepository;
  readonly #projectAccess: ProjectAccess;
  readonly #idGenerator: IdGenerator;
  readonly #clock: Clock;

  constructor(deps: Deps) {
    this.#documents = deps.documents;
    this.#projectAccess = deps.projectAccess;
    this.#idGenerator = deps.idGenerator;
    this.#clock = deps.clock;
  }

  async execute(command: AddCommentCommand): Promise<CommentResult> {
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
    // 版未存在は集約が VersionNotFoundError を送出する（単一走査）。
    const comment = document.addComment(command.versionNumber, {
      id: new CommentId(this.#idGenerator.generate()),
      authorId: new CommentAuthorId(command.actingUserId),
      content: new CommentContent(command.content),
      createdAt: this.#clock.now(),
    });
    await this.#documents.save(document);
    return toCommentResult(comment);
  }
}
