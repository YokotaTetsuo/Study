import { describe, expect, it } from 'vitest';

import {
  DOCUMENT_ID,
  FakeProjectAccess,
  InMemoryDocumentRepository,
  MEMBER_ID,
  OUTSIDER_ID,
  PROJECT_ID,
  fixedClock,
  idGeneratorReturning,
} from '../__tests__/fakes';

import { CreateDocumentUseCase } from './create-document-usecase';
import { NotAuthorizedError } from './not-authorized-error';

describe('CreateDocumentUseCase', () => {
  it('should create a document for a project member', async () => {
    const documents = new InMemoryDocumentRepository();
    const useCase = new CreateDocumentUseCase({
      documents,
      projectAccess: new FakeProjectAccess([MEMBER_ID]),
      idGenerator: idGeneratorReturning(DOCUMENT_ID),
      clock: fixedClock,
    });

    const result = await useCase.execute({
      projectId: PROJECT_ID,
      name: '設計書',
      actingUserId: MEMBER_ID,
    });

    expect(result.id).toBe(DOCUMENT_ID);
    expect(result.projectId).toBe(PROJECT_ID);
    expect(result.name).toBe('設計書');
    expect(result.versions).toEqual([]);
  });

  it('should reject a non-member', async () => {
    const useCase = new CreateDocumentUseCase({
      documents: new InMemoryDocumentRepository(),
      projectAccess: new FakeProjectAccess([MEMBER_ID]),
      idGenerator: idGeneratorReturning(DOCUMENT_ID),
      clock: fixedClock,
    });

    await expect(
      useCase.execute({
        projectId: PROJECT_ID,
        name: '設計書',
        actingUserId: OUTSIDER_ID,
      }),
    ).rejects.toThrow(NotAuthorizedError);
  });
});
