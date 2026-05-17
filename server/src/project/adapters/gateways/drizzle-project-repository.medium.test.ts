import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import type { DbClient } from '../../../infrastructure/db/client';
import {
  FIXED_NOW,
  MEMBER_ID,
  OWNER_ID,
  PROJECT_ID_1,
} from '../../__tests__/fakes';
import { makeTestDbClient, truncateProjects } from '../../__tests__/medium-db';
import { MemberUserId } from '../../domain/member-user-id';
import { Project } from '../../domain/project';
import { ProjectId } from '../../domain/project-id';
import { ProjectName } from '../../domain/project-name';
import { ProjectRole } from '../../domain/project-role';

import { DrizzleProjectRepository } from './drizzle-project-repository';

const client: DbClient = makeTestDbClient();
const repo = new DrizzleProjectRepository(client.db);

function aProject(): Project {
  return Project.create({
    id: new ProjectId(PROJECT_ID_1),
    name: new ProjectName('Docs'),
    ownerUserId: new MemberUserId(OWNER_ID),
    createdAt: FIXED_NOW,
  });
}

beforeEach(async () => {
  await truncateProjects(client);
});

afterAll(async () => {
  await client.sql.end();
});

describe('DrizzleProjectRepository', () => {
  it('should round-trip a project with owner and policy', async () => {
    await repo.save(aProject());

    const found = await repo.findById(new ProjectId(PROJECT_ID_1));

    expect(found?.name.value).toBe('Docs');
    expect(found?.isOwner(new MemberUserId(OWNER_ID))).toBe(true);
    expect(found?.approvalPolicy.requiredApprovals).toBe(1);
  });

  it('should persist added members and policy changes on save', async () => {
    const project = aProject();
    project.addMember({
      userId: new MemberUserId(MEMBER_ID),
      role: new ProjectRole('reviewer'),
    });
    await repo.save(project);

    const found = await repo.findById(new ProjectId(PROJECT_ID_1));

    expect(found?.members).toHaveLength(2);
    expect(
      found?.members.some(
        (m) => m.userId.value === MEMBER_ID && m.role.value === 'reviewer',
      ),
    ).toBe(true);
  });

  it('should return null for an unknown project', async () => {
    expect(
      await repo.findById(new ProjectId('01HQ8ZK9PRSTVWXYZ23456789C')),
    ).toBeNull();
  });

  it('should list only the member’s projects with reconstructed members', async () => {
    const PROJECT_ID_2 = '01HQ8ZK9PRSTVWXYZ23456789D';
    // project1: OWNER 所有 + MEMBER を reviewer 追加
    const project1 = aProject();
    project1.addMember({
      userId: new MemberUserId(MEMBER_ID),
      role: new ProjectRole('reviewer'),
    });
    await repo.save(project1);
    // project2: MEMBER のみ所有
    await repo.save(
      Project.create({
        id: new ProjectId(PROJECT_ID_2),
        name: new ProjectName('Other'),
        ownerUserId: new MemberUserId(MEMBER_ID),
        createdAt: FIXED_NOW,
      }),
    );

    const ownerProjects = await repo.listByMember(new MemberUserId(OWNER_ID));
    const memberProjects = await repo.listByMember(new MemberUserId(MEMBER_ID));

    expect(ownerProjects.map((p) => p.id.value)).toEqual([PROJECT_ID_1]);
    expect(ownerProjects[0]?.members).toHaveLength(2);
    expect(new Set(memberProjects.map((p) => p.id.value))).toEqual(
      new Set([PROJECT_ID_1, PROJECT_ID_2]),
    );
  });
});
