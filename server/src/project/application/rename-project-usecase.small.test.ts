import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';
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
import { RenameProjectUseCase } from './rename-project-usecase';

async function seeded(): Promise<InMemoryProjectRepository> {
  const projects = new InMemoryProjectRepository();
  const project = Project.create({
    id: new ProjectId(PROJECT_ID_1),
    name: new ProjectName('旧名'),
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

describe('RenameProjectUseCase', () => {
  it('should let an owner rename the project', async () => {
    const projects = await seeded();
    const useCase = new RenameProjectUseCase({ projects });

    const result = await useCase.execute({
      projectId: PROJECT_ID_1,
      actingUserId: OWNER_ID,
      name: '新名',
    });

    expect(result.name).toBe('新名');
    const persisted = await projects.findById(new ProjectId(PROJECT_ID_1));
    expect(persisted?.name.value).toBe('新名');
  });

  it('should reject a non-owner', async () => {
    const useCase = new RenameProjectUseCase({ projects: await seeded() });

    await expect(
      useCase.execute({
        projectId: PROJECT_ID_1,
        actingUserId: MEMBER_ID,
        name: '新名',
      }),
    ).rejects.toThrow(NotAuthorizedError);
  });

  it('should reject when the project does not exist', async () => {
    const useCase = new RenameProjectUseCase({
      projects: new InMemoryProjectRepository(),
    });

    await expect(
      useCase.execute({
        projectId: PROJECT_ID_1,
        actingUserId: OWNER_ID,
        name: '新名',
      }),
    ).rejects.toThrow(ProjectNotFoundError);
  });

  it('should reject an invalid name', async () => {
    const useCase = new RenameProjectUseCase({ projects: await seeded() });

    await expect(
      useCase.execute({
        projectId: PROJECT_ID_1,
        actingUserId: OWNER_ID,
        name: '',
      }),
    ).rejects.toThrow(ValidationError);
  });
});
