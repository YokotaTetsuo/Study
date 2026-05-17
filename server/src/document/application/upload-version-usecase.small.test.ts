import { describe, expect, it } from 'vitest';

import {
  DOCUMENT_ID,
  FIXED_NOW,
  FakeProjectAccess,
  InMemoryDocumentRepository,
  InMemoryFileStorage,
  MEMBER_ID,
  OUTSIDER_ID,
  PROJECT_ID,
  fixedClock,
  sequentialIdGenerator,
} from '../__tests__/fakes';
import { Document } from '../domain/document';
import { DocumentId } from '../domain/document-id';
import { DocumentName } from '../domain/document-name';
import { DocumentNotFoundError } from '../domain/document-not-found-error';
import { DocumentProjectId } from '../domain/document-project-id';

import { NotAuthorizedError } from './not-authorized-error';
import { UnsupportedContentTypeError } from './unsupported-content-type-error';
import { UploadVersionUseCase } from './upload-version-usecase';

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

describe('UploadVersionUseCase', () => {
  it('should append a draft version and store the file', async () => {
    const documents = await seededRepo();
    const fileStorage = new InMemoryFileStorage();
    const useCase = new UploadVersionUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      fileStorage,
      idGenerator: sequentialIdGenerator('key-'),
      clock: fixedClock,
    });

    const data = new Uint8Array([1, 2, 3]);
    const result = await useCase.execute({
      documentId: DOCUMENT_ID,
      actingUserId: MEMBER_ID,
      data,
      contentType: 'application/pdf',
    });

    expect(result.versions).toHaveLength(1);
    expect(result.versions[0]?.versionNumber).toBe(1);
    expect(result.versions[0]?.status).toBe('draft');
    expect(result.versions[0]?.uploadedBy).toBe(MEMBER_ID);
    const stored = await fileStorage.get(`documents/${DOCUMENT_ID}/key-1.pdf`);
    expect(stored).toEqual(data);
  });

  it('should reject a non-member', async () => {
    const useCase = new UploadVersionUseCase({
      documents: await seededRepo(),
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      fileStorage: new InMemoryFileStorage(),
      idGenerator: sequentialIdGenerator('key-'),
      clock: fixedClock,
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        actingUserId: OUTSIDER_ID,
        data: new Uint8Array([1]),
        contentType: 'application/pdf',
      }),
    ).rejects.toThrow(NotAuthorizedError);
  });

  it('should throw when the document does not exist', async () => {
    const useCase = new UploadVersionUseCase({
      documents: new InMemoryDocumentRepository(),
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      fileStorage: new InMemoryFileStorage(),
      idGenerator: sequentialIdGenerator('key-'),
      clock: fixedClock,
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        actingUserId: MEMBER_ID,
        data: new Uint8Array([1]),
        contentType: 'application/pdf',
      }),
    ).rejects.toThrow(DocumentNotFoundError);
  });

  it('should reject a non-PDF content type', async () => {
    const useCase = new UploadVersionUseCase({
      documents: await seededRepo(),
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      fileStorage: new InMemoryFileStorage(),
      idGenerator: sequentialIdGenerator('key-'),
      clock: fixedClock,
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        actingUserId: MEMBER_ID,
        data: new Uint8Array([1]),
        contentType: 'image/png',
      }),
    ).rejects.toThrow(UnsupportedContentTypeError);
  });
});
