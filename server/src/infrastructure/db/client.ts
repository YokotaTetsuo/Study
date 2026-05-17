import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Sql } from 'postgres';

import type { Database } from '../../auth/adapters/gateways/database';
import * as schema from '../../auth/adapters/gateways/schema';
import type { Env } from '../env';

export interface DbClient {
  readonly sql: Sql;
  readonly db: Database;
}

export function createDbClient(env: Env): DbClient {
  /* eslint-disable @typescript-eslint/naming-convention --
     connect_timeout は postgres ライブラリの外部 API 名のため対象外。 */
  const sql = postgres({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    max: 10,
    connect_timeout: 5,
  });
  /* eslint-enable @typescript-eslint/naming-convention */
  return { sql, db: drizzle(sql, { schema }) };
}
