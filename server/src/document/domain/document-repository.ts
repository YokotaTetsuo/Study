import type { Document } from './document';
import type { DocumentId } from './document-id';
import type { DocumentProjectId } from './document-project-id';

/**
 * Document 集約の永続化ポート。実装は adapters/gateways。
 */
export interface DocumentRepository {
  findById(id: DocumentId): Promise<Document | null>;
  /** 指定プロジェクトに属する文書を作成日時順で返す。 */
  listByProject(projectId: DocumentProjectId): Promise<readonly Document[]>;
  save(document: Document): Promise<void>;
}
