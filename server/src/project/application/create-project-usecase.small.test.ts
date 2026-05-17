import { describe, expect, it } from 'vitest';

import {
  InMemoryProjectRepository,
  OWNER_ID,
  PROJECT_ID_1,
  fixedClock,
  idGeneratorReturning,
} from '../__tests__/fakes';

import { CreateProjectUseCase } from './create-project-usecase';

describe('CreateProjectUseCase', () => {
  it('should create a project owned by the creator', async () => {
    const projects = new InMemoryProjectRepository();
    const useCase = new CreateProjectUseCase({
      projects,
      idGenerator: idGeneratorReturning(PROJECT_ID_1),
      clock: fixedClock,
    });

    const result = await useCase.execute({
      name: 'Docs',
      ownerUserId: OWNER_ID,
    });

    expect(result.id).toBe(PROJECT_ID_1);
    expect(result.name).toBe('Docs');
    expect(result.members).toEqual([{ userId: OWNER_ID, role: 'owner' }]);
    expect(result.approvalPolicy.requiredApprovals).toBe(1);
  });
});
