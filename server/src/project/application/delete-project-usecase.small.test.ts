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

import { DeleteProjectUseCase } from './delete-project-usecase';
import { NotAuthorizedError } from './not-authorized-error';

async function seeded(): Promise<InMemoryProjectRepository> {
  const projects = new InMemoryProjectRepository();
  const project = Project.create({
    id: new ProjectId(PROJECT_ID_1),
    name: new ProjectName('Docs'),
    ownerUserId: new MemberUserId(OWNER_ID),
    createdAt: FIXED_NOW,
  });
  project.addMember({
    userId: new MemberUserId(MEMBER_ID),
    role: new ProjectRole('reviewer'),
  });
  await projects.save(project);
  return projects;
}

describe('DeleteProjectUseCase', () => {
  it('should let an owner delete the project', async () => {
    const projects = await seeded();
    const useCase = new DeleteProjectUseCase({ projects });

    await useCase.execute({
      projectId: PROJECT_ID_1,
      actingUserId: OWNER_ID,
    });

    expect(await projects.findById(new ProjectId(PROJECT_ID_1))).toBeNull();
  });

  it('should reject a non-owner', async () => {
    const projects = await seeded();
    const useCase = new DeleteProjectUseCase({ projects });

    await expect(
      useCase.execute({ projectId: PROJECT_ID_1, actingUserId: MEMBER_ID }),
    ).rejects.toThrow(NotAuthorizedError);
    expect(await projects.findById(new ProjectId(PROJECT_ID_1))).not.toBeNull();
  });

  it('should reject when the project does not exist', async () => {
    const useCase = new DeleteProjectUseCase({
      projects: new InMemoryProjectRepository(),
    });

    await expect(
      useCase.execute({ projectId: PROJECT_ID_1, actingUserId: OWNER_ID }),
    ).rejects.toThrow(ProjectNotFoundError);
  });
});
