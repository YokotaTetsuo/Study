import type { Clock } from '../../shared-kernel/clock';
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
  readonly authorDirectory: AuthorDirectory;
  readonly clock: Clock;
}

/**
 * 版コメントの本文を編集する。プロジェクトメンバーであることに加え、
 * 著者本人のみ編集可（著者判定は集約が CommentForbiddenError で強制）。
 */
export class EditCommentUseCase {
  readonly #documents: DocumentRepository;
  readonly #projectAccess: ProjectAccess;
  readonly #authorDirectory: AuthorDirectory;
  readonly #clock: Clock;

  constructor(deps: Deps) {
    this.#documents = deps.documents;
    this.#projectAccess = deps.projectAccess;
    this.#authorDirectory = deps.authorDirectory;
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
    const { comment, changed } = document.editComment(
      command.versionNumber,
      new CommentId(command.commentId),
      {
        content: new CommentContent(command.content),
        requesterId: new CommentAuthorId(command.actingUserId),
        editedAt: this.#clock.now(),
      },
    );
    // 正規化後本文が同一なら no-op（updatedAt 不変）。保存すると
    // revision だけが進み、不要 UPDATE・競合（StaleDocumentError）を
    // 招くため、変更があった場合のみ永続化する。
    if (changed) {
      await this.#documents.save(document);
    }
    // 表示名は補助情報。編集の永続化を HTTP 失敗させないため、ディレクトリ
    // 解決の失敗は握り潰して null フォールバックする（AddCommentUseCase と
    // 同一方針）。
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
