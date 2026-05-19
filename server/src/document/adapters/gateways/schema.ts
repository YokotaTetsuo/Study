import {
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { projects } from '../../../project/adapters/gateways/schema';

export const documents = pgTable(
  'documents',
  {
    id: text('id').primaryKey(),
    // プロジェクト削除時に文書ごと消す（版/コメントは documents 経由で
    // さらに cascade）。これが無いと孤児文書が残る。
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    // 正式版ポインタ。null=未公開。official 状態の版番号のみが入る。
    officialVersionNumber: integer('official_version_number'),
    // 楽観ロック用リビジョン。初回保存は 0、更新のたびに +1 し、
    // ステール書き込み（読み込み時 revision との不一致）を検出する。
    revision: integer('revision').notNull().default(0),
  },
  // listByProject は where project_id + order by created_at で読む。
  // project 削除時の FK cascade も project_id 参照のため、大規模データ
  // での seq scan / ロック時間増大を避ける複合索引。
  (t) => [
    index('documents_project_id_created_at_idx').on(t.projectId, t.createdAt),
  ],
);

export const documentVersions = pgTable(
  'document_versions',
  {
    documentId: text('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    status: text('status').notNull(),
    storageKey: text('storage_key').notNull(),
    uploadedBy: text('uploaded_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  // (document_id, version_number) を主キーにし、版番号の重複を DB で禁止する。
  (t) => [primaryKey({ columns: [t.documentId, t.versionNumber] })],
);

export const documentComments = pgTable(
  'document_comments',
  {
    // コメント ID（ULID）。グローバル一意なので単独主キー。
    id: text('id').primaryKey(),
    documentId: text('document_id').notNull(),
    versionNumber: integer('version_number').notNull(),
    authorId: text('author_id').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    // 最終更新時刻。追加時は created_at と同値、本文編集で更新される。
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  // 親版の複合キーへ FK。版削除（=文書削除カスケード）に追随して消す。
  (t) => [
    foreignKey({
      columns: [t.documentId, t.versionNumber],
      foreignColumns: [
        documentVersions.documentId,
        documentVersions.versionNumber,
      ],
    }).onDelete('cascade'),
    // findById/listByProject は document_id で絞り版番号・作成日時順に
    // 取得する。コメント増加時のシーケンシャルスキャンを避ける複合索引。
    index('document_comments_doc_version_created_idx').on(
      t.documentId,
      t.versionNumber,
      t.createdAt,
    ),
  ],
);
