import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import type { Clock } from '../../shared-kernel/clock';
import type { FileStorage } from '../../shared-kernel/file-storage';
import type { IdGenerator } from '../../shared-kernel/id-generator';
import type { ProjectAccess } from '../application/project-access';
import type { Document } from '../domain/document';
import type { DocumentId } from '../domain/document-id';
import type { DocumentProjectId } from '../domain/document-project-id';
import type { DocumentRepository } from '../domain/document-repository';

export const FIXED_NOW: Dayjs = dayjs('2026-05-18T00:00:00.000Z');
export const PROJECT_ID = '01HQ8ZK9PRSTVWXYZ234567890';
export const DOCUMENT_ID = '01HQ8ZK9PRSTVWXYZ23456789A';
export const VERSION_ID = '01HQ8ZK9PRSTVWXYZ23456789B';
export const MEMBER_ID = '01HQ8ZK9PRSTVWXYZ23456789C';
export const OUTSIDER_ID = '01HQ8ZK9PRSTVWXYZ23456789D';

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

export class InMemoryDocumentRepository implements DocumentRepository {
  readonly #byId = new Map<string, Document>();

  findById(id: DocumentId): Promise<Document | null> {
    return Promise.resolve(this.#byId.get(id.value) ?? null);
  }

  listByProject(projectId: DocumentProjectId): Promise<readonly Document[]> {
    const list = [...this.#byId.values()].filter((d) =>
      d.projectId.equals(projectId),
    );
    return Promise.resolve(list);
  }

  save(document: Document): Promise<void> {
    this.#byId.set(document.id.value, document);
    return Promise.resolve();
  }
}

/** インメモリのファイルストレージ。put した内容をそのまま get で返す。 */
export class InMemoryFileStorage implements FileStorage {
  readonly #store = new Map<string, Uint8Array>();

  put(key: string, data: Uint8Array, _contentType: string): Promise<void> {
    this.#store.set(key, data);
    return Promise.resolve();
  }

  get(key: string): Promise<Uint8Array | null> {
    return Promise.resolve(this.#store.get(key) ?? null);
  }
}

/** 指定ユーザー集合のみメンバーとみなす ProjectAccess。 */
export class FakeProjectAccess implements ProjectAccess {
  readonly #members: ReadonlySet<string>;

  constructor(memberUserIds: readonly string[]) {
    this.#members = new Set(memberUserIds);
  }

  isMember(_projectId: string, userId: string): Promise<boolean> {
    return Promise.resolve(this.#members.has(userId));
  }
}
