import { createDbClient } from '../../infrastructure/db/client';
import type { DbClient } from '../../infrastructure/db/client';
import { loadEnv } from '../../infrastructure/env';

/** Medium テスト用 DB クライアント（process.env から構築）。 */
export function makeTestDbClient(): DbClient {
  return createDbClient(loadEnv(process.env));
}

/** 全テーブルを空にする（FK 順に削除）。 */
export async function truncateAll(client: DbClient): Promise<void> {
  await client.sql`truncate table sessions, users restart identity cascade`;
}
