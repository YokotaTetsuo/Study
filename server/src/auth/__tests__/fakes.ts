import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import type { Clock } from '../../shared-kernel/clock';
import type { IdGenerator } from '../../shared-kernel/id-generator';
import type { PasswordHasher } from '../application/password-hasher';
import type { SessionStore } from '../application/session-store';
import type { Email } from '../domain/email';
import { PasswordHash } from '../domain/password-hash';
import type { User } from '../domain/user';
import type { UserId } from '../domain/user-id';
import type { UserRepository } from '../domain/user-repository';

export const FIXED_NOW: Dayjs = dayjs('2026-05-17T12:00:00.000Z');
export const USER_ID_1 = '01HQ8ZK9PRSTVWXYZ234567890';

export const fixedClock: Clock = { now: () => FIXED_NOW };

export function idGeneratorReturning(id: string): IdGenerator {
  return { generate: () => id };
}

/** in-memory な UserRepository（Fake）。 */
export class InMemoryUserRepository implements UserRepository {
  readonly #byId = new Map<string, User>();

  findById(id: UserId): Promise<User | null> {
    return Promise.resolve(this.#byId.get(id.value) ?? null);
  }

  findByEmail(email: Email): Promise<User | null> {
    for (const user of this.#byId.values()) {
      if (user.email.equals(email)) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }

  existsByEmail(email: Email): Promise<boolean> {
    return this.findByEmail(email).then((u) => u !== null);
  }

  save(user: User): Promise<void> {
    this.#byId.set(user.id.value, user);
    return Promise.resolve();
  }
}

/** 平文 == ハッシュの素朴な PasswordHasher スタブ。 */
export function fakeHasher(): PasswordHasher {
  return {
    hash: (plain) => Promise.resolve(new PasswordHash(`hashed:${plain}`)),
    verify: (plain, hash) => Promise.resolve(hash.value === `hashed:${plain}`),
  };
}

/** メモリ上の SessionStore スタブ。 */
export class InMemorySessionStore implements SessionStore {
  readonly #byId = new Map<string, UserId>();
  #seq = 0;

  create(userId: UserId): Promise<string> {
    this.#seq += 1;
    const id = `sess-${String(this.#seq)}`;
    this.#byId.set(id, userId);
    return Promise.resolve(id);
  }

  destroy(sessionId: string): Promise<void> {
    this.#byId.delete(sessionId);
    return Promise.resolve();
  }

  findUserId(sessionId: string): Promise<UserId | null> {
    return Promise.resolve(this.#byId.get(sessionId) ?? null);
  }
}
