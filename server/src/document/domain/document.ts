import type { Dayjs } from 'dayjs';

import { CommentAuthorId } from './comment-author-id';
import { CommentContent } from './comment-content';
import { CommentForbiddenError } from './comment-forbidden-error';
import { CommentId } from './comment-id';
import { CommentNotFoundError } from './comment-not-found-error';
import type { DocumentId } from './document-id';
import type { DocumentName } from './document-name';
import type { DocumentProjectId } from './document-project-id';
import { InvalidDocumentStateError } from './invalid-document-state-error';
import { StorageKey } from './storage-key';
import { UploaderId } from './uploader-id';
import { VersionStatus } from './version-status';

/**
 * 版に紐づくコメント（Document 集約の内部エンティティ）。
 * クラスは export せず、集約ルート経由でのみ生成・削除する
 * （`server-aggregate-internal-entity.md`）。本文は不変で、編集はしない。
 */
class Comment {
  readonly #id: CommentId;
  readonly #authorId: CommentAuthorId;
  readonly #content: CommentContent;
  readonly #createdAt: Dayjs;

  private constructor(params: {
    id: CommentId;
    authorId: CommentAuthorId;
    content: CommentContent;
    createdAt: Dayjs;
  }) {
    this.#id = params.id;
    this.#authorId = params.authorId;
    this.#content = params.content;
    this.#createdAt = params.createdAt;
  }

  static create(params: {
    id: CommentId;
    authorId: CommentAuthorId;
    content: CommentContent;
    createdAt: Dayjs;
  }): Comment {
    return new Comment(params);
  }

  static reconstruct(params: {
    id: CommentId;
    authorId: CommentAuthorId;
    content: CommentContent;
    createdAt: Dayjs;
  }): Comment {
    return new Comment(params);
  }

  get id(): CommentId {
    return this.#id;
  }

  get authorId(): CommentAuthorId {
    return this.#authorId;
  }

  get content(): CommentContent {
    return this.#content;
  }

  get createdAt(): Dayjs {
    return this.#createdAt;
  }
}

/**
 * 集約外から内部エンティティ Comment を読み取るビュー型。
 * mutator を含めず集約境界をコンパイラ強制する。
 */
export interface CommentReadonly {
  readonly id: CommentId;
  readonly authorId: CommentAuthorId;
  readonly content: CommentContent;
  readonly createdAt: Dayjs;
}

class DocumentVersion {
  readonly #versionNumber: number;
  #status: VersionStatus;
  readonly #storageKey: StorageKey;
  readonly #uploadedBy: UploaderId;
  readonly #createdAt: Dayjs;
  // 追加順（= createdAt 昇順）で保持する。スレッド表示はこの順。
  readonly #comments: Comment[];

  private constructor(params: {
    versionNumber: number;
    status: VersionStatus;
    storageKey: StorageKey;
    uploadedBy: UploaderId;
    createdAt: Dayjs;
    comments: Comment[];
  }) {
    this.#versionNumber = params.versionNumber;
    this.#status = params.status;
    this.#storageKey = params.storageKey;
    this.#uploadedBy = params.uploadedBy;
    this.#createdAt = params.createdAt;
    this.#comments = params.comments;
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
      comments: [],
    });
  }

  static reconstruct(params: {
    versionNumber: number;
    status: VersionStatus;
    storageKey: StorageKey;
    uploadedBy: UploaderId;
    createdAt: Dayjs;
    commentsData: readonly {
      readonly id: string;
      readonly authorId: string;
      readonly content: string;
      readonly createdAt: Dayjs;
    }[];
  }): DocumentVersion {
    const comments = [...params.commentsData]
      .sort((a, b) => a.createdAt.valueOf() - b.createdAt.valueOf())
      .map((d) =>
        Comment.reconstruct({
          id: new CommentId(d.id),
          authorId: new CommentAuthorId(d.authorId),
          content: new CommentContent(d.content),
          createdAt: d.createdAt,
        }),
      );
    return new DocumentVersion({
      versionNumber: params.versionNumber,
      status: params.status,
      storageKey: params.storageKey,
      uploadedBy: params.uploadedBy,
      createdAt: params.createdAt,
      comments,
    });
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

  // 状態遷移は VersionStatus 状態機械に委譲し、結果を自身へ反映する。
  // 不正遷移は VersionStatus が InvalidVersionTransitionError を送出する。
  submit(): void {
    this.#status = this.#status.submit();
  }

  approve(): void {
    this.#status = this.#status.approve();
  }

  requestChanges(): void {
    this.#status = this.#status.requestChanges();
  }

  reject(): void {
    this.#status = this.#status.reject();
  }

  publish(): void {
    this.#status = this.#status.publish();
  }

  get comments(): readonly CommentReadonly[] {
    return [...this.#comments];
  }

  addComment(params: {
    id: CommentId;
    authorId: CommentAuthorId;
    content: CommentContent;
    createdAt: Dayjs;
  }): CommentReadonly {
    const comment = Comment.create(params);
    // createdAt 昇順を不変条件として保持する。呼び出し側クロックの
    // 単調性に依存せず、最初に「より新しい」要素の手前へ挿入する
    // （同時刻は既存の後 = 挿入順を保ち、安定ソートする reconstruct と
    // ラウンドトリップ後も順序が一致する）。
    const at = this.#comments.findIndex(
      (c) => c.createdAt.valueOf() > params.createdAt.valueOf(),
    );
    if (at === -1) {
      this.#comments.push(comment);
    } else {
      this.#comments.splice(at, 0, comment);
    }
    return comment;
  }

  /** 著者本人のみ削除可。未存在は NotFound、著者違いは Forbidden。 */
  deleteComment(commentId: CommentId, requesterId: CommentAuthorId): void {
    const index = this.#comments.findIndex((c) => c.id.equals(commentId));
    if (index === -1) {
      throw new CommentNotFoundError();
    }
    const comment = this.#comments[index];
    if (!comment?.authorId.equals(requesterId)) {
      throw new CommentForbiddenError();
    }
    this.#comments.splice(index, 1);
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
  readonly comments: readonly CommentReadonly[];
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
  // 正式版ポインタ。null=未公開。official 状態の版のみが指される。
  #officialVersionNumber: number | null;
  // 楽観ロック用リビジョン。読み込み時の値を保持し、保存時の競合検出に使う。
  #revision: number;

  private constructor(params: {
    id: DocumentId;
    projectId: DocumentProjectId;
    name: DocumentName;
    createdAt: Dayjs;
    versions: DocumentVersion[];
    officialVersionNumber: number | null;
    revision: number;
  }) {
    this.#id = params.id;
    this.#projectId = params.projectId;
    this.#name = params.name;
    this.#createdAt = params.createdAt;
    this.#versions = params.versions;
    this.#officialVersionNumber = params.officialVersionNumber;
    this.#revision = params.revision;
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
      officialVersionNumber: null,
      revision: 0,
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
      readonly comments?: readonly {
        readonly id: string;
        readonly authorId: string;
        readonly content: string;
        readonly createdAt: Dayjs;
      }[];
    }[];
    officialVersionNumber?: number | null;
    revision?: number;
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
        commentsData: d.comments ?? [],
      }),
    );
    const officialVersionNumber = params.officialVersionNumber ?? null;
    if (officialVersionNumber !== null) {
      const official = versions.find(
        (v) => v.versionNumber === officialVersionNumber,
      );
      // 不変条件: 正式版ポインタは official 状態の版のみを指す。
      if (official?.status.value !== 'official') {
        throw new InvalidDocumentStateError(
          '正式版ポインタが official 状態の版を指していません',
        );
      }
    }
    return new Document({
      id: params.id,
      projectId: params.projectId,
      name: params.name,
      createdAt: params.createdAt,
      versions,
      officialVersionNumber,
      revision: params.revision ?? 0,
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

  #requireVersion(versionNumber: number): DocumentVersion {
    const version = this.#versions.find(
      (v) => v.versionNumber === versionNumber,
    );
    if (version === undefined) {
      throw new InvalidDocumentStateError(
        `版 ${String(versionNumber)} が存在しません`,
      );
    }
    return version;
  }

  /** 版を提出する（draft → under_review）。 */
  submitVersion(versionNumber: number): void {
    this.#requireVersion(versionNumber).submit();
  }

  /** 版を承認済みにする（under_review → approved）。 */
  approveVersion(versionNumber: number): void {
    this.#requireVersion(versionNumber).approve();
  }

  /** 版を差戻しにする（under_review → changes_requested）。 */
  requestChangesOnVersion(versionNumber: number): void {
    this.#requireVersion(versionNumber).requestChanges();
  }

  /** 版を却下する（under_review → rejected）。 */
  rejectVersion(versionNumber: number): void {
    this.#requireVersion(versionNumber).reject();
  }

  /**
   * 版を正式版として公開する（approved → official）。
   * 正式版ポインタを更新する。official 化は VersionStatus 側で
   * approved からのみ許可されるため「正式版は Approved 済みの版のみ」を保証。
   */
  publishVersion(versionNumber: number): void {
    const version = this.#requireVersion(versionNumber);
    version.publish();
    this.#officialVersionNumber = versionNumber;
  }

  /** 版にコメントを追加し、追加されたコメントの読み取りビューを返す。 */
  addComment(
    versionNumber: number,
    params: {
      id: CommentId;
      authorId: CommentAuthorId;
      content: CommentContent;
      createdAt: Dayjs;
    },
  ): CommentReadonly {
    return this.#requireVersion(versionNumber).addComment(params);
  }

  /** 版コメントを削除する（著者本人のみ。版/コメント未存在は各エラー）。 */
  deleteComment(
    versionNumber: number,
    commentId: CommentId,
    requesterId: CommentAuthorId,
  ): void {
    this.#requireVersion(versionNumber).deleteComment(commentId, requesterId);
  }

  /** 版のコメント一覧（追加順）。 */
  commentsOf(versionNumber: number): readonly CommentReadonly[] {
    return this.#requireVersion(versionNumber).comments;
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

  get officialVersionNumber(): number | null {
    return this.#officialVersionNumber;
  }

  /** 読み込み時の楽観ロックリビジョン（永続化での競合検出に使う）。 */
  get revision(): number {
    return this.#revision;
  }

  /**
   * 永続化成功後に DB 側の確定リビジョンを集約へ反映する（Repository 専用）。
   * 同一リクエスト内で同じ集約を再 save しても revision 不一致で
   * StaleDocumentError にならないようにするためのフック。
   */
  syncRevision(revision: number): void {
    this.#revision = revision;
  }

  get versions(): readonly VersionReadonly[] {
    return [...this.#versions];
  }
}
