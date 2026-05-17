import dayjs from 'dayjs';
import { asc, eq, inArray } from 'drizzle-orm';

import { Document } from '../../domain/document';
import { DocumentId } from '../../domain/document-id';
import { DocumentName } from '../../domain/document-name';
import { DocumentProjectId } from '../../domain/document-project-id';
import type { DocumentRepository } from '../../domain/document-repository';

import type { Database } from './database';
import { documentVersions, documents } from './schema';

export class DrizzleDocumentRepository implements DocumentRepository {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  async findById(id: DocumentId): Promise<Document | null> {
    // 集約を一貫スナップショットから再構築するため単一トランザクションで読む。
    const snapshot = await this.#db.transaction(async (tx) => {
      const docRows = await tx
        .select()
        .from(documents)
        .where(eq(documents.id, id.value))
        .limit(1);
      const docRow = docRows[0];
      if (docRow === undefined) {
        return null;
      }
      const versionRows = await tx
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, id.value))
        .orderBy(asc(documentVersions.versionNumber));
      return { docRow, versionRows };
    });
    if (snapshot === null) {
      return null;
    }
    const { docRow, versionRows } = snapshot;
    return Document.reconstruct({
      id: new DocumentId(docRow.id),
      projectId: new DocumentProjectId(docRow.projectId),
      name: new DocumentName(docRow.name),
      createdAt: dayjs(docRow.createdAt),
      versionsData: versionRows.map((v) => ({
        versionNumber: v.versionNumber,
        status: v.status,
        storageKey: v.storageKey,
        uploadedBy: v.uploadedBy,
        createdAt: dayjs(v.createdAt),
      })),
    });
  }

  async listByProject(
    projectId: DocumentProjectId,
  ): Promise<readonly Document[]> {
    return this.#db.transaction(async (tx) => {
      const docRows = await tx
        .select()
        .from(documents)
        .where(eq(documents.projectId, projectId.value))
        .orderBy(asc(documents.createdAt));
      if (docRows.length === 0) {
        return [];
      }
      // 版は全文書ぶんを 1 クエリで取得し N+1 を避ける。
      const ids = docRows.map((d) => d.id);
      const versionRows = await tx
        .select()
        .from(documentVersions)
        .where(inArray(documentVersions.documentId, ids))
        .orderBy(asc(documentVersions.versionNumber));
      const versionsByDoc = new Map<string, typeof versionRows>();
      for (const v of versionRows) {
        const list = versionsByDoc.get(v.documentId) ?? [];
        list.push(v);
        versionsByDoc.set(v.documentId, list);
      }
      return docRows.map((docRow) =>
        Document.reconstruct({
          id: new DocumentId(docRow.id),
          projectId: new DocumentProjectId(docRow.projectId),
          name: new DocumentName(docRow.name),
          createdAt: dayjs(docRow.createdAt),
          versionsData: (versionsByDoc.get(docRow.id) ?? []).map((v) => ({
            versionNumber: v.versionNumber,
            status: v.status,
            storageKey: v.storageKey,
            uploadedBy: v.uploadedBy,
            createdAt: dayjs(v.createdAt),
          })),
        }),
      );
    });
  }

  async save(document: Document): Promise<void> {
    const docRow = {
      id: document.id.value,
      projectId: document.projectId.value,
      name: document.name.value,
      createdAt: document.createdAt.toDate(),
    };
    const versionRows = document.versions.map((v) => ({
      documentId: document.id.value,
      versionNumber: v.versionNumber,
      status: v.status.value,
      storageKey: v.storageKey.value,
      uploadedBy: v.uploadedBy.value,
      createdAt: v.createdAt.toDate(),
    }));

    await this.#db.transaction(async (tx) => {
      await tx
        .insert(documents)
        .values(docRow)
        .onConflictDoUpdate({
          target: documents.id,
          set: { name: docRow.name },
        });
      await tx
        .delete(documentVersions)
        .where(eq(documentVersions.documentId, document.id.value));
      if (versionRows.length > 0) {
        await tx.insert(documentVersions).values(versionRows);
      }
    });
  }
}
