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

import { ListProjectsUseCase } from './list-projects-usecase';

describe('ListProjectsUseCase', () => {
  it('should return only projects the user is a member of', async () => {
    const projects = new InMemoryProjectRepository();
    await projects.save(
      Project.create({
        id: new ProjectId(PROJECT_ID_1),
        name: new ProjectName('Mine'),
        ownerUserId: new MemberUserId(OWNER_ID),
        createdAt: FIXED_NOW,
      }),
    );
    const useCase = new ListProjectsUseCase({ projects });

    const owned = await useCase.execute({ actingUserId: OWNER_ID });
    const others = await useCase.execute({ actingUserId: MEMBER_ID });

    expect(owned.map((p) => p.id)).toEqual([PROJECT_ID_1]);
    expect(others).toEqual([]);
  });
});
