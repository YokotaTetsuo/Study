import { and, eq, gt } from 'drizzle-orm';

import type { Clock } from '../../../shared-kernel/clock';
import type { IdGenerator } from '../../../shared-kernel/id-generator';
import type { SessionStore } from '../../application/session-store';
import { UserId } from '../../domain/user-id';

import type { Database } from './database';
import { sessions } from './schema';

const SESSION_TTL_DAYS = 7;

interface Deps {
  readonly db: Database;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

export class DrizzleSessionStore implements SessionStore {
  readonly #db: Database;
  readonly #clock: Clock;
  readonly #idGenerator: IdGenerator;

  constructor(deps: Deps) {
    this.#db = deps.db;
    this.#clock = deps.clock;
    this.#idGenerator = deps.idGenerator;
  }

  async create(userId: UserId): Promise<string> {
    const now = this.#clock.now();
    const id = this.#idGenerator.generate();
    await this.#db.insert(sessions).values({
      id,
      userId: userId.value,
      createdAt: now.toDate(),
      expiresAt: now.add(SESSION_TTL_DAYS, 'day').toDate(),
    });
    return id;
  }

  async destroy(sessionId: string): Promise<void> {
    await this.#db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  async findUserId(sessionId: string): Promise<UserId | null> {
    const rows = await this.#db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          gt(sessions.expiresAt, this.#clock.now().toDate()),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : new UserId(row.userId);
  }
}
