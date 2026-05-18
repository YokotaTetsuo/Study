import { toDocumentResult } from '../../document/application/document-result';
import type { DocumentResult } from '../../document/application/document-result';
import { DocumentId } from '../../document/domain/document-id';
import { DocumentNotFoundError } from '../../document/domain/document-not-found-error';
import type { ProjectRepository } from '../../project/domain/project-repository';

import { NotAuthorizedError } from './not-authorized-error';
import { resolveProjectContext } from './project-context';
import type { Transactor } from './unit-of-work';

export interface PublishVersionCommand {
  readonly documentId: string;
  readonly versionNumber: number;
  readonly actingUserId: string;
}

interface Deps {
  readonly transactor: Transactor;
  readonly projects: ProjectRepository;
}

/**
 * 承認済みの版を正式版として公開する（approved → official）。
 * owner のみ実行可。read→mutate→save を 1 トランザクションで行い、
 * 並行する状態遷移によるロストアップデートを防ぐ。
 */
export class PublishVersionUseCase {
  readonly #transactor: Transactor;
  readonly #projects: ProjectRepository;

  constructor(deps: Deps) {
    this.#transactor = deps.transactor;
    this.#projects = deps.projects;
  }

  async execute(command: PublishVersionCommand): Promise<DocumentResult> {
    return this.#transactor.run(async ({ documents }) => {
      const document = await documents.findById(
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
      await documents.save(document);
      return toDocumentResult(document);
    });
  }
}
