import type { Clock } from '../../shared-kernel/clock';
import type { FileStorage } from '../../shared-kernel/file-storage';
import type { IdGenerator } from '../../shared-kernel/id-generator';
import { DocumentId } from '../domain/document-id';
import { DocumentNotFoundError } from '../domain/document-not-found-error';
import type { DocumentRepository } from '../domain/document-repository';
import { StorageKey } from '../domain/storage-key';
import { UploaderId } from '../domain/uploader-id';

import { toDocumentResult } from './document-result';
import type { DocumentResult } from './document-result';
import { NotAuthorizedError } from './not-authorized-error';
import type { ProjectAccess } from './project-access';
import { UnsupportedContentTypeError } from './unsupported-content-type-error';

const PDF_CONTENT_TYPE = 'application/pdf';

export interface UploadVersionCommand {
  readonly documentId: string;
  readonly actingUserId: string;
  readonly data: Uint8Array;
  readonly contentType: string;
}

interface Deps {
  readonly documents: DocumentRepository;
  readonly projectAccess: ProjectAccess;
  readonly fileStorage: FileStorage;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
}

/** 文書に新しい版（PDF）をアップロードする（メンバーのみ）。 */
export class UploadVersionUseCase {
  readonly #documents: DocumentRepository;
  readonly #projectAccess: ProjectAccess;
  readonly #fileStorage: FileStorage;
  readonly #idGenerator: IdGenerator;
  readonly #clock: Clock;

  constructor(deps: Deps) {
    this.#documents = deps.documents;
    this.#projectAccess = deps.projectAccess;
    this.#fileStorage = deps.fileStorage;
    this.#idGenerator = deps.idGenerator;
    this.#clock = deps.clock;
  }

  async execute(command: UploadVersionCommand): Promise<DocumentResult> {
    // 版は PDF のみ。ペイロード署名・サイズ上限の検証は PR 3.2 の
    // controller 境界（multipart 受け口）で行う。
    if (command.contentType.trim().toLowerCase() !== PDF_CONTENT_TYPE) {
      throw new UnsupportedContentTypeError(command.contentType);
    }
    // 検証は正規化値で行うため、保存メタデータも正規形に統一する。
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
    const storageKey = new StorageKey(
      `documents/${document.id.value}/${this.#idGenerator.generate()}.pdf`,
    );
    await this.#fileStorage.put(
      storageKey.value,
      command.data,
      PDF_CONTENT_TYPE,
    );
    document.addVersion({
      storageKey,
      uploadedBy: new UploaderId(command.actingUserId),
      createdAt: this.#clock.now(),
    });
    await this.#documents.save(document);
    return toDocumentResult(document);
  }
}
