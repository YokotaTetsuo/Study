import type { Pool } from 'pg';

import type { DbConnectivityPort } from '../../application/db-connectivity-port';

/**
 * pg Pool で `SELECT 1` を実行し DB 到達性を判定する。
 */
export class PgDbConnectivity implements DbConnectivityPort {
  readonly #pool: Pool;

  constructor(pool: Pool) {
    this.#pool = pool;
  }

  async isReachable(): Promise<boolean> {
    try {
      await this.#pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
