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
