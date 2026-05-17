import { describe, expect, it } from 'vitest';

import { StoredFileMissingError } from '../../shared-kernel/stored-file-missing-error';
import {
  DOCUMENT_ID,
  FIXED_NOW,
  FakeProjectAccess,
  InMemoryDocumentRepository,
  InMemoryFileStorage,
  MEMBER_ID,
  OUTSIDER_ID,
  PROJECT_ID,
} from '../__tests__/fakes';
import { Document } from '../domain/document';
import { DocumentId } from '../domain/document-id';
import { DocumentName } from '../domain/document-name';
import { DocumentProjectId } from '../domain/document-project-id';
import { StorageKey } from '../domain/storage-key';
import { UploaderId } from '../domain/uploader-id';
import { VersionNotFoundError } from '../domain/version-not-found-error';

import { GetVersionFileUseCase } from './get-version-file-usecase';
import { NotAuthorizedError } from './not-authorized-error';

const KEY = `documents/${DOCUMENT_ID}/v1.pdf`;
const DATA = new Uint8Array([9, 8, 7]);

async function setup(): Promise<{
  documents: InMemoryDocumentRepository;
  fileStorage: InMemoryFileStorage;
}> {
  const documents = new InMemoryDocumentRepository();
  const doc = Document.create({
    id: new DocumentId(DOCUMENT_ID),
    projectId: new DocumentProjectId(PROJECT_ID),
    name: new DocumentName('設計書'),
    createdAt: FIXED_NOW,
  });
  doc.addVersion({
    storageKey: new StorageKey(KEY),
    uploadedBy: new UploaderId(MEMBER_ID),
    createdAt: FIXED_NOW,
  });
  await documents.save(doc);
  const fileStorage = new InMemoryFileStorage();
  await fileStorage.put(KEY, DATA, 'application/pdf');
  return { documents, fileStorage };
}

describe('GetVersionFileUseCase', () => {
  it('should return the stored bytes for a member', async () => {
    const { documents, fileStorage } = await setup();
    const useCase = new GetVersionFileUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      fileStorage,
    });

    const result = await useCase.execute({
      documentId: DOCUMENT_ID,
      versionNumber: 1,
      actingUserId: MEMBER_ID,
    });

    expect(result.data).toEqual(DATA);
  });

  it('should reject a non-member', async () => {
    const { documents, fileStorage } = await setup();
    const useCase = new GetVersionFileUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      fileStorage,
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        versionNumber: 1,
        actingUserId: OUTSIDER_ID,
      }),
    ).rejects.toThrow(NotAuthorizedError);
  });

  it('should throw when the version does not exist', async () => {
    const { documents, fileStorage } = await setup();
    const useCase = new GetVersionFileUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      fileStorage,
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        versionNumber: 2,
        actingUserId: MEMBER_ID,
      }),
    ).rejects.toThrow(VersionNotFoundError);
  });

  it('should throw StoredFileMissingError when the blob is gone', async () => {
    // 版メタデータは在るが blob を put しない（ストレージ不整合を再現）。
    const documents = new InMemoryDocumentRepository();
    const doc = Document.create({
      id: new DocumentId(DOCUMENT_ID),
      projectId: new DocumentProjectId(PROJECT_ID),
      name: new DocumentName('設計書'),
      createdAt: FIXED_NOW,
    });
    doc.addVersion({
      storageKey: new StorageKey(KEY),
      uploadedBy: new UploaderId(MEMBER_ID),
      createdAt: FIXED_NOW,
    });
    await documents.save(doc);
    const useCase = new GetVersionFileUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      fileStorage: new InMemoryFileStorage(),
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        versionNumber: 1,
        actingUserId: MEMBER_ID,
      }),
    ).rejects.toThrow(StoredFileMissingError);
  });
});
