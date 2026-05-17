import { describe, expect, it } from 'vitest';

import {
  FIXED_NOW,
  InMemoryProjectRepository,
  InMemoryUserDirectory,
  MEMBER_EMAIL,
  MEMBER_ID,
  OWNER_ID,
  PROJECT_ID_1,
} from '../__tests__/fakes';
import { MemberUserId } from '../domain/member-user-id';
import { Project } from '../domain/project';
import { ProjectId } from '../domain/project-id';
import { ProjectName } from '../domain/project-name';
import { ProjectNotFoundError } from '../domain/project-not-found-error';

import { AddMemberUseCase } from './add-member-usecase';
import { MemberUserNotFoundError } from './member-user-not-found-error';
import { NotAuthorizedError } from './not-authorized-error';

const directory = new InMemoryUserDirectory([
  { userId: MEMBER_ID, email: MEMBER_EMAIL, displayName: 'Member' },
]);

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

describe('AddMemberUseCase', () => {
  it('should let an owner add a member resolved by email', async () => {
    const useCase = new AddMemberUseCase({
      projects: await seeded(),
      userDirectory: directory,
    });

    const result = await useCase.execute({
      projectId: PROJECT_ID_1,
      actingUserId: OWNER_ID,
      email: MEMBER_EMAIL,
      role: 'reviewer',
    });

    expect(result.members).toContainEqual({
      userId: MEMBER_ID,
      role: 'reviewer',
    });
  });

  it('should reject when the project does not exist', async () => {
    const useCase = new AddMemberUseCase({
      projects: new InMemoryProjectRepository(),
      userDirectory: directory,
    });

    await expect(
      useCase.execute({
        projectId: PROJECT_ID_1,
        actingUserId: OWNER_ID,
        email: MEMBER_EMAIL,
        role: 'reviewer',
      }),
    ).rejects.toThrow(ProjectNotFoundError);
  });

  it('should reject when the acting user is not an owner', async () => {
    const useCase = new AddMemberUseCase({
      projects: await seeded(),
      userDirectory: directory,
    });

    await expect(
      useCase.execute({
        projectId: PROJECT_ID_1,
        actingUserId: MEMBER_ID,
        email: MEMBER_EMAIL,
        role: 'reviewer',
      }),
    ).rejects.toThrow(NotAuthorizedError);
  });

  it('should reject when the email has no user', async () => {
    const useCase = new AddMemberUseCase({
      projects: await seeded(),
      userDirectory: new InMemoryUserDirectory([]),
    });

    await expect(
      useCase.execute({
        projectId: PROJECT_ID_1,
        actingUserId: OWNER_ID,
        email: 'missing@example.com',
        role: 'reviewer',
      }),
    ).rejects.toThrow(MemberUserNotFoundError);
  });
});
