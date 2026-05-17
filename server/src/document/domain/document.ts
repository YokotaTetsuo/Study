import type { Dayjs } from 'dayjs';

import type { DocumentId } from './document-id';
import type { DocumentName } from './document-name';
import type { DocumentProjectId } from './document-project-id';
import { InvalidDocumentStateError } from './invalid-document-state-error';
import { StorageKey } from './storage-key';
import { UploaderId } from './uploader-id';
import { VersionStatus } from './version-status';

class DocumentVersion {
  readonly #versionNumber: number;
  readonly #status: VersionStatus;
  readonly #storageKey: StorageKey;
  readonly #uploadedBy: UploaderId;
  readonly #createdAt: Dayjs;

  private constructor(params: {
    versionNumber: number;
    status: VersionStatus;
    storageKey: StorageKey;
    uploadedBy: UploaderId;
    createdAt: Dayjs;
  }) {
    this.#versionNumber = params.versionNumber;
    this.#status = params.status;
    this.#storageKey = params.storageKey;
    this.#uploadedBy = params.uploadedBy;
    this.#createdAt = params.createdAt;
  }

  static create(params: {
    versionNumber: number;
    storageKey: StorageKey;
    uploadedBy: UploaderId;
    createdAt: Dayjs;
  }): DocumentVersion {
    return new DocumentVersion({
      versionNumber: params.versionNumber,
      status: VersionStatus.draft(),
      storageKey: params.storageKey,
      uploadedBy: params.uploadedBy,
      createdAt: params.createdAt,
    });
  }

  static reconstruct(params: {
    versionNumber: number;
    status: VersionStatus;
    storageKey: StorageKey;
    uploadedBy: UploaderId;
    createdAt: Dayjs;
  }): DocumentVersion {
    return new DocumentVersion(params);
  }

  get versionNumber(): number {
    return this.#versionNumber;
  }

  get status(): VersionStatus {
    return this.#status;
  }

  get storageKey(): StorageKey {
    return this.#storageKey;
  }

  get uploadedBy(): UploaderId {
    return this.#uploadedBy;
  }

  get createdAt(): Dayjs {
    return this.#createdAt;
  }
}

/**
 * 集約外から内部エンティティ DocumentVersion を読み取るビュー型。
 * mutator を含めず集約境界をコンパイラ強制する。
 */
export interface VersionReadonly {
  readonly versionNumber: number;
  readonly status: VersionStatus;
  readonly storageKey: StorageKey;
  readonly uploadedBy: UploaderId;
  readonly createdAt: Dayjs;
}

/**
 * 文書集約ルート。版（内部エンティティ）を線形に束ねる。
 * 不変条件: 版番号は 1 から連番で欠番なし。
 */
export class Document {
  readonly #id: DocumentId;
  readonly #projectId: DocumentProjectId;
  readonly #name: DocumentName;
  readonly #createdAt: Dayjs;
  readonly #versions: DocumentVersion[];

  private constructor(params: {
    id: DocumentId;
    projectId: DocumentProjectId;
    name: DocumentName;
    createdAt: Dayjs;
    versions: DocumentVersion[];
  }) {
    this.#id = params.id;
    this.#projectId = params.projectId;
    this.#name = params.name;
    this.#createdAt = params.createdAt;
    this.#versions = params.versions;
  }

  static create(params: {
    id: DocumentId;
    projectId: DocumentProjectId;
    name: DocumentName;
    createdAt: Dayjs;
  }): Document {
    return new Document({
      id: params.id,
      projectId: params.projectId,
      name: params.name,
      createdAt: params.createdAt,
      versions: [],
    });
  }

  static reconstruct(params: {
    id: DocumentId;
    projectId: DocumentProjectId;
    name: DocumentName;
    createdAt: Dayjs;
    versionsData: readonly {
      readonly versionNumber: number;
      readonly status: string;
      readonly storageKey: string;
      readonly uploadedBy: string;
      readonly createdAt: Dayjs;
    }[];
  }): Document {
    const sorted = [...params.versionsData].sort(
      (a, b) => a.versionNumber - b.versionNumber,
    );
    // 不変条件: 版番号は 1 からの連番で欠番・重複なし。
    if (sorted.some((d, i) => d.versionNumber !== i + 1)) {
      throw new InvalidDocumentStateError(
        '版番号が 1 からの連番になっていません',
      );
    }
    const versions = sorted.map((d) =>
      DocumentVersion.reconstruct({
        versionNumber: d.versionNumber,
        status: VersionStatus.fromString(d.status),
        storageKey: new StorageKey(d.storageKey),
        uploadedBy: new UploaderId(d.uploadedBy),
        createdAt: d.createdAt,
      }),
    );
    return new Document({
      id: params.id,
      projectId: params.projectId,
      name: params.name,
      createdAt: params.createdAt,
      versions,
    });
  }

  #nextVersionNumber(): number {
    return this.#versions.length + 1;
  }

  addVersion(params: {
    storageKey: StorageKey;
    uploadedBy: UploaderId;
    createdAt: Dayjs;
  }): VersionReadonly {
    const version = DocumentVersion.create({
      versionNumber: this.#nextVersionNumber(),
      storageKey: params.storageKey,
      uploadedBy: params.uploadedBy,
      createdAt: params.createdAt,
    });
    this.#versions.push(version);
    return version;
  }

  findVersion(versionNumber: number): VersionReadonly | undefined {
    return this.#versions.find((v) => v.versionNumber === versionNumber);
  }

  get id(): DocumentId {
    return this.#id;
  }

  get projectId(): DocumentProjectId {
    return this.#projectId;
  }

  get name(): DocumentName {
    return this.#name;
  }

  get createdAt(): Dayjs {
    return this.#createdAt;
  }

  get versions(): readonly VersionReadonly[] {
    return [...this.#versions];
  }
}
