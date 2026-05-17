import type { Sql } from 'postgres';

import type { ProjectAccess } from '../../application/project-access';

/**
 * project_members を直接参照してメンバーシップを判定する ProjectAccess 実装。
 * project モジュールのスキーマに依存せず、生 SQL で疎結合に保つ。
 */
export class SqlProjectAccess implements ProjectAccess {
  readonly #sql: Sql;

  constructor(sql: Sql) {
    this.#sql = sql;
  }

  async isMember(projectId: string, userId: string): Promise<boolean> {
    const rows = await this.#sql`
      select 1
      from project_members
      where project_id = ${projectId} and user_id = ${userId}
      limit 1
    `;
    return rows.length > 0;
  }
}
