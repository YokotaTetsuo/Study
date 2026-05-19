import type { Sql } from 'postgres';

import type { AuthorDirectory } from '../../application/author-directory';

/**
 * users テーブルを直接参照して表示名を解決する AuthorDirectory 実装。
 * auth モジュールのスキーマに依存せず、生 SQL で疎結合に保つ
 * （SqlProjectAccess と同じ方針）。
 */
export class SqlAuthorDirectory implements AuthorDirectory {
  readonly #sql: Sql;

  constructor(sql: Sql) {
    this.#sql = sql;
  }

  async findDisplayNames(
    userIds: readonly string[],
  ): Promise<ReadonlyMap<string, string>> {
    const result = new Map<string, string>();
    if (userIds.length === 0) {
      return result;
    }
    const rows = await this.#sql<{ id: string; displayName: string }[]>`
      select id, display_name as "displayName"
      from users
      where id in ${this.#sql([...userIds])}
    `;
    for (const r of rows) {
      result.set(r.id, r.displayName);
    }
    return result;
  }
}
