import { createDbClient } from '../../infrastructure/db/client';
import type { DbClient } from '../../infrastructure/db/client';
import { loadEnv } from '../../infrastructure/env';

/** Medium テスト用 DB クライアント（process.env から構築）。 */
export function makeTestDbClient(): DbClient {
  return createDbClient(loadEnv(process.env));
}

/** document 関連テーブルを空にする（FK 順）。 */
export async function truncateDocuments(client: DbClient): Promise<void> {
  await client.sql`truncate table document_versions, documents restart identity cascade`;
}

/** project_members を空にする（SqlProjectAccess テスト用）。 */
export async function truncateProjectMembers(client: DbClient): Promise<void> {
  await client.sql`truncate table project_members, projects restart identity cascade`;
}
