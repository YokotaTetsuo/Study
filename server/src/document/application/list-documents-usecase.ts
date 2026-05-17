import { DocumentProjectId } from '../domain/document-project-id';
import type { DocumentRepository } from '../domain/document-repository';

import { toDocumentResult } from './document-result';
import type { DocumentResult } from './document-result';
import { NotAuthorizedError } from './not-authorized-error';
import type { ProjectAccess } from './project-access';

export interface ListDocumentsQuery {
  readonly projectId: string;
  readonly actingUserId: string;
}

interface Deps {
  readonly documents: DocumentRepository;
  readonly projectAccess: ProjectAccess;
}

/** プロジェクト内の文書一覧を返す（メンバーのみ）。 */
export class ListDocumentsUseCase {
  readonly #documents: DocumentRepository;
  readonly #projectAccess: ProjectAccess;

  constructor(deps: Deps) {
    this.#documents = deps.documents;
    this.#projectAccess = deps.projectAccess;
  }

  async execute(query: ListDocumentsQuery): Promise<readonly DocumentResult[]> {
    if (
      !(await this.#projectAccess.isMember(query.projectId, query.actingUserId))
    ) {
      throw new NotAuthorizedError();
    }
    const list = await this.#documents.listByProject(
      new DocumentProjectId(query.projectId),
    );
    return list.map(toDocumentResult);
  }
}
