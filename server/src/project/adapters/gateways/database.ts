import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from './schema';

/**
 * project 永続化アダプタが用いる Drizzle データベース型。
 * 接続生成は infrastructure が担い、ここでは型のみ公開する。
 */
export type Database = PostgresJsDatabase<typeof schema>;
