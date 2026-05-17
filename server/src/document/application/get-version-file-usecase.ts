import type { FileStorage } from '../../shared-kernel/file-storage';
import { StoredFileMissingError } from '../../shared-kernel/stored-file-missing-error';
import { DocumentId } from '../domain/document-id';
import { DocumentNotFoundError } from '../domain/document-not-found-error';
import type { DocumentRepository } from '../domain/document-repository';
import { VersionNotFoundError } from '../domain/version-not-found-error';

import { NotAuthorizedError } from './not-authorized-error';
import type { ProjectAccess } from './project-access';

export interface GetVersionFileQuery {
  readonly documentId: string;
  readonly versionNumber: number;
  readonly actingUserId: string;
}

export interface VersionFileResult {
  readonly data: Uint8Array;
}

interface Deps {
  readonly documents: DocumentRepository;
  readonly projectAccess: ProjectAccess;
  readonly fileStorage: FileStorage;
}

/** 指定版の PDF バイト列を取得する（メンバーのみ）。 */
export class GetVersionFileUseCase {
  readonly #documents: DocumentRepository;
  readonly #projectAccess: ProjectAccess;
  readonly #fileStorage: FileStorage;

  constructor(deps: Deps) {
    this.#documents = deps.documents;
    this.#projectAccess = deps.projectAccess;
    this.#fileStorage = deps.fileStorage;
  }

  async execute(query: GetVersionFileQuery): Promise<VersionFileResult> {
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
    const version = document.findVersion(query.versionNumber);
    if (version === undefined) {
      throw new VersionNotFoundError();
    }
    const data = await this.#fileStorage.get(version.storageKey.value);
    if (data === null) {
      // 版メタデータは在るのに blob が無い = ストレージ不整合（404 ではない）。
      throw new StoredFileMissingError(version.storageKey.value);
    }
    return { data };
  }
}
