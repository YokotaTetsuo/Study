import type { Clock } from '../../shared-kernel/clock';
import type { IdGenerator } from '../../shared-kernel/id-generator';
import { Document } from '../domain/document';
import { DocumentId } from '../domain/document-id';
import { DocumentName } from '../domain/document-name';
import { DocumentProjectId } from '../domain/document-project-id';
import type { DocumentRepository } from '../domain/document-repository';

import { toDocumentResult } from './document-result';
import type { DocumentResult } from './document-result';
import { NotAuthorizedError } from './not-authorized-error';
import type { ProjectAccess } from './project-access';

export interface CreateDocumentCommand {
  readonly projectId: string;
  readonly name: string;
  readonly actingUserId: string;
}

interface Deps {
  readonly documents: DocumentRepository;
  readonly projectAccess: ProjectAccess;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
}

/** プロジェクトに新しい文書を作成する（メンバーのみ）。 */
export class CreateDocumentUseCase {
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

  async execute(command: CreateDocumentCommand): Promise<DocumentResult> {
    if (
      !(await this.#projectAccess.isMember(
        command.projectId,
        command.actingUserId,
      ))
    ) {
      throw new NotAuthorizedError();
    }
    const document = Document.create({
      id: new DocumentId(this.#idGenerator.generate()),
      projectId: new DocumentProjectId(command.projectId),
      name: new DocumentName(command.name),
      createdAt: this.#clock.now(),
    });
    await this.#documents.save(document);
    return toDocumentResult(document);
  }
}
