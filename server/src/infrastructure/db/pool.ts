import { Pool } from 'pg';

import type { Env } from '../env';

export function createPool(env: Env): Pool {
  return new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });
}
