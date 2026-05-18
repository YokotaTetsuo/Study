import {
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
  // 楽観ロック用リビジョン。save 毎に +1 し、ステール書き込みを検出する。
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
