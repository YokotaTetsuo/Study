import { describe, expect, it } from 'vitest';

import {
  FIXED_NOW,
  InMemoryProjectRepository,
  MEMBER_ID,
  OWNER_ID,
  PROJECT_ID_1,
} from '../__tests__/fakes';
import { MemberUserId } from '../domain/member-user-id';
import { Project } from '../domain/project';
import { ProjectId } from '../domain/project-id';
import { ProjectName } from '../domain/project-name';
import { ProjectNotFoundError } from '../domain/project-not-found-error';
import { ProjectRole } from '../domain/project-role';

import { NotAuthorizedError } from './not-authorized-error';
import { SetMemberRoleUseCase } from './set-member-role-usecase';

async function seededWithMember(): Promise<InMemoryProjectRepository> {
  const projects = new InMemoryProjectRepository();
  const project = Project.create({
    id: new ProjectId(PROJECT_ID_1),
    name: new ProjectName('Docs'),
    ownerUserId: new MemberUserId(OWNER_ID),
    createdAt: FIXED_NOW,
  });
  project.addMember({
    userId: new MemberUserId(MEMBER_ID),
    role: new ProjectRole('submitter'),
  });
  await projects.save(project);
  return projects;
}

describe('SetMemberRoleUseCase', () => {
  it('should let an owner change a member role', async () => {
    const useCase = new SetMemberRoleUseCase({
      projects: await seededWithMember(),
    });

    const result = await useCase.execute({
      projectId: PROJECT_ID_1,
      actingUserId: OWNER_ID,
      userId: MEMBER_ID,
      role: 'approver',
    });

    expect(result.members).toContainEqual({
      userId: MEMBER_ID,
      role: 'approver',
    });
  });

  it('should reject when the acting user is not an owner', async () => {
    const useCase = new SetMemberRoleUseCase({
      projects: await seededWithMember(),
    });

    await expect(
      useCase.execute({
        projectId: PROJECT_ID_1,
        actingUserId: MEMBER_ID,
        userId: MEMBER_ID,
        role: 'approver',
      }),
    ).rejects.toThrow(NotAuthorizedError);
  });

  it('should reject when the project does not exist', async () => {
    const useCase = new SetMemberRoleUseCase({
      projects: new InMemoryProjectRepository(),
    });

    await expect(
      useCase.execute({
        projectId: PROJECT_ID_1,
        actingUserId: OWNER_ID,
        userId: MEMBER_ID,
        role: 'approver',
      }),
    ).rejects.toThrow(ProjectNotFoundError);
  });
});
