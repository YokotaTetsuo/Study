import { eq, inArray } from 'drizzle-orm';

import { users } from '../../../auth/adapters/gateways/schema';
import type {
  UserDirectory,
  UserProfile,
} from '../../application/user-directory';

import type { Database } from './database';

/**
 * auth の users テーブルを参照して email→userId / プロフィールを解決する。
 */
export class DrizzleUserDirectory implements UserDirectory {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  async findUserIdByEmail(email: string): Promise<string | null> {
    const rows = await this.#db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return rows[0]?.id ?? null;
  }

  async findProfiles(
    userIds: readonly string[],
  ): Promise<ReadonlyMap<string, UserProfile>> {
    const result = new Map<string, UserProfile>();
    if (userIds.length === 0) {
      return result;
    }
    const rows = await this.#db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(inArray(users.id, [...userIds]));
    for (const r of rows) {
      result.set(r.id, {
        userId: r.id,
        email: r.email,
        displayName: r.displayName,
      });
    }
    return result;
  }
}
