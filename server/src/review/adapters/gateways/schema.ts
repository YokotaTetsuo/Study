import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

/**
 * レビュー依頼の永続化スキーマ。承認ポリシーは提出時スナップショットを
 * 列として保持する（プロジェクトのポリシー変更が進行中レビューへ
 * 遡及しないようにするため）。
 */
export const reviewRequests = pgTable(
  'review_requests',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id').notNull(),
    versionNumber: integer('version_number').notNull(),
    status: text('status').notNull(),
    requiredApprovals: integer('required_approvals').notNull(),
    approverRoles: jsonb('approver_roles').notNull().$type<string[]>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  // 1 つの版につきレビュー依頼は最大 1 件（線形ワークフロー）。
  (t) => [unique().on(t.documentId, t.versionNumber)],
);

export const reviewApprovals = pgTable(
  'review_approvals',
  {
    reviewRequestId: text('review_request_id')
      .notNull()
      .references(() => reviewRequests.id, { onDelete: 'cascade' }),
    approverId: text('approver_id').notNull(),
    role: text('role').notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true }).notNull(),
  },
  // 同一レビュー依頼での同一承認者の二重承認を DB でも禁止する。
  (t) => [primaryKey({ columns: [t.reviewRequestId, t.approverId] })],
);
