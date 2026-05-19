import type { Clock } from '../../shared-kernel/clock';
import type { IdGenerator } from '../../shared-kernel/id-generator';
import { CommentAuthorId } from '../domain/comment-author-id';
import { CommentContent } from '../domain/comment-content';
import { CommentId } from '../domain/comment-id';
import { DocumentId } from '../domain/document-id';
import { DocumentNotFoundError } from '../domain/document-not-found-error';
import type { DocumentRepository } from '../domain/document-repository';

import type { AuthorDirectory } from './author-directory';
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
  readonly authorDirectory: AuthorDirectory;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
}

/** 版にコメントを追加する（プロジェクトメンバーのみ）。 */
export class AddCommentUseCase {
  readonly #documents: DocumentRepository;
  readonly #projectAccess: ProjectAccess;
  readonly #authorDirectory: AuthorDirectory;
  readonly #idGenerator: IdGenerator;
  readonly #clock: Clock;

  constructor(deps: Deps) {
    this.#documents = deps.documents;
    this.#projectAccess = deps.projectAccess;
    this.#authorDirectory = deps.authorDirectory;
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
    // 表示名は補助情報。解決失敗の握り潰しと警告ログは
    // ResilientAuthorDirectory が一元的に担保する（findDisplayNames は
    // throw せず、未解決 ID は Map に含めない契約）。ここでは Map に
    // 無ければ null フォールバックするだけ。
    const displayNames = await this.#authorDirectory.findDisplayNames([
      comment.authorId.value,
    ]);
    const displayName = displayNames.get(comment.authorId.value) ?? null;
    return toCommentResult(comment, displayName);
  }
}
