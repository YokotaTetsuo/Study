import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from './schema';

/**
 * 永続化アダプタが用いる Drizzle データベース型。
 * 接続生成（postgres クライアント）は infrastructure が担い、
 * ここでは型のみを公開して adapters → infrastructure 依存を避ける。
 */
export type Database = PostgresJsDatabase<typeof schema>;
