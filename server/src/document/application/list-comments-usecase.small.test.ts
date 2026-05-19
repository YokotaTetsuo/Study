import { describe, expect, it } from 'vitest';

import {
  COMMENT_ID,
  DOCUMENT_ID,
  FakeAuthorDirectory,
  FakeProjectAccess,
  FailingAuthorDirectory,
  FIXED_NOW,
  InMemoryDocumentRepository,
  MEMBER_DISPLAY_NAME,
  MEMBER_ID,
  OUTSIDER_ID,
  PROJECT_ID,
  RecordingAuthorDirectory,
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

// 同一著者の複数コメント（一意化検証用）。COMMENT_ID とは別 ID。
const SECOND_COMMENT_ID = '01HQ8ZK9PRSTVWXYZ2345678AA';

async function seedDocWithTwoCommentsBySameAuthor(
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
    content: new CommentContent('1 件目'),
    createdAt: FIXED_NOW,
  });
  doc.addComment(1, {
    id: new CommentId(SECOND_COMMENT_ID),
    authorId: new CommentAuthorId(MEMBER_ID),
    content: new CommentContent('2 件目'),
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
      authorDirectory: new FakeAuthorDirectory({
        [MEMBER_ID]: MEMBER_DISPLAY_NAME,
      }),
    });

    const result = await useCase.execute({
      documentId: DOCUMENT_ID,
      versionNumber: 1,
      actingUserId: MEMBER_ID,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(COMMENT_ID);
    expect(result[0]?.authorDisplayName).toBe(MEMBER_DISPLAY_NAME);
    expect(result[0]?.content).toBe('最初のコメント');
  });

  it('should return null display name when the author is unresolved', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithComment(documents);
    const useCase = new ListCommentsUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      // 著者の表示名を解決できないディレクトリ（ユーザー削除等を模す）。
      authorDirectory: new FakeAuthorDirectory({}),
    });

    const result = await useCase.execute({
      documentId: DOCUMENT_ID,
      versionNumber: 1,
      actingUserId: MEMBER_ID,
    });

    expect(result[0]?.authorId).toBe(MEMBER_ID);
    expect(result[0]?.authorDisplayName).toBeNull();
  });

  it('should list comments with null display names when the directory throws', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithTwoCommentsBySameAuthor(documents);
    const useCase = new ListCommentsUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      // 表示名解決が常に失敗するディレクトリ（補助情報の握り潰し検証）。
      authorDirectory: new FailingAuthorDirectory(),
    });

    const result = await useCase.execute({
      documentId: DOCUMENT_ID,
      versionNumber: 1,
      actingUserId: MEMBER_ID,
    });

    expect(result).toHaveLength(2);
    expect(result.every((c) => c.authorDisplayName === null)).toBe(true);
  });

  it('should pass deduplicated author ids to the directory when one author has multiple comments', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithTwoCommentsBySameAuthor(documents);
    const authorDirectory = new RecordingAuthorDirectory();
    const useCase = new ListCommentsUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      authorDirectory,
    });

    const result = await useCase.execute({
      documentId: DOCUMENT_ID,
      versionNumber: 1,
      actingUserId: MEMBER_ID,
    });

    expect(result).toHaveLength(2);
    expect(authorDirectory.receivedUserIds).toEqual([[MEMBER_ID]]);
  });

  it('should reject a non-member', async () => {
    const documents = new InMemoryDocumentRepository();
    await seedDocWithComment(documents);
    const useCase = new ListCommentsUseCase({
      documents,
      projectAccess: new FakeProjectAccess(PROJECT_ID, [MEMBER_ID]),
      authorDirectory: new FakeAuthorDirectory({}),
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
      authorDirectory: new FakeAuthorDirectory({}),
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
