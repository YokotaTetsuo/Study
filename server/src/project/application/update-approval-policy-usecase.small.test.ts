import { describe, expect, it } from 'vitest';

import {
  FIXED_NOW,
  InMemoryProjectRepository,
  OWNER_ID,
  PROJECT_ID_1,
} from '../__tests__/fakes';
import { MemberUserId } from '../domain/member-user-id';
import { Project } from '../domain/project';
import { ProjectId } from '../domain/project-id';
import { ProjectName } from '../domain/project-name';
import { ProjectNotFoundError } from '../domain/project-not-found-error';

import { UpdateApprovalPolicyUseCase } from './update-approval-policy-usecase';

async function seeded(): Promise<InMemoryProjectRepository> {
  const projects = new InMemoryProjectRepository();
  await projects.save(
    Project.create({
      id: new ProjectId(PROJECT_ID_1),
      name: new ProjectName('Docs'),
      ownerUserId: new MemberUserId(OWNER_ID),
      createdAt: FIXED_NOW,
    }),
  );
  return projects;
}

describe('UpdateApprovalPolicyUseCase', () => {
  it('should let an owner update the approval policy', async () => {
    const useCase = new UpdateApprovalPolicyUseCase({
      projects: await seeded(),
    });

    const result = await useCase.execute({
      projectId: PROJECT_ID_1,
      actingUserId: OWNER_ID,
      requiredApprovals: 2,
      approverRoles: ['owner', 'approver'],
    });

    expect(result.approvalPolicy.requiredApprovals).toBe(2);
    expect(result.approvalPolicy.approverRoles).toEqual(['owner', 'approver']);
  });

  it('should reject when the project does not exist', async () => {
    const useCase = new UpdateApprovalPolicyUseCase({
      projects: new InMemoryProjectRepository(),
    });

    await expect(
      useCase.execute({
        projectId: PROJECT_ID_1,
        actingUserId: OWNER_ID,
        requiredApprovals: 2,
        approverRoles: ['owner'],
      }),
    ).rejects.toThrow(ProjectNotFoundError);
  });
});
