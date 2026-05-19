import { describe, expect, it } from 'vitest';

import {
  DOCUMENT_ID,
  FakeProjectAccess,
  FIXED_NOW,
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
import { StorageKey } from '../domain/storage-key';
import { UploaderId } from '../domain/uploader-id';

import { DeleteDocumentUseCase } from './delete-document-usecase';
import { NotAuthorizedError } from './not-authorized-error';

const UNKNOWN_DOCUMENT_ID = '01HQ8ZK9PRSTVWXYZ23456789Z';

async function seedDocWithVersion(
  documents: InMemoryDocumentRepository,
): Promise<void> {
  const doc = Document.create({
    id: new DocumentId(DOCUMENT_ID),
    projectId: new DocumentProjectId(PROJECT_ID),
    name: new DocumentName('設計書'),
    createdAt: FIXED_NOW,
  });
  doc.addVersion({
    storageKey: new StorageKey('documents/d/a.pdf'),
    uploadedBy: new UploaderId(MEMBER_ID),
    createdAt: FIXED_NOW,
  });
  await documents.save(doc);
}

describe('DeleteDocumentUseCase', () => {
  it('should let a project member delete a document', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithVersion(documents);
    const useCase = new DeleteDocumentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    await useCase.execute({
      documentId: DOCUMENT_ID,
      actingUserId: MEMBER_ID,
    });

    expect(await documents.findById(new DocumentId(DOCUMENT_ID))).toBeNull();
  });

  it('should reject a non-member with NotAuthorizedError', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithVersion(documents);
    const useCase = new DeleteDocumentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        actingUserId: OUTSIDER_ID,
      }),
    ).rejects.toThrow(NotAuthorizedError);

    expect(
      await documents.findById(new DocumentId(DOCUMENT_ID)),
    ).not.toBeNull();
  });

  it('should reject deleting a non-existent document', async () => {
    const documents = new InMemoryDocumentRepository();
    const useCase = new DeleteDocumentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    await expect(
      useCase.execute({
        documentId: UNKNOWN_DOCUMENT_ID,
        actingUserId: MEMBER_ID,
      }),
    ).rejects.toThrow(DocumentNotFoundError);
  });
});
