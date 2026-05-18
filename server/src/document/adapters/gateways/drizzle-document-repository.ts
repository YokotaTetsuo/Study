import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { Document } from '../../domain/document';
import { DocumentId } from '../../domain/document-id';
import { DocumentName } from '../../domain/document-name';
import { DocumentProjectId } from '../../domain/document-project-id';
import type { DocumentRepository } from '../../domain/document-repository';
import { StaleDocumentError } from '../../domain/stale-document-error';

import type { DbOrTx } from './database';
import { documentComments, documentVersions, documents } from './schema';

/** 版番号ごとにコメント生データをまとめる（reconstruct へ渡す形）。 */
interface CommentData {
  id: string;
  authorId: string;
  content: string;
  createdAt: Dayjs;
}

function commentsByVersion(
  rows: readonly {
    id: string;
    versionNumber: number;
    authorId: string;
    content: string;
    createdAt: Date;
  }[],
): Map<number, CommentData[]> {
  const map = new Map<number, CommentData[]>();
  for (const c of rows) {
    const list = map.get(c.versionNumber) ?? [];
    list.push({
      id: c.id,
      authorId: c.authorId,
      content: c.content,
      createdAt: dayjs(c.createdAt),
    });
    map.set(c.versionNumber, list);
  }
  return map;
}

export class DrizzleDocumentRepository implements DocumentRepository {
  readonly #db: DbOrTx;
  // 外側（DrizzleTransactor）が既に tx 境界を張っている場合 true。
  // その際は内部で transaction を張らずネスト savepoint を避ける。
  readonly #inTx: boolean;

  constructor(db: DbOrTx, inTx = false) {
    this.#db = db;
    this.#inTx = inTx;
  }

  #withTx<T>(
    work: (conn: DbOrTx) => Promise<T>,
    opts?: { readonly isolationLevel: 'repeatable read' },
  ): Promise<T> {
    if (this.#inTx) {
      return work(this.#db);
    }
    return opts === undefined
      ? this.#db.transaction(work)
      : this.#db.transaction(work, opts);
  }

  async findById(id: DocumentId): Promise<Document | null> {
    // 2 回の SELECT を一貫スナップショットで読むため REPEATABLE READ。
    const snapshot = await this.#withTx(
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
        const commentRows = await tx
          .select()
          .from(documentComments)
          .where(eq(documentComments.documentId, id.value))
          .orderBy(
            asc(documentComments.versionNumber),
            asc(documentComments.createdAt),
          );
        return { docRow, versionRows, commentRows };
      },
      { isolationLevel: 'repeatable read' },
    );
    if (snapshot === null) {
      return null;
    }
    const { docRow, versionRows, commentRows } = snapshot;
    const byVersion = commentsByVersion(commentRows);
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
        comments: byVersion.get(v.versionNumber) ?? [],
      })),
      officialVersionNumber: docRow.officialVersionNumber,
      revision: docRow.revision,
    });
  }

  async listByProject(
    projectId: DocumentProjectId,
  ): Promise<readonly Document[]> {
    // 文書と版の 2 回の SELECT を一貫スナップショットで読む。
    return this.#withTx(
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
        // コメントも全文書ぶんを 1 クエリで取得し N+1 を避ける。
        const commentRows = await tx
          .select()
          .from(documentComments)
          .where(inArray(documentComments.documentId, ids))
          .orderBy(
            asc(documentComments.documentId),
            asc(documentComments.versionNumber),
            asc(documentComments.createdAt),
          );
        const commentsByDoc = new Map<string, typeof commentRows>();
        for (const c of commentRows) {
          const list = commentsByDoc.get(c.documentId) ?? [];
          list.push(c);
          commentsByDoc.set(c.documentId, list);
        }
        return docRows.map((docRow) => {
          const byVersion = commentsByVersion(
            commentsByDoc.get(docRow.id) ?? [],
          );
          return Document.reconstruct({
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
              comments: byVersion.get(v.versionNumber) ?? [],
            })),
            officialVersionNumber: docRow.officialVersionNumber,
            revision: docRow.revision,
          });
        });
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

    await this.#withTx(async (tx) => {
      // 楽観ロック: 既存文書は読み込み時 revision と一致する場合のみ更新し、
      // revision を +1 する。不一致（= 読み込み後に別 tx が更新）なら
      // ステール書き込みとして拒否し、巻き戻しを防ぐ。
      const current = await tx
        .select({ revision: documents.revision })
        .from(documents)
        .where(eq(documents.id, document.id.value))
        .limit(1);
      let nextRevision: number;
      if (current.length === 0) {
        await tx.insert(documents).values({ ...docRow, revision: 0 });
        nextRevision = 0;
      } else {
        nextRevision = document.revision + 1;
        const updated = await tx
          .update(documents)
          .set({
            // name と正式版ポインタは更新されうる（publish で official 化）。
            name: docRow.name,
            officialVersionNumber: docRow.officialVersionNumber,
            revision: nextRevision,
          })
          .where(
            and(
              eq(documents.id, document.id.value),
              eq(documents.revision, document.revision),
            ),
          )
          .returning({ id: documents.id });
        if (updated.length === 0) {
          throw new StaleDocumentError();
        }
      }
      // 永続化済みリビジョンを集約へ反映し、同一インスタンスの再 save を可能にする。
      document.syncRevision(nextRevision);
      // 版のメタ（storageKey/uploadedBy/createdAt）はイミュータブルだが、
      // status は状態機械で遷移する。未登録版は素の insert で追加し
      // （並行アップロード時の採番衝突は複合主キー違反として伝播）、
      // 既登録版は status のみ UPDATE する。
      const existing = await tx
        .select({
          versionNumber: documentVersions.versionNumber,
          status: documentVersions.status,
        })
        .from(documentVersions)
        .where(eq(documentVersions.documentId, document.id.value));
      const persistedStatus = new Map(
        existing.map((r) => [r.versionNumber, r.status]),
      );
      const toInsert = versionRows.filter(
        (v) => !persistedStatus.has(v.versionNumber),
      );
      if (toInsert.length > 0) {
        await tx.insert(documentVersions).values(toInsert);
      }
      // 既登録版は status が実際に遷移した行だけを対象にし、
      // status ごとにまとめて 1 UPDATE する（distinct status は最大 6）。
      // 不要な UPDATE による無駄なロック/直列化失敗を避ける。
      const byStatus = new Map<string, number[]>();
      for (const v of versionRows) {
        const prev = persistedStatus.get(v.versionNumber);
        if (prev === undefined || prev === v.status) {
          continue;
        }
        const list = byStatus.get(v.status) ?? [];
        list.push(v.versionNumber);
        byStatus.set(v.status, list);
      }
      for (const [status, versionNumbers] of byStatus) {
        await tx
          .update(documentVersions)
          .set({ status })
          .where(
            and(
              eq(documentVersions.documentId, document.id.value),
              inArray(documentVersions.versionNumber, versionNumbers),
            ),
          );
      }
      // コメントはイミュータブル（編集なし）。集約と DB の差分から
      // 新規追加分を insert、削除分を delete するだけで同期できる。
      const aggregateComments = document.versions.flatMap((v) =>
        v.comments.map((c) => ({
          id: c.id.value,
          documentId: document.id.value,
          versionNumber: v.versionNumber,
          authorId: c.authorId.value,
          content: c.content.value,
          createdAt: c.createdAt.toDate(),
        })),
      );
      const persistedCommentRows = await tx
        .select({ id: documentComments.id })
        .from(documentComments)
        .where(eq(documentComments.documentId, document.id.value));
      const persistedCommentIds = new Set(
        persistedCommentRows.map((r) => r.id),
      );
      const aggregateCommentIds = new Set(aggregateComments.map((c) => c.id));
      const commentsToInsert = aggregateComments.filter(
        (c) => !persistedCommentIds.has(c.id),
      );
      if (commentsToInsert.length > 0) {
        await tx.insert(documentComments).values(commentsToInsert);
      }
      const commentIdsToDelete = [...persistedCommentIds].filter(
        (id) => !aggregateCommentIds.has(id),
      );
      if (commentIdsToDelete.length > 0) {
        // document_id も条件に含め、万一 ID が他文書と衝突しても
        // この文書のコメントだけを消す（安全側の冗長条件）。
        await tx
          .delete(documentComments)
          .where(
            and(
              eq(documentComments.documentId, document.id.value),
              inArray(documentComments.id, commentIdsToDelete),
            ),
          );
      }
    });
  }
}
