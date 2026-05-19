import { describe, expect, it, vi } from 'vitest';

import type { Clock } from '../../shared-kernel/clock';
import {
  COMMENT_ID,
  DOCUMENT_ID,
  FakeAuthorDirectory,
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
import { DocumentNotFoundError } from '../domain/document-not-found-error';
import { DocumentProjectId } from '../domain/document-project-id';
import { StorageKey } from '../domain/storage-key';
import { UploaderId } from '../domain/uploader-id';

import { EditCommentUseCase } from './edit-comment-usecase';
import { NotAuthorizedError } from './not-authorized-error';

const EDITED_AT = FIXED_NOW.add(1, 'hour');
const editClock: Clock = { now: () => EDITED_AT };

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
    content: new CommentContent('誤記あり'),
    createdAt: FIXED_NOW,
  });
  await documents.save(doc);
}

describe('EditCommentUseCase', () => {
  it('should let the author edit their own comment and bump updatedAt', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithComment(documents);
    const useCase = new EditCommentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      authorDirectory: new FakeAuthorDirectory({}),
      clock: editClock,
    });

    const result = await useCase.execute({
      documentId: DOCUMENT_ID,
      versionNumber: 1,
      commentId: COMMENT_ID,
      actingUserId: MEMBER_ID,
      content: '誤記を修正',
    });

    expect(result.content).toBe('誤記を修正');
    expect(result.updatedAt.valueOf()).toBe(EDITED_AT.valueOf());
    expect(result.createdAt.valueOf()).toBe(FIXED_NOW.valueOf());
    const persisted = await documents.findById(new DocumentId(DOCUMENT_ID));
    expect(persisted?.commentsOf(1)[0]?.content.value).toBe('誤記を修正');
  });

  it('should persist when the edit actually changes the content', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithComment(documents);
    const saveSpy = vi.spyOn(documents, 'save');
    const useCase = new EditCommentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      authorDirectory: new FakeAuthorDirectory({}),
      clock: editClock,
    });

    await useCase.execute({
      documentId: DOCUMENT_ID,
      versionNumber: 1,
      commentId: COMMENT_ID,
      actingUserId: MEMBER_ID,
      content: '誤記を修正',
    });

    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('should not persist when the normalized content is unchanged (no-op edit)', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithComment(documents);
    const saveSpy = vi.spyOn(documents, 'save');
    const useCase = new EditCommentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      authorDirectory: new FakeAuthorDirectory({}),
      clock: editClock,
    });

    const result = await useCase.execute({
      documentId: DOCUMENT_ID,
      versionNumber: 1,
      commentId: COMMENT_ID,
      actingUserId: MEMBER_ID,
      content: '  誤記あり  ',
    });

    expect(saveSpy).not.toHaveBeenCalled();
    expect(result.content).toBe('誤記あり');
    expect(result.updatedAt.valueOf()).toBe(FIXED_NOW.valueOf());
  });

  it('should forbid a member who is not the author', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithComment(documents);
    const useCase = new EditCommentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [
        MEMBER_ID,
        OTHER_MEMBER_ID,
      ]),
      authorDirectory: new FakeAuthorDirectory({}),
      clock: editClock,
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        versionNumber: 1,
        commentId: COMMENT_ID,
        actingUserId: OTHER_MEMBER_ID,
        content: '改竄',
      }),
    ).rejects.toThrow(CommentForbiddenError);

    const persisted = await documents.findById(new DocumentId(DOCUMENT_ID));
    expect(persisted?.commentsOf(1)[0]?.content.value).toBe('誤記あり');
  });

  it('should reject a non-member', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithComment(documents);
    const useCase = new EditCommentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      authorDirectory: new FakeAuthorDirectory({}),
      clock: editClock,
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        versionNumber: 1,
        commentId: COMMENT_ID,
        actingUserId: OUTSIDER_ID,
        content: 'x',
      }),
    ).rejects.toThrow(NotAuthorizedError);
  });

  it('should reject editing a non-existent comment', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithComment(documents);
    const useCase = new EditCommentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      authorDirectory: new FakeAuthorDirectory({}),
      clock: editClock,
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        versionNumber: 1,
        commentId: '01HQ8ZK9PRSTVWXYZ23456789Z',
        actingUserId: MEMBER_ID,
        content: 'x',
      }),
    ).rejects.toThrow(CommentNotFoundError);
  });

  it('should reject editing a comment in a missing document', async () => {
    const documents = new InMemoryDocumentRepository();
    const useCase = new EditCommentUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      authorDirectory: new FakeAuthorDirectory({}),
      clock: editClock,
    });

    await expect(
      useCase.execute({
        documentId: DOCUMENT_ID,
        versionNumber: 1,
        commentId: COMMENT_ID,
        actingUserId: MEMBER_ID,
        content: 'x',
      }),
    ).rejects.toThrow(DocumentNotFoundError);
  });
});
