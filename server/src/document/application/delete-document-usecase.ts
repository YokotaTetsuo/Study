import { DocumentId } from '../domain/document-id';
import { DocumentNotFoundError } from '../domain/document-not-found-error';
import type { DocumentRepository } from '../domain/document-repository';

import { NotAuthorizedError } from './not-authorized-error';
import type { ProjectAccess } from './project-access';

export interface DeleteDocumentCommand {
  readonly documentId: string;
  readonly actingUserId: string;
}

interface Deps {
  readonly documents: DocumentRepository;
  readonly projectAccess: ProjectAccess;
}

/**
 * 文書を削除する。プロジェクトメンバーであれば削除でき（document
 * モジュールの認可は一貫して ProjectAccess.isMember 粒度。create/upload
 * 等と整合）、版・コメントは DB の FK ON DELETE CASCADE で連鎖削除される
 * （新規マイグレーション不要。`adapters/gateways/schema.ts` 参照）。
 *
 * 既知の制約: 版 PDF の実体は S3 に残る。FileStorage に削除 API が無く
 * 孤児化するが、本 PR の範囲外（別 issue で対応想定）。
 */
export class DeleteDocumentUseCase {
  readonly #documents: DocumentRepository;
  readonly #projectAccess: ProjectAccess;

  constructor(deps: Deps) {
    this.#documents = deps.documents;
    this.#projectAccess = deps.projectAccess;
  }

  async execute(command: DeleteDocumentCommand): Promise<void> {
    const documentId = new DocumentId(command.documentId);
    const document = await this.#documents.findById(documentId);
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
    await this.#documents.delete(documentId);
  }
}
