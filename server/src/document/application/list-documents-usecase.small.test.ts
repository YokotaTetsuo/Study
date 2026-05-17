import { describe, expect, it } from 'vitest';

import {
  DOCUMENT_ID,
  FIXED_NOW,
  FakeProjectAccess,
  InMemoryDocumentRepository,
  MEMBER_ID,
  OUTSIDER_ID,
  PROJECT_ID,
} from '../__tests__/fakes';
import { Document } from '../domain/document';
import { DocumentId } from '../domain/document-id';
import { DocumentName } from '../domain/document-name';
import { DocumentProjectId } from '../domain/document-project-id';

import { ListDocumentsUseCase } from './list-documents-usecase';
import { NotAuthorizedError } from './not-authorized-error';

describe('ListDocumentsUseCase', () => {
  it('should list documents of the project for a member', async () => {
    const documents = new InMemoryDocumentRepository();
    await documents.save(
      Document.create({
        id: new DocumentId(DOCUMENT_ID),
        projectId: new DocumentProjectId(PROJECT_ID),
        name: new DocumentName('設計書'),
        createdAt: FIXED_NOW,
      }),
    );
    const useCase = new ListDocumentsUseCase({
      documents,
      projectAccess: new FakeProjectAccess([MEMBER_ID]),
    });

    const result = await useCase.execute({
      projectId: PROJECT_ID,
      actingUserId: MEMBER_ID,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(DOCUMENT_ID);
  });

  it('should reject a non-member', async () => {
    const useCase = new ListDocumentsUseCase({
      documents: new InMemoryDocumentRepository(),
      projectAccess: new FakeProjectAccess([MEMBER_ID]),
    });

    await expect(
      useCase.execute({
        projectId: PROJECT_ID,
        actingUserId: OUTSIDER_ID,
      }),
    ).rejects.toThrow(NotAuthorizedError);
  });
});
