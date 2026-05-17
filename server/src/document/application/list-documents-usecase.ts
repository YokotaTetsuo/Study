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
    // 認可前に値オブジェクトで検証（不正 ID を 401 でなく検証エラーに）。
    const projectId = new DocumentProjectId(query.projectId);
    if (
      !(await this.#projectAccess.isMember(projectId.value, query.actingUserId))
    ) {
      throw new NotAuthorizedError();
    }
    const list = await this.#documents.listByProject(projectId);
    return list.map(toDocumentResult);
  }
}
