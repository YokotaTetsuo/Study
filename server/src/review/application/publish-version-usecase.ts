import { toDocumentResult } from '../../document/application/document-result';
import type { DocumentResult } from '../../document/application/document-result';
import { DocumentId } from '../../document/domain/document-id';
import { DocumentNotFoundError } from '../../document/domain/document-not-found-error';
import type { DocumentRepository } from '../../document/domain/document-repository';
import type { ProjectRepository } from '../../project/domain/project-repository';

import { NotAuthorizedError } from './not-authorized-error';
import { resolveProjectContext } from './project-context';

export interface PublishVersionCommand {
  readonly documentId: string;
  readonly versionNumber: number;
  readonly actingUserId: string;
}

interface Deps {
  readonly documents: DocumentRepository;
  readonly projects: ProjectRepository;
}

/**
 * 承認済みの版を正式版として公開する（approved → official）。
 * owner のみ実行可。Document 単一集約の更新。
 */
export class PublishVersionUseCase {
  readonly #documents: DocumentRepository;
  readonly #projects: ProjectRepository;

  constructor(deps: Deps) {
    this.#documents = deps.documents;
    this.#projects = deps.projects;
  }

  async execute(command: PublishVersionCommand): Promise<DocumentResult> {
    const document = await this.#documents.findById(
      new DocumentId(command.documentId),
    );
    if (document === null) {
      throw new DocumentNotFoundError();
    }
    const ctx = await resolveProjectContext(
      this.#projects,
      document.projectId.value,
      command.actingUserId,
    );
    if (!ctx.isOwner) {
      throw new NotAuthorizedError();
    }
    document.publishVersion(command.versionNumber);
    await this.#documents.save(document);
    return toDocumentResult(document);
  }
}
