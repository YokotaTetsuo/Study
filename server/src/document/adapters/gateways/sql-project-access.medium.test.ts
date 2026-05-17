import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import type { DbClient } from '../../../infrastructure/db/client';
import {
  makeTestDbClient,
  truncateProjectMembers,
} from '../../__tests__/medium-db';

import { SqlProjectAccess } from './sql-project-access';

const client: DbClient = makeTestDbClient();
const access = new SqlProjectAccess(client.sql);

const PROJECT_ID = '01HQ8ZK9PRSTVWXYZ234567890';
const MEMBER_ID = '01HQ8ZK9PRSTVWXYZ23456789A';
const OUTSIDER_ID = '01HQ8ZK9PRSTVWXYZ23456789B';

beforeEach(async () => {
  await truncateProjectMembers(client);
  await client.sql`
    insert into projects (id, name, created_at, required_approvals, approver_roles)
    values (${PROJECT_ID}, 'Docs', now(), 1, '["owner"]'::jsonb)
  `;
  await client.sql`
    insert into project_members (project_id, user_id, role)
    values (${PROJECT_ID}, ${MEMBER_ID}, 'owner')
  `;
});

afterAll(async () => {
  await client.sql.end();
});

describe('SqlProjectAccess', () => {
  it('should return true for a member of the project', async () => {
    expect(await access.isMember(PROJECT_ID, MEMBER_ID)).toBe(true);
  });

  it('should return false for a non-member', async () => {
    expect(await access.isMember(PROJECT_ID, OUTSIDER_ID)).toBe(false);
  });

  it('should return false for an unknown project', async () => {
    expect(await access.isMember('01HQ8ZK9PRSTVWXYZ23456789C', MEMBER_ID)).toBe(
      false,
    );
  });
});
