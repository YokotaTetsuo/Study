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
import type { DocumentRepository } from '../domain/document-repository';
import { StaleDocumentError } from '../domain/stale-document-error';

import { NotAuthorizedError } from './not-authorized-error';
import { RenameDocumentUseCase } from './rename-document-usecase';

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

describe('RenameDocumentUseCase', () => {
  it('should rename the document and return the updated result', async () => {
    const documents = await seededRepo();
    const useCase = new RenameDocumentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    const result = await useCase.execute({
      documentId: DOCUMENT_ID,
      actingUserId: MEMBER_ID,
      name: '要件定義書',
    });

    expect(result.name).toBe('要件定義書');
    const persisted = await documents.findById(new DocumentId(DOCUMENT_ID));
    expect(persisted?.name.value).toBe('要件定義書');
  });

  it('should reject a non-member with NotAuthorizedError', async () => {
    const documents = await seededRepo();
    const useCase = new RenameDocumentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        actingUserId: OUTSIDER_ID,
        name: '要件定義書',
      }),
    ).rejects.toThrow(NotAuthorizedError);

    const persisted = await documents.findById(new DocumentId(DOCUMENT_ID));
    expect(persisted?.name.value).toBe('設計書');
  });

  it('should throw DocumentNotFoundError when the document does not exist', async () => {
    const useCase = new RenameDocumentUseCase({
      documents: new InMemoryDocumentRepository(),
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        actingUserId: MEMBER_ID,
        name: '要件定義書',
      }),
    ).rejects.toThrow(DocumentNotFoundError);
  });

  it('should propagate StaleDocumentError on an optimistic lock conflict', async () => {
    // 楽観ロック競合は save() が StaleDocumentError を投げる契約。
    // 競合の発生は Gateway の Medium テストで実 DB に対し担保し、
    // ここでは「usecase が握り潰さず伝播させる」ことだけを検証する。
    const seeded = await seededRepo();
    const loaded = await seeded.findById(new DocumentId(DOCUMENT_ID));
    const conflicting: DocumentRepository = {
      findById: () => Promise.resolve(loaded),
      listByProject: () => Promise.resolve([]),
      save: () => Promise.reject(new StaleDocumentError()),
      delete: () => Promise.reject(new Error('not used')),
    };
    const useCase = new RenameDocumentUseCase({
      documents: conflicting,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        actingUserId: MEMBER_ID,
        name: '要件定義書',
      }),
    ).rejects.toThrow(StaleDocumentError);
  });
});
