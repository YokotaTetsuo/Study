import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from './schema';

/**
 * review 永続化アダプタが用いる Drizzle データベース型。
 * 接続生成は infrastructure が担い、ここでは型のみ公開する。
 */
export type Database = PostgresJsDatabase<typeof schema>;

/**
 * 通常接続またはトランザクション。Unit of Work では同一 tx を
 * 複数リポジトリで共有するため、両方を受け取れる型にする。
 */
export type DbOrTx =
  | Database
  | Parameters<Parameters<Database['transaction']>[0]>[0];
