import dayjs from 'dayjs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import type { DbClient } from '../../../infrastructure/db/client';
import { makeTestDbClient, truncateDocuments } from '../../__tests__/medium-db';
import { CommentAuthorId } from '../../domain/comment-author-id';
import { CommentContent } from '../../domain/comment-content';
import { CommentId } from '../../domain/comment-id';
import { Document } from '../../domain/document';
import { DocumentId } from '../../domain/document-id';
import { DocumentName } from '../../domain/document-name';
import { DocumentProjectId } from '../../domain/document-project-id';
import { StaleDocumentError } from '../../domain/stale-document-error';
import { StorageKey } from '../../domain/storage-key';
import { UploaderId } from '../../domain/uploader-id';

import { DrizzleDocumentRepository } from './drizzle-document-repository';

const client: DbClient = makeTestDbClient();
const repo = new DrizzleDocumentRepository(client.db);

const PROJECT_ID = '01HQ8ZK9PRSTVWXYZ234567890';
const DOC_ID = '01HQ8ZK9PRSTVWXYZ23456789A';
const USER_ID = '01HQ8ZK9PRSTVWXYZ23456789B';
const NOW = dayjs('2026-05-18T00:00:00.000Z');

function aDocument(id = DOC_ID, createdAt = NOW): Document {
  return Document.create({
    id: new DocumentId(id),
    projectId: new DocumentProjectId(PROJECT_ID),
    name: new DocumentName('設計書'),
    createdAt,
  });
}

beforeEach(async () => {
  await truncateDocuments(client);
});

afterAll(async () => {
  await client.sql.end();
});

describe('DrizzleDocumentRepository', () => {
  it('should round-trip a document with versions', async () => {
    const doc = aDocument();
    doc.addVersion({
      storageKey: new StorageKey(`documents/${DOC_ID}/v1.pdf`),
      uploadedBy: new UploaderId(USER_ID),
      createdAt: NOW,
    });
    doc.addVersion({
      storageKey: new StorageKey(`documents/${DOC_ID}/v2.pdf`),
      uploadedBy: new UploaderId(USER_ID),
      createdAt: NOW,
    });
    await repo.save(doc);

    const found = await repo.findById(new DocumentId(DOC_ID));

    expect(found?.name.value).toBe('設計書');
    expect(found?.versions.map((v) => v.versionNumber)).toEqual([1, 2]);
    expect(found?.versions[1]?.storageKey.value).toBe(
      `documents/${DOC_ID}/v2.pdf`,
    );
  });

  it('should append a new version on re-save', async () => {
    const doc = aDocument();
    doc.addVersion({
      storageKey: new StorageKey(`documents/${DOC_ID}/v1.pdf`),
      uploadedBy: new UploaderId(USER_ID),
      createdAt: NOW,
    });
    await repo.save(doc);

    const reloaded = await repo.findById(new DocumentId(DOC_ID));
    reloaded?.addVersion({
      storageKey: new StorageKey(`documents/${DOC_ID}/v2.pdf`),
      uploadedBy: new UploaderId(USER_ID),
      createdAt: NOW,
    });
    if (reloaded !== null) {
      await repo.save(reloaded);
    }

    const found = await repo.findById(new DocumentId(DOC_ID));
    expect(found?.versions.map((v) => v.versionNumber)).toEqual([1, 2]);
  });

  it('should return null for an unknown document', async () => {
    expect(
      await repo.findById(new DocumentId('01HQ8ZK9PRSTVWXYZ23456789C')),
    ).toBeNull();
  });

  it('should list documents of a project in creation order', async () => {
    await repo.save(aDocument(DOC_ID, NOW));
    await repo.save(
      aDocument('01HQ8ZK9PRSTVWXYZ23456789D', NOW.add(1, 'hour')),
    );

    const list = await repo.listByProject(new DocumentProjectId(PROJECT_ID));

    expect(list.map((d) => d.id.value)).toEqual([
      DOC_ID,
      '01HQ8ZK9PRSTVWXYZ23456789D',
    ]);
  });

  it('should allow re-saving the same instance (revision synced)', async () => {
    const doc = aDocument();
    await repo.save(doc);
    doc.addVersion({
      storageKey: new StorageKey('documents/d/a.pdf'),
      uploadedBy: new UploaderId(USER_ID),
      createdAt: NOW,
    });

    await expect(repo.save(doc)).resolves.not.toThrow();
    const found = await repo.findById(new DocumentId(DOC_ID));
    expect(found?.versions).toHaveLength(1);
  });

  it('should reject a stale write (optimistic lock conflict)', async () => {
    await repo.save(aDocument());

    // 2 つのリクエストが同じ revision 0 の文書を読み込む。
    const a = await repo.findById(new DocumentId(DOC_ID));
    const b = await repo.findById(new DocumentId(DOC_ID));
    if (a === null || b === null) {
      throw new Error('seeded document not found');
    }

    // 先に a を保存すると revision が進む。
    a.addVersion({
      storageKey: new StorageKey('documents/d/a.pdf'),
      uploadedBy: new UploaderId(USER_ID),
      createdAt: NOW,
    });
    await repo.save(a);

    // ステールな b の保存は拒否される（巻き戻し防止）。
    await expect(repo.save(b)).rejects.toThrow(StaleDocumentError);
  });

  it('should persist a renamed name on the next save', async () => {
    await repo.save(aDocument());
    const loaded = await repo.findById(new DocumentId(DOC_ID));
    if (loaded === null) {
      throw new Error('seeded document not found');
    }

    loaded.rename(new DocumentName('要件定義書'));
    await repo.save(loaded);

    const found = await repo.findById(new DocumentId(DOC_ID));
    expect(found?.name.value).toBe('要件定義書');
  });
});

const COMMENT_A = '01HQ8ZK9PRSTVWXYZ23456789C';
const COMMENT_B = '01HQ8ZK9PRSTVWXYZ23456789D';

function docWithVersion(): Document {
  const doc = aDocument();
  doc.addVersion({
    storageKey: new StorageKey(`documents/${DOC_ID}/v1.pdf`),
    uploadedBy: new UploaderId(USER_ID),
    createdAt: NOW,
  });
  return doc;
}

describe('DrizzleDocumentRepository comments', () => {
  it('should round-trip comments per version in chronological order', async () => {
    const doc = docWithVersion();
    doc.addComment(1, {
      id: new CommentId(COMMENT_A),
      authorId: new CommentAuthorId(USER_ID),
      content: new CommentContent('先のコメント'),
      createdAt: NOW,
    });
    doc.addComment(1, {
      id: new CommentId(COMMENT_B),
      authorId: new CommentAuthorId(USER_ID),
      content: new CommentContent('後のコメント'),
      createdAt: NOW.add(1, 'hour'),
    });
    await repo.save(doc);

    const found = await repo.findById(new DocumentId(DOC_ID));

    expect(found?.commentsOf(1).map((c) => c.id.value)).toEqual([
      COMMENT_A,
      COMMENT_B,
    ]);
    expect(found?.commentsOf(1)[0]?.content.value).toBe('先のコメント');
  });

  it('should cascade-delete versions and comments when the document is deleted', async () => {
    const doc = docWithVersion();
    doc.addComment(1, {
      id: new CommentId(COMMENT_A),
      authorId: new CommentAuthorId(USER_ID),
      content: new CommentContent('連鎖削除される'),
      createdAt: NOW,
    });
    await repo.save(doc);

    await repo.delete(new DocumentId(DOC_ID));

    // 文書が消え、版・コメントも DB の FK ON DELETE CASCADE で残らない。
    expect(await repo.findById(new DocumentId(DOC_ID))).toBeNull();
    const versionRows = await client.sql`
      select 1 from document_versions where document_id = ${DOC_ID}
    `;
    expect(versionRows).toHaveLength(0);
    const commentRows = await client.sql`
      select 1 from document_comments where document_id = ${DOC_ID}
    `;
    expect(commentRows).toHaveLength(0);
  });

  it('should not throw when deleting a non-existent document', async () => {
    await expect(
      repo.delete(new DocumentId('01HQ8ZK9PRSTVWXYZ23456789Z')),
    ).resolves.not.toThrow();
  });

  it('should persist a comment edit (content and updatedAt) on the next save', async () => {
    const doc = docWithVersion();
    doc.addComment(1, {
      id: new CommentId(COMMENT_A),
      authorId: new CommentAuthorId(USER_ID),
      content: new CommentContent('誤記あり'),
      createdAt: NOW,
    });
    await repo.save(doc);

    const reloaded = await repo.findById(new DocumentId(DOC_ID));
    if (reloaded === null) {
      throw new Error('seeded document not found');
    }
    const editedAt = NOW.add(1, 'hour');
    reloaded.editComment(1, new CommentId(COMMENT_A), {
      content: new CommentContent('誤記を修正'),
      requesterId: new CommentAuthorId(USER_ID),
      editedAt,
    });
    await repo.save(reloaded);

    const after = await repo.findById(new DocumentId(DOC_ID));
    const comment = after?.commentsOf(1)[0];
    expect(comment?.content.value).toBe('誤記を修正');
    expect(comment?.updatedAt.valueOf()).toBe(editedAt.valueOf());
    expect(comment?.createdAt.valueOf()).toBe(NOW.valueOf());
  });

  it('should persist a comment deletion on the next save', async () => {
    const doc = docWithVersion();
    doc.addComment(1, {
      id: new CommentId(COMMENT_A),
      authorId: new CommentAuthorId(USER_ID),
      content: new CommentContent('消す対象'),
      createdAt: NOW,
    });
    await repo.save(doc);

    const reloaded = await repo.findById(new DocumentId(DOC_ID));
    if (reloaded === null) {
      throw new Error('seeded document not found');
    }
    reloaded.deleteComment(
      1,
      new CommentId(COMMENT_A),
      new CommentAuthorId(USER_ID),
    );
    await repo.save(reloaded);

    const after = await repo.findById(new DocumentId(DOC_ID));
    expect(after?.commentsOf(1)).toHaveLength(0);
  });
});
