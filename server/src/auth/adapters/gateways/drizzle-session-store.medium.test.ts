import type { Dayjs } from 'dayjs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import type { DbClient } from '../../../infrastructure/db/client';
import type { Clock } from '../../../shared-kernel/clock';
import {
  FIXED_NOW,
  USER_ID_1,
  idGeneratorReturning,
} from '../../__tests__/fakes';
import { makeTestDbClient, truncateAll } from '../../__tests__/medium-db';
import { DisplayName } from '../../domain/display-name';
import { Email } from '../../domain/email';
import { PasswordHash } from '../../domain/password-hash';
import { User } from '../../domain/user';
import { UserId } from '../../domain/user-id';

import { DrizzleSessionStore } from './drizzle-session-store';
import { DrizzleUserRepository } from './drizzle-user-repository';

const client: DbClient = makeTestDbClient();
const users = new DrizzleUserRepository(client.db);

function clockAt(at: Dayjs): Clock {
  return { now: (): Dayjs => at };
}

beforeEach(async () => {
  await truncateAll(client);
  await users.save(
    User.create({
      id: new UserId(USER_ID_1),
      email: new Email('a@example.com'),
      passwordHash: new PasswordHash('hashed:pw'),
      displayName: new DisplayName('Alice'),
      createdAt: FIXED_NOW,
    }),
  );
});

afterAll(async () => {
  await client.sql.end();
});

describe('DrizzleSessionStore', () => {
  it('should create a session and resolve its user id', async () => {
    const store = new DrizzleSessionStore({
      db: client.db,
      clock: clockAt(FIXED_NOW),
      idGenerator: idGeneratorReturning('sess-medium-1'),
    });

    const id = await store.create(new UserId(USER_ID_1));

    expect(id).toBe('sess-medium-1');
    expect((await store.findUserId(id))?.value).toBe(USER_ID_1);
  });

  it('should return null after destroy', async () => {
    const store = new DrizzleSessionStore({
      db: client.db,
      clock: clockAt(FIXED_NOW),
      idGenerator: idGeneratorReturning('sess-medium-2'),
    });
    const id = await store.create(new UserId(USER_ID_1));

    await store.destroy(id);

    expect(await store.findUserId(id)).toBeNull();
  });

  it('should treat an expired session as invalid', async () => {
    const created = new DrizzleSessionStore({
      db: client.db,
      clock: clockAt(FIXED_NOW),
      idGenerator: idGeneratorReturning('sess-medium-3'),
    });
    const id = await created.create(new UserId(USER_ID_1));

    const later = new DrizzleSessionStore({
      db: client.db,
      clock: clockAt(FIXED_NOW.add(30, 'day')),
      idGenerator: idGeneratorReturning('unused'),
    });

    expect(await later.findUserId(id)).toBeNull();
  });
});
