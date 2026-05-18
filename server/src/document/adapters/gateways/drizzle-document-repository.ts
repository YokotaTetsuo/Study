import dayjs from 'dayjs';
import { and, asc, eq, inArray } from 'drizzle-orm';

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
    // 2 回の SELECT を一貫スナップショットで読むため REPEATABLE READ。
    const snapshot = await this.#db.transaction(
      async (tx) => {
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
      },
      { isolationLevel: 'repeatable read' },
    );
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
      officialVersionNumber: docRow.officialVersionNumber,
    });
  }

  async listByProject(
    projectId: DocumentProjectId,
  ): Promise<readonly Document[]> {
    // 文書と版の 2 回の SELECT を一貫スナップショットで読む。
    return this.#db.transaction(
      async (tx) => {
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
          // 複合主キー (document_id, version_number) 順に揃え、
          // グルーピングとソートをインデックスで賄う。
          .orderBy(
            asc(documentVersions.documentId),
            asc(documentVersions.versionNumber),
          );
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
            officialVersionNumber: docRow.officialVersionNumber,
          }),
        );
      },
      { isolationLevel: 'repeatable read' },
    );
  }

  async save(document: Document): Promise<void> {
    const docRow = {
      id: document.id.value,
      projectId: document.projectId.value,
      name: document.name.value,
      createdAt: document.createdAt.toDate(),
      officialVersionNumber: document.officialVersionNumber,
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
          // name と正式版ポインタは更新されうる（publish で official 化）。
          set: {
            name: docRow.name,
            officialVersionNumber: docRow.officialVersionNumber,
          },
        });
      // 版のメタ（storageKey/uploadedBy/createdAt）はイミュータブルだが、
      // status は状態機械で遷移する。未登録版は素の insert で追加し
      // （並行アップロード時の採番衝突は複合主キー違反として伝播）、
      // 既登録版は status のみ UPDATE する。
      const existing = await tx
        .select({ versionNumber: documentVersions.versionNumber })
        .from(documentVersions)
        .where(eq(documentVersions.documentId, document.id.value));
      const persisted = new Set(existing.map((r) => r.versionNumber));
      const toInsert = versionRows.filter(
        (v) => !persisted.has(v.versionNumber),
      );
      if (toInsert.length > 0) {
        await tx.insert(documentVersions).values(toInsert);
      }
      const toUpdate = versionRows.filter((v) =>
        persisted.has(v.versionNumber),
      );
      for (const v of toUpdate) {
        await tx
          .update(documentVersions)
          .set({ status: v.status })
          .where(
            and(
              eq(documentVersions.documentId, document.id.value),
              eq(documentVersions.versionNumber, v.versionNumber),
            ),
          );
      }
    });
  }
}
