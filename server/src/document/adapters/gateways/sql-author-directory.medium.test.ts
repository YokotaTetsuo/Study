import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import type { DbClient } from '../../../infrastructure/db/client';
import { makeTestDbClient, truncateUsers } from '../../__tests__/medium-db';

import { SqlAuthorDirectory } from './sql-author-directory';

const client: DbClient = makeTestDbClient();
const directory = new SqlAuthorDirectory(client.sql);

const ALICE_ID = '01HQ8ZK9PRSTVWXYZ234567890';
const BOB_ID = '01HQ8ZK9PRSTVWXYZ234567891';
const MISSING_ID = '01HQ8ZK9PRSTVWXYZ234567892';

beforeEach(async () => {
  await truncateUsers(client);
  await client.sql`
    insert into users (id, email, password_hash, display_name, created_at)
    values
      (${ALICE_ID}, 'alice@example.com', 'hashed:pw', 'Alice', now()),
      (${BOB_ID}, 'bob@example.com', 'hashed:pw', 'Bob', now())
  `;
});

afterAll(async () => {
  await client.sql.end();
});

describe('SqlAuthorDirectory', () => {
  it('should return an empty map for empty input', async () => {
    expect((await directory.findDisplayNames([])).size).toBe(0);
  });

  it('should resolve display names only for ids that exist', async () => {
    const names = await directory.findDisplayNames([
      ALICE_ID,
      BOB_ID,
      MISSING_ID,
    ]);

    expect(names.size).toBe(2);
    expect(names.get(ALICE_ID)).toBe('Alice');
    expect(names.get(BOB_ID)).toBe('Bob');
    expect(names.get(MISSING_ID)).toBeUndefined();
  });

  it('should not include any id when none of them exist', async () => {
    expect((await directory.findDisplayNames([MISSING_ID])).size).toBe(0);
  });
});
