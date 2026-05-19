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
    // 表示名は補助情報。永続化済みのコメントを HTTP 失敗させないため、
    // ディレクトリ解決の失敗は握り潰して null フォールバックする
    // （これによりコメント追加の原子性／信頼性を担保する）。
    let displayName: string | null = null;
    try {
      const displayNames = await this.#authorDirectory.findDisplayNames([
        comment.authorId.value,
      ]);
      displayName = displayNames.get(comment.authorId.value) ?? null;
    } catch (error) {
      // eslint-disable-next-line no-console -- 補助情報の解決失敗を可視化
      console.warn('著者表示名の解決に失敗しました（null で続行）:', error);
    }
    return toCommentResult(comment, displayName);
  }
}
