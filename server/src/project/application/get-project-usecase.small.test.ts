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

import { GetProjectUseCase } from './get-project-usecase';
import { NotAuthorizedError } from './not-authorized-error';

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

describe('GetProjectUseCase', () => {
  it('should return the project for a member', async () => {
    const useCase = new GetProjectUseCase({ projects: await seeded() });

    const result = await useCase.execute({
      projectId: PROJECT_ID_1,
      actingUserId: OWNER_ID,
    });

    expect(result.id).toBe(PROJECT_ID_1);
  });

  it('should reject a non-member', async () => {
    const useCase = new GetProjectUseCase({ projects: await seeded() });

    await expect(
      useCase.execute({ projectId: PROJECT_ID_1, actingUserId: MEMBER_ID }),
    ).rejects.toThrow(NotAuthorizedError);
  });

  it('should reject when the project does not exist', async () => {
    const useCase = new GetProjectUseCase({
      projects: new InMemoryProjectRepository(),
    });

    await expect(
      useCase.execute({ projectId: PROJECT_ID_1, actingUserId: OWNER_ID }),
    ).rejects.toThrow(ProjectNotFoundError);
  });
});
