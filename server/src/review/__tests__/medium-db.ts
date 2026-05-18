import { createDbClient } from '../../infrastructure/db/client';
import type { DbClient } from '../../infrastructure/db/client';
import { loadEnv } from '../../infrastructure/env';

/** Medium テスト用 DB クライアント（process.env から構築）。 */
export function makeTestDbClient(): DbClient {
  return createDbClient(loadEnv(process.env));
}

/** review 関連テーブルを空にする（FK 順）。 */
export async function truncateReview(client: DbClient): Promise<void> {
  await client.sql`truncate table review_approvals, review_requests restart identity cascade`;
}
