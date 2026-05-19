import { DocumentId } from '../domain/document-id';
import { DocumentNotFoundError } from '../domain/document-not-found-error';
import type { DocumentRepository } from '../domain/document-repository';

import type { AuthorDirectory } from './author-directory';
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
  readonly authorDirectory: AuthorDirectory;
}

/** 版のコメント一覧を追加順で返す（プロジェクトメンバーのみ）。 */
export class ListCommentsUseCase {
  readonly #documents: DocumentRepository;
  readonly #projectAccess: ProjectAccess;
  readonly #authorDirectory: AuthorDirectory;

  constructor(deps: Deps) {
    this.#documents = deps.documents;
    this.#projectAccess = deps.projectAccess;
    this.#authorDirectory = deps.authorDirectory;
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
    // 版未存在は集約が VersionNotFoundError を送出する（単一走査）。
    const comments = document.commentsOf(query.versionNumber);
    // 同一著者が複数コメントを持つと ID が重複するため一意化してから引く。
    const uniqueAuthorIds = [...new Set(comments.map((c) => c.authorId.value))];
    // 表示名は補助情報。ディレクトリ解決の失敗だけで一覧取得を HTTP 失敗
    // させないため、例外は握り潰して空 Map（＝全件 null フォールバック）
    // とする（AddCommentUseCase と同一方針）。
    let displayNames: ReadonlyMap<string, string> = new Map();
    try {
      displayNames =
        await this.#authorDirectory.findDisplayNames(uniqueAuthorIds);
    } catch (error) {
      // eslint-disable-next-line no-console -- 補助情報の解決失敗を可視化
      console.warn('著者表示名の解決に失敗しました（null で続行）:', error);
    }
    return comments.map((c) =>
      toCommentResult(c, displayNames.get(c.authorId.value) ?? null),
    );
  }
}
