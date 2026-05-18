import { describe, expect, it } from 'vitest';

import {
  COMMENT_ID,
  DOCUMENT_ID,
  FakeProjectAccess,
  FIXED_NOW,
  InMemoryDocumentRepository,
  MEMBER_ID,
  OUTSIDER_ID,
  PROJECT_ID,
  fixedClock,
  idGeneratorReturning,
} from '../__tests__/fakes';
import { Document } from '../domain/document';
import { DocumentId } from '../domain/document-id';
import { DocumentName } from '../domain/document-name';
import { DocumentNotFoundError } from '../domain/document-not-found-error';
import { DocumentProjectId } from '../domain/document-project-id';
import { StorageKey } from '../domain/storage-key';
import { UploaderId } from '../domain/uploader-id';
import { VersionNotFoundError } from '../domain/version-not-found-error';

import { AddCommentUseCase } from './add-comment-usecase';
import { NotAuthorizedError } from './not-authorized-error';

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

describe('AddCommentUseCase', () => {
  it('should add a comment to a version for a member', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithVersion(documents);
    const useCase = new AddCommentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      idGenerator: idGeneratorReturning(COMMENT_ID),
      clock: fixedClock,
    });

    const result = await useCase.execute({
      documentId: DOCUMENT_ID,
      versionNumber: 1,
      actingUserId: MEMBER_ID,
      content: '配置を見直してください',
    });

    expect(result.id).toBe(COMMENT_ID);
    expect(result.authorId).toBe(MEMBER_ID);
    expect(result.content).toBe('配置を見直してください');

    const persisted = await documents.findById(new DocumentId(DOCUMENT_ID));
    expect(persisted?.commentsOf(1)).toHaveLength(1);
  });

  it('should reject a non-member', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithVersion(documents);
    const useCase = new AddCommentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      idGenerator: idGeneratorReturning(COMMENT_ID),
      clock: fixedClock,
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        versionNumber: 1,
        actingUserId: OUTSIDER_ID,
        content: 'x',
      }),
    ).rejects.toThrow(NotAuthorizedError);
  });

  it('should reject when the document does not exist', async () => {
    const useCase = new AddCommentUseCase({
      documents: new InMemoryDocumentRepository(),
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      idGenerator: idGeneratorReturning(COMMENT_ID),
      clock: fixedClock,
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        versionNumber: 1,
        actingUserId: MEMBER_ID,
        content: 'x',
      }),
    ).rejects.toThrow(DocumentNotFoundError);
  });

  it('should reject when the version does not exist', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithVersion(documents);
    const useCase = new AddCommentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      idGenerator: idGeneratorReturning(COMMENT_ID),
      clock: fixedClock,
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        versionNumber: 2,
        actingUserId: MEMBER_ID,
        content: 'x',
      }),
    ).rejects.toThrow(VersionNotFoundError);
  });
});
