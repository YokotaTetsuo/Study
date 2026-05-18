import { describe, expect, it } from 'vitest';

import {
  COMMENT_ID,
  DOCUMENT_ID,
  FakeProjectAccess,
  FIXED_NOW,
  InMemoryDocumentRepository,
  MEMBER_ID,
  OTHER_MEMBER_ID,
  OUTSIDER_ID,
  PROJECT_ID,
} from '../__tests__/fakes';
import { CommentAuthorId } from '../domain/comment-author-id';
import { CommentContent } from '../domain/comment-content';
import { CommentForbiddenError } from '../domain/comment-forbidden-error';
import { CommentId } from '../domain/comment-id';
import { CommentNotFoundError } from '../domain/comment-not-found-error';
import { Document } from '../domain/document';
import { DocumentId } from '../domain/document-id';
import { DocumentName } from '../domain/document-name';
import { DocumentProjectId } from '../domain/document-project-id';
import { StorageKey } from '../domain/storage-key';
import { UploaderId } from '../domain/uploader-id';

import { DeleteCommentUseCase } from './delete-comment-usecase';
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
    content: new CommentContent('著者のコメント'),
    createdAt: FIXED_NOW,
  });
  await documents.save(doc);
}

describe('DeleteCommentUseCase', () => {
  it('should let the author delete their own comment', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithComment(documents);
    const useCase = new DeleteCommentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    await useCase.execute({
      documentId: DOCUMENT_ID,
      versionNumber: 1,
      commentId: COMMENT_ID,
      actingUserId: MEMBER_ID,
    });

    const persisted = await documents.findById(new DocumentId(DOCUMENT_ID));
    expect(persisted?.commentsOf(1)).toHaveLength(0);
  });

  it('should forbid a member who is not the author', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithComment(documents);
    const useCase = new DeleteCommentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [
        MEMBER_ID,
        OTHER_MEMBER_ID,
      ]),
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        versionNumber: 1,
        commentId: COMMENT_ID,
        actingUserId: OTHER_MEMBER_ID,
      }),
    ).rejects.toThrow(CommentForbiddenError);

    const persisted = await documents.findById(new DocumentId(DOCUMENT_ID));
    expect(persisted?.commentsOf(1)).toHaveLength(1);
  });

  it('should reject a non-member', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithComment(documents);
    const useCase = new DeleteCommentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        versionNumber: 1,
        commentId: COMMENT_ID,
        actingUserId: OUTSIDER_ID,
      }),
    ).rejects.toThrow(NotAuthorizedError);
  });

  it('should reject deleting a non-existent comment', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithComment(documents);
    const useCase = new DeleteCommentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        versionNumber: 1,
        commentId: '01HQ8ZK9PRSTVWXYZ23456789Z',
        actingUserId: MEMBER_ID,
      }),
    ).rejects.toThrow(CommentNotFoundError);
  });
});
