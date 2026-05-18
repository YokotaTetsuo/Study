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
} from '../__tests__/fakes';
import { CommentAuthorId } from '../domain/comment-author-id';
import { CommentContent } from '../domain/comment-content';
import { CommentId } from '../domain/comment-id';
import { Document } from '../domain/document';
import { DocumentId } from '../domain/document-id';
import { DocumentName } from '../domain/document-name';
import { DocumentProjectId } from '../domain/document-project-id';
import { StorageKey } from '../domain/storage-key';
import { UploaderId } from '../domain/uploader-id';
import { VersionNotFoundError } from '../domain/version-not-found-error';

import { ListCommentsUseCase } from './list-comments-usecase';
import { NotAuthorizedError } from './not-authorized-error';

async function seedDocWithComment(
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
  doc.addComment(1, {
    id: new CommentId(COMMENT_ID),
    authorId: new CommentAuthorId(MEMBER_ID),
    content: new CommentContent('最初のコメント'),
    createdAt: FIXED_NOW,
  });
  await documents.save(doc);
}

describe('ListCommentsUseCase', () => {
  it('should list comments of a version for a member', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithComment(documents);
    const useCase = new ListCommentsUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    const result = await useCase.execute({
      documentId: DOCUMENT_ID,
      versionNumber: 1,
      actingUserId: MEMBER_ID,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(COMMENT_ID);
    expect(result[0]?.content).toBe('最初のコメント');
  });

  it('should reject a non-member', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithComment(documents);
    const useCase = new ListCommentsUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        versionNumber: 1,
        actingUserId: OUTSIDER_ID,
      }),
    ).rejects.toThrow(NotAuthorizedError);
  });

  it('should reject when the version does not exist', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithComment(documents);
    const useCase = new ListCommentsUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        versionNumber: 2,
        actingUserId: MEMBER_ID,
      }),
    ).rejects.toThrow(VersionNotFoundError);
  });
});
