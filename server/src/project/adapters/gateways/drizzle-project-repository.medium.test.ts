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

  it('should delete a project and cascade-remove its members', async () => {
    const project = aProject();
    project.addMember({
      userId: new MemberUserId(MEMBER_ID),
      role: new ProjectRole('reviewer'),
    });
    await repo.save(project);

    await repo.delete(new ProjectId(PROJECT_ID_1));

    expect(await repo.findById(new ProjectId(PROJECT_ID_1))).toBeNull();
    const rows = await client.sql<{ n: number }[]>`
      select count(*)::int as n from project_members
      where project_id = ${PROJECT_ID_1}
    `;
    expect(rows[0]?.n).toBe(0);
  });

  it('should cascade-remove documents, versions, comments and reviews on delete', async () => {
    await repo.save(aProject());
    // 文書 → 版 → コメント / レビュー依頼 → 承認 の木を直接投入し、
    // プロジェクト削除で FK cascade が全段（documents 経由で
    // versions/comments と review_requests/review_approvals）へ
    // 波及することを検証する。
    const DOC_ID = '01HQ8ZK9PRSTVWXYZ23456789E';
    const COMMENT_ID = '01HQ8ZK9PRSTVWXYZ23456789F';
    const RR_ID = '01HQ8ZK9PRSTVWXYZ23456789G';
    await client.sql`
      insert into documents (id, project_id, name, created_at, revision)
      values (${DOC_ID}, ${PROJECT_ID_1}, 'Spec', ${FIXED_NOW.toISOString()}, 0)
    `;
    await client.sql`
      insert into document_versions
        (document_id, version_number, status, storage_key, uploaded_by, created_at)
      values (${DOC_ID}, 1, 'draft', 'k/1.pdf', ${OWNER_ID}, ${FIXED_NOW.toISOString()})
    `;
    await client.sql`
      insert into document_comments
        (id, document_id, version_number, author_id, content, created_at)
      values (${COMMENT_ID}, ${DOC_ID}, 1, ${OWNER_ID}, 'lgtm', ${FIXED_NOW.toISOString()})
    `;
    await client.sql`
      insert into review_requests
        (id, document_id, version_number, status, required_approvals,
         approver_roles, created_at)
      values (${RR_ID}, ${DOC_ID}, 1, 'pending', 1,
              ${JSON.stringify(['approver'])}::jsonb, ${FIXED_NOW.toISOString()})
    `;
    await client.sql`
      insert into review_approvals
        (review_request_id, approver_id, role, decided_at)
      values (${RR_ID}, ${OWNER_ID}, 'approver', ${FIXED_NOW.toISOString()})
    `;

    await repo.delete(new ProjectId(PROJECT_ID_1));

    const counts = await client.sql<
      {
        docs: number;
        vers: number;
        cmts: number;
        reqs: number;
        apprs: number;
      }[]
    >`
      select
        (select count(*)::int from documents where project_id = ${PROJECT_ID_1}) as docs,
        (select count(*)::int from document_versions where document_id = ${DOC_ID}) as vers,
        (select count(*)::int from document_comments where document_id = ${DOC_ID}) as cmts,
        (select count(*)::int from review_requests where document_id = ${DOC_ID}) as reqs,
        (select count(*)::int from review_approvals where review_request_id = ${RR_ID}) as apprs
    `;
    expect(counts[0]).toEqual({
      docs: 0,
      vers: 0,
      cmts: 0,
      reqs: 0,
      apprs: 0,
    });
  });
});
