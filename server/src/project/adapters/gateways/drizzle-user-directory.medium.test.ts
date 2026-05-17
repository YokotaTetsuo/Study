import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  makeTestDbClient,
  truncateAll,
} from '../../../auth/__tests__/medium-db';
import type { DbClient } from '../../../infrastructure/db/client';
import { OWNER_ID } from '../../__tests__/fakes';

import { DrizzleUserDirectory } from './drizzle-user-directory';

const client: DbClient = makeTestDbClient();
const directory = new DrizzleUserDirectory(client.db);

beforeEach(async () => {
  await truncateAll(client);
  await client.sql`
    insert into users (id, email, password_hash, display_name, created_at)
    values (${OWNER_ID}, 'owner@example.com', 'hash', 'Owner', now())
  `;
});

afterAll(async () => {
  await client.sql.end();
});

describe('DrizzleUserDirectory', () => {
  it('should resolve a user id by email ignoring case/whitespace', async () => {
    expect(await directory.findUserIdByEmail('  Owner@Example.com ')).toBe(
      OWNER_ID,
    );
  });

  it('should return null for an unknown email', async () => {
    expect(await directory.findUserIdByEmail('missing@example.com')).toBeNull();
  });

  it('should return profiles for the given ids', async () => {
    const profiles = await directory.findProfiles([OWNER_ID]);

    expect(profiles.get(OWNER_ID)).toEqual({
      userId: OWNER_ID,
      email: 'owner@example.com',
      displayName: 'Owner',
    });
  });

  it('should return an empty map for empty input', async () => {
    const profiles = await directory.findProfiles([]);

    expect(profiles.size).toBe(0);
  });
});
