import { createDbClient } from '../../infrastructure/db/client';
import type { DbClient } from '../../infrastructure/db/client';
import { loadEnv } from '../../infrastructure/env';

/** Medium テスト用 DB クライアント（process.env から構築）。 */
export function makeTestDbClient(): DbClient {
  return createDbClient(loadEnv(process.env));
}

/** document 関連テーブルを空にする（FK 順）。 */
export async function truncateDocuments(client: DbClient): Promise<void> {
  await client.sql`truncate table document_comments, document_versions, documents restart identity cascade`;
}

/**
 * documents.project_id → projects.id の FK（0009, on delete cascade）を
 * 満たすため、文書を投入するテストの親プロジェクト行を用意する。
 * truncateDocuments の後に呼ぶ（truncateDocuments は projects を消さない）。
 */
export async function seedProject(
  client: DbClient,
  projectId: string,
): Promise<void> {
  await client.sql`
    insert into projects
      (id, name, created_at, required_approvals, approver_roles)
    values (
      ${projectId}, 'Seed', '2026-05-18T00:00:00.000Z'::timestamptz,
      1, ${JSON.stringify(['approver'])}::jsonb
    )
    on conflict (id) do nothing
  `;
}

/** project_members を空にする（SqlProjectAccess テスト用）。 */
export async function truncateProjectMembers(client: DbClient): Promise<void> {
  await client.sql`truncate table project_members, projects restart identity cascade`;
}
