import { Pool } from 'pg';

import type { Env } from '../env';

export function createPool(env: Env): Pool {
  /* eslint-disable @typescript-eslint/naming-convention --
     query_timeout / statement_timeout は pg ライブラリの外部 API 名のため
     camelCase 規約の対象外。 */
  return new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    // DB が到達不能/無応答でも health が即座に db:'down' を返せるよう
    // 接続・クエリにタイムアウトを設ける。
    connectionTimeoutMillis: 3000,
    query_timeout: 3000,
    statement_timeout: 3000,
  });
  /* eslint-enable @typescript-eslint/naming-convention */
}
