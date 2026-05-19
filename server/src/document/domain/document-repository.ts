import type { Document } from './document';
import type { DocumentId } from './document-id';
import type { DocumentProjectId } from './document-project-id';

/**
 * Document 集約の永続化ポート。実装は adapters/gateways。
 */
export interface DocumentRepository {
  findById(id: DocumentId): Promise<Document | null>;
  /** 指定プロジェクトに属する文書を作成日時の昇順で返す。 */
  listByProject(projectId: DocumentProjectId): Promise<readonly Document[]>;
  save(document: Document): Promise<void>;
  /**
   * 文書を削除する。版・コメントは DB の FK ON DELETE CASCADE で
   * 連鎖削除される（`adapters/gateways/schema.ts` 参照）。存在しない
   * 文書の削除は冪等に成功扱いとする（呼び出し側で NotFound 判定済み）。
   */
  delete(id: DocumentId): Promise<void>;
}
