import { DocumentId } from '../domain/document-id';
import { DocumentName } from '../domain/document-name';
import { DocumentNotFoundError } from '../domain/document-not-found-error';
import type { DocumentRepository } from '../domain/document-repository';

import { toDocumentResult } from './document-result';
import type { DocumentResult } from './document-result';
import { NotAuthorizedError } from './not-authorized-error';
import type { ProjectAccess } from './project-access';

export interface RenameDocumentCommand {
  readonly documentId: string;
  readonly actingUserId: string;
  readonly name: string;
}

interface Deps {
  readonly documents: DocumentRepository;
  readonly projectAccess: ProjectAccess;
}

/** 文書名を変更する（プロジェクトメンバーのみ。楽観ロックは save が担保）。 */
export class RenameDocumentUseCase {
  readonly #documents: DocumentRepository;
  readonly #projectAccess: ProjectAccess;

  constructor(deps: Deps) {
    this.#documents = deps.documents;
    this.#projectAccess = deps.projectAccess;
  }

  async execute(command: RenameDocumentCommand): Promise<DocumentResult> {
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
    document.rename(new DocumentName(command.name));
    await this.#documents.save(document);
    return toDocumentResult(document);
  }
}
