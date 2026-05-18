import {
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  // 正式版ポインタ。null=未公開。official 状態の版番号のみが入る。
  officialVersionNumber: integer('official_version_number'),
  // 楽観ロック用リビジョン。初回保存は 0、更新のたびに +1 し、
  // ステール書き込み（読み込み時 revision との不一致）を検出する。
  revision: integer('revision').notNull().default(0),
});

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
