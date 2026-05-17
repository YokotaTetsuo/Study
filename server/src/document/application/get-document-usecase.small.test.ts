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
import { DocumentNotFoundError } from '../domain/document-not-found-error';
import { DocumentProjectId } from '../domain/document-project-id';

import { GetDocumentUseCase } from './get-document-usecase';
import { NotAuthorizedError } from './not-authorized-error';

async function seededRepo(): Promise<InMemoryDocumentRepository> {
  const documents = new InMemoryDocumentRepository();
  await documents.save(
    Document.create({
      id: new DocumentId(DOCUMENT_ID),
      projectId: new DocumentProjectId(PROJECT_ID),
      name: new DocumentName('設計書'),
      createdAt: FIXED_NOW,
    }),
  );
  return documents;
}

describe('GetDocumentUseCase', () => {
  it('should return the document for a member', async () => {
    const useCase = new GetDocumentUseCase({
      documents: await seededRepo(),
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    const result = await useCase.execute({
      documentId: DOCUMENT_ID,
      actingUserId: MEMBER_ID,
    });

    expect(result.id).toBe(DOCUMENT_ID);
    expect(result.name).toBe('設計書');
  });

  it('should reject a non-member', async () => {
    const useCase = new GetDocumentUseCase({
      documents: await seededRepo(),
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        actingUserId: OUTSIDER_ID,
      }),
    ).rejects.toThrow(NotAuthorizedError);
  });

  it('should throw when the document does not exist', async () => {
    const useCase = new GetDocumentUseCase({
      documents: new InMemoryDocumentRepository(),
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        actingUserId: MEMBER_ID,
      }),
    ).rejects.toThrow(DocumentNotFoundError);
  });
});
