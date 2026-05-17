import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import type { DbClient } from '../../../infrastructure/db/client';
import { FIXED_NOW, USER_ID_1 } from '../../__tests__/fakes';
import { makeTestDbClient, truncateAll } from '../../__tests__/medium-db';
import { DisplayName } from '../../domain/display-name';
import { Email } from '../../domain/email';
import { PasswordHash } from '../../domain/password-hash';
import { User } from '../../domain/user';
import { UserId } from '../../domain/user-id';

import { DrizzleUserRepository } from './drizzle-user-repository';

const USER_ID_2 = '01HQ8ZK9PRSTVWXYZ234567891';

const client: DbClient = makeTestDbClient();
const repo = new DrizzleUserRepository(client.db);

function aUser(id: string, email: string): User {
  return User.create({
    id: new UserId(id),
    email: new Email(email),
    passwordHash: new PasswordHash('hashed:pw'),
    displayName: new DisplayName('Alice'),
    createdAt: FIXED_NOW,
  });
}

beforeEach(async () => {
  await truncateAll(client);
});

afterAll(async () => {
  await client.sql.end();
});

describe('DrizzleUserRepository', () => {
  it('should round-trip a user through save and findById', async () => {
    await repo.save(aUser(USER_ID_1, 'a@example.com'));

    const found = await repo.findById(new UserId(USER_ID_1));

    expect(found?.email.value).toBe('a@example.com');
    expect(found?.createdAt.toISOString()).toBe(FIXED_NOW.toISOString());
  });

  it('should find a user by email and report existence', async () => {
    await repo.save(aUser(USER_ID_1, 'find@example.com'));

    expect(
      (await repo.findByEmail(new Email('find@example.com')))?.id.value,
    ).toBe(USER_ID_1);
    expect(await repo.existsByEmail(new Email('find@example.com'))).toBe(true);
    expect(await repo.existsByEmail(new Email('missing@example.com'))).toBe(
      false,
    );
  });

  it('should return null for an unknown id', async () => {
    expect(await repo.findById(new UserId(USER_ID_2))).toBeNull();
  });

  it('should reject a duplicate email via the unique constraint', async () => {
    await repo.save(aUser(USER_ID_1, 'dup@example.com'));

    await expect(
      repo.save(aUser(USER_ID_2, 'dup@example.com')),
    ).rejects.toThrow();
  });

  it('should update an existing user on save (same id)', async () => {
    const user = aUser(USER_ID_1, 'a@example.com');
    await repo.save(user);

    user.rename(new DisplayName('Renamed'));
    await repo.save(user);

    const found = await repo.findById(new UserId(USER_ID_1));
    expect(found?.displayName.value).toBe('Renamed');
  });
});
