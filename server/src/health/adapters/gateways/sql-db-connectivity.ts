import type { Sql } from 'postgres';

import type { DbConnectivityPort } from '../../application/db-connectivity-port';

/**
 * postgres クライアントで `SELECT 1` を実行し DB 到達性を判定する。
 */
export class SqlDbConnectivity implements DbConnectivityPort {
  readonly #sql: Sql;

  constructor(sql: Sql) {
    this.#sql = sql;
  }

  async isReachable(): Promise<boolean> {
    try {
      await this.#sql`select 1`;
      return true;
    } catch {
      return false;
    }
  }
}
