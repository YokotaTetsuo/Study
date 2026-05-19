import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import type { Clock } from '../../shared-kernel/clock';
import type { FileStorage } from '../../shared-kernel/file-storage';
import type { IdGenerator } from '../../shared-kernel/id-generator';
import type { ProjectAccess } from '../application/project-access';
import { Document } from '../domain/document';
import { DocumentId } from '../domain/document-id';
import { DocumentName } from '../domain/document-name';
import { DocumentProjectId } from '../domain/document-project-id';
import type { DocumentRepository } from '../domain/document-repository';

export const FIXED_NOW: Dayjs = dayjs('2026-05-18T00:00:00.000Z');
export const PROJECT_ID = '01HQ8ZK9PRSTVWXYZ234567890';
export const DOCUMENT_ID = '01HQ8ZK9PRSTVWXYZ23456789A';
export const MEMBER_ID = '01HQ8ZK9PRSTVWXYZ23456789C';
export const OUTSIDER_ID = '01HQ8ZK9PRSTVWXYZ23456789D';
// もう 1 人のメンバー（コメント著者以外による削除の検証に使う）。
export const OTHER_MEMBER_ID = '01HQ8ZK9PRSTVWXYZ23456789E';
export const COMMENT_ID = '01HQ8ZK9PRSTVWXYZ23456789F';

export const fixedClock: Clock = { now: () => FIXED_NOW };

export function idGeneratorReturning(id: string): IdGenerator {
  return { generate: () => id };
}

/** 連番で ID を返す（複数版アップロード用）。 */
export function sequentialIdGenerator(prefix: string): IdGenerator {
  let n = 0;
  return {
    generate: (): string => {
      n += 1;
      return `${prefix}${String(n)}`;
    },
  };
}

/**
 * 永続境界を模すため、保存値とは独立した複製を作る。
 * これにより「save() を呼び忘れた集約変更」がテストに漏れない。
 */
function cloneDocument(d: Document): Document {
  return Document.reconstruct({
    id: new DocumentId(d.id.value),
    projectId: new DocumentProjectId(d.projectId.value),
    name: new DocumentName(d.name.value),
    createdAt: d.createdAt,
    versionsData: d.versions.map((v) => ({
      versionNumber: v.versionNumber,
      status: v.status.value,
      storageKey: v.storageKey.value,
      uploadedBy: v.uploadedBy.value,
      createdAt: v.createdAt,
      comments: v.comments.map((c) => ({
        id: c.id.value,
        authorId: c.authorId.value,
        content: c.content.value,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    })),
  });
}

export class InMemoryDocumentRepository implements DocumentRepository {
  readonly #byId = new Map<string, Document>();

  findById(id: DocumentId): Promise<Document | null> {
    const found = this.#byId.get(id.value);
    return Promise.resolve(found === undefined ? null : cloneDocument(found));
  }

  listByProject(projectId: DocumentProjectId): Promise<readonly Document[]> {
    const list = [...this.#byId.values()]
      .filter((d) => d.projectId.equals(projectId))
      .sort((a, b) => a.createdAt.valueOf() - b.createdAt.valueOf())
      .map(cloneDocument);
    return Promise.resolve(list);
  }

  save(document: Document): Promise<void> {
    this.#byId.set(document.id.value, cloneDocument(document));
    return Promise.resolve();
  }

  delete(id: DocumentId): Promise<void> {
    this.#byId.delete(id.value);
    return Promise.resolve();
  }
}

/** インメモリのファイルストレージ。put した内容をそのまま get で返す。 */
export class InMemoryFileStorage implements FileStorage {
  readonly #store = new Map<string, Uint8Array>();

  put(key: string, data: Uint8Array, _contentType: string): Promise<void> {
    // 実ストレージ境界を模し、呼び出し側バッファとの参照共有を断つ。
    this.#store.set(key, new Uint8Array(data));
    return Promise.resolve();
  }

  get(key: string): Promise<Uint8Array | null> {
    const found = this.#store.get(key);
    return Promise.resolve(found === undefined ? null : new Uint8Array(found));
  }
}

/**
 * 指定プロジェクトの指定ユーザーのみメンバーとみなす ProjectAccess。
 * projectId も判定対象にすることで、誤った projectId を渡す回帰を検出する。
 */
export class FakeProjectAccess implements ProjectAccess {
  readonly #projectId: string;
  readonly #members: ReadonlySet<string>;

  constructor(projectId: string, memberUserIds: readonly string[]) {
    this.#projectId = projectId;
    this.#members = new Set(memberUserIds);
  }

  isMember(projectId: string, userId: string): Promise<boolean> {
    return Promise.resolve(
      projectId === this.#projectId && this.#members.has(userId),
    );
  }
}
