import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import { CommentAuthorId } from './comment-author-id';
import { CommentContent } from './comment-content';
import { CommentForbiddenError } from './comment-forbidden-error';
import { CommentId } from './comment-id';
import { CommentNotFoundError } from './comment-not-found-error';
import { Document } from './document';
import { DocumentId } from './document-id';
import { DocumentName } from './document-name';
import { DocumentProjectId } from './document-project-id';
import { InvalidDocumentStateError } from './invalid-document-state-error';
import { InvalidVersionTransitionError } from './invalid-version-transition-error';
import { StorageKey } from './storage-key';
import { UploaderId } from './uploader-id';
import { VersionNotFoundError } from './version-not-found-error';

const DOC_ID = '01HQ8ZK9PRSTVWXYZ234567890';
const PROJ_ID = '01HQ8ZK9PRSTVWXYZ23456789A';
const USER_ID = '01HQ8ZK9PRSTVWXYZ23456789B';
const AUTHOR_ID = '01HQ8ZK9PRSTVWXYZ23456789C';
const OTHER_ID = '01HQ8ZK9PRSTVWXYZ23456789D';
const COMMENT_A = '01HQ8ZK9PRSTVWXYZ23456789E';
const COMMENT_B = '01HQ8ZK9PRSTVWXYZ23456789F';
const NOW = dayjs('2026-05-18T00:00:00.000Z');

function docWithOneVersion(): Document {
  const doc = Document.create({
    id: new DocumentId(DOC_ID),
    projectId: new DocumentProjectId(PROJ_ID),
    name: new DocumentName('設計書'),
    createdAt: NOW,
  });
  doc.addVersion({
    storageKey: new StorageKey('documents/d/a.pdf'),
    uploadedBy: new UploaderId(USER_ID),
    createdAt: NOW,
  });
  return doc;
}

function newDocument(): Document {
  return Document.create({
    id: new DocumentId(DOC_ID),
    projectId: new DocumentProjectId(PROJ_ID),
    name: new DocumentName('設計書'),
    createdAt: NOW,
  });
}

describe('Document', () => {
  it('should be created with no versions', () => {
    const doc = newDocument();
    expect(doc.versions).toEqual([]);
    expect(doc.name.value).toBe('設計書');
  });

  it('should assign sequential version numbers starting at 1', () => {
    const doc = newDocument();
    const v1 = doc.addVersion({
      storageKey: new StorageKey('documents/d/a.pdf'),
      uploadedBy: new UploaderId(USER_ID),
      createdAt: NOW,
    });
    const v2 = doc.addVersion({
      storageKey: new StorageKey('documents/d/b.pdf'),
      uploadedBy: new UploaderId(USER_ID),
      createdAt: NOW,
    });
    expect(v1.versionNumber).toBe(1);
    expect(v2.versionNumber).toBe(2);
    expect(v1.status.value).toBe('draft');
    expect(doc.versions).toHaveLength(2);
  });

  it('should find a version by number', () => {
    const doc = newDocument();
    doc.addVersion({
      storageKey: new StorageKey('documents/d/a.pdf'),
      uploadedBy: new UploaderId(USER_ID),
      createdAt: NOW,
    });
    expect(doc.findVersion(1)?.versionNumber).toBe(1);
    expect(doc.findVersion(2)).toBeUndefined();
  });

  it('should reconstruct versions sorted by version number', () => {
    const doc = Document.reconstruct({
      id: new DocumentId(DOC_ID),
      projectId: new DocumentProjectId(PROJ_ID),
      name: new DocumentName('設計書'),
      createdAt: NOW,
      versionsData: [
        {
          versionNumber: 2,
          status: 'draft',
          storageKey: 'documents/d/b.pdf',
          uploadedBy: USER_ID,
          createdAt: NOW,
        },
        {
          versionNumber: 1,
          status: 'draft',
          storageKey: 'documents/d/a.pdf',
          uploadedBy: USER_ID,
          createdAt: NOW,
        },
      ],
    });
    expect(doc.versions.map((v) => v.versionNumber)).toEqual([1, 2]);
    // 復元後の追加は連番を継続する
    const v3 = doc.addVersion({
      storageKey: new StorageKey('documents/d/c.pdf'),
      uploadedBy: new UploaderId(USER_ID),
      createdAt: NOW,
    });
    expect(v3.versionNumber).toBe(3);
  });

  it.each([
    { numbers: [1, 1], reason: 'duplicate' },
    { numbers: [2], reason: 'not starting at 1' },
    { numbers: [1, 3], reason: 'gap' },
  ])(
    'should reject reconstruction of a broken version sequence ($reason)',
    ({ numbers }) => {
      expect(() =>
        Document.reconstruct({
          id: new DocumentId(DOC_ID),
          projectId: new DocumentProjectId(PROJ_ID),
          name: new DocumentName('設計書'),
          createdAt: NOW,
          versionsData: numbers.map((n) => ({
            versionNumber: n,
            status: 'draft',
            storageKey: `documents/d/v${String(n)}.pdf`,
            uploadedBy: USER_ID,
            createdAt: NOW,
          })),
        }),
      ).toThrow(InvalidDocumentStateError);
    },
  );
});

describe('Document version workflow', () => {
  function docWithOneVersion(): Document {
    const doc = newDocument();
    doc.addVersion({
      storageKey: new StorageKey('documents/d/a.pdf'),
      uploadedBy: new UploaderId(USER_ID),
      createdAt: NOW,
    });
    return doc;
  }

  it('should walk a version through submit → approve → publish to official', () => {
    const doc = docWithOneVersion();

    doc.submitVersion(1);
    expect(doc.findVersion(1)?.status.value).toBe('under_review');

    doc.approveVersion(1);
    expect(doc.findVersion(1)?.status.value).toBe('approved');
    expect(doc.officialVersionNumber).toBeNull();

    doc.publishVersion(1);
    expect(doc.findVersion(1)?.status.value).toBe('official');
    expect(doc.officialVersionNumber).toBe(1);
  });

  it('should support the request-changes branch', () => {
    const doc = docWithOneVersion();
    doc.submitVersion(1);

    doc.requestChangesOnVersion(1);

    expect(doc.findVersion(1)?.status.value).toBe('changes_requested');
  });

  it('should support the reject branch', () => {
    const doc = docWithOneVersion();
    doc.submitVersion(1);

    doc.rejectVersion(1);

    expect(doc.findVersion(1)?.status.value).toBe('rejected');
  });

  it('should reject an illegal transition (approve a draft)', () => {
    const doc = docWithOneVersion();

    expect(() => {
      doc.approveVersion(1);
    }).toThrow(InvalidVersionTransitionError);
  });

  it('should reject operating on a non-existent version', () => {
    const doc = docWithOneVersion();

    expect(() => {
      doc.submitVersion(99);
    }).toThrow(VersionNotFoundError);
  });

  it('should reconstruct with a valid official pointer', () => {
    const doc = Document.reconstruct({
      id: new DocumentId(DOC_ID),
      projectId: new DocumentProjectId(PROJ_ID),
      name: new DocumentName('設計書'),
      createdAt: NOW,
      versionsData: [
        {
          versionNumber: 1,
          status: 'official',
          storageKey: 'documents/d/a.pdf',
          uploadedBy: USER_ID,
          createdAt: NOW,
        },
      ],
      officialVersionNumber: 1,
    });

    expect(doc.officialVersionNumber).toBe(1);
  });

  it('should reject reconstruction when the official pointer is not official', () => {
    expect(() =>
      Document.reconstruct({
        id: new DocumentId(DOC_ID),
        projectId: new DocumentProjectId(PROJ_ID),
        name: new DocumentName('設計書'),
        createdAt: NOW,
        versionsData: [
          {
            versionNumber: 1,
            status: 'draft',
            storageKey: 'documents/d/a.pdf',
            uploadedBy: USER_ID,
            createdAt: NOW,
          },
        ],
        officialVersionNumber: 1,
      }),
    ).toThrow(InvalidDocumentStateError);
  });
});

describe('Document comments', () => {
  it('should add a comment to a version and expose it read-only', () => {
    const doc = docWithOneVersion();

    const added = doc.addComment(1, {
      id: new CommentId(COMMENT_A),
      authorId: new CommentAuthorId(AUTHOR_ID),
      content: new CommentContent('  配置を見直してください  '),
      createdAt: NOW,
    });

    expect(added.id.value).toBe(COMMENT_A);
    expect(added.content.value).toBe('配置を見直してください');
    expect(doc.commentsOf(1)).toHaveLength(1);
    expect(doc.versions[0]?.comments[0]?.authorId.value).toBe(AUTHOR_ID);
  });

  it('should reject a comment on a non-existent version', () => {
    const doc = docWithOneVersion();

    expect(() =>
      doc.addComment(2, {
        id: new CommentId(COMMENT_A),
        authorId: new CommentAuthorId(AUTHOR_ID),
        content: new CommentContent('x'),
        createdAt: NOW,
      }),
    ).toThrow(VersionNotFoundError);
  });

  it('should let the author delete their own comment', () => {
    const doc = docWithOneVersion();
    doc.addComment(1, {
      id: new CommentId(COMMENT_A),
      authorId: new CommentAuthorId(AUTHOR_ID),
      content: new CommentContent('消す対象'),
      createdAt: NOW,
    });

    doc.deleteComment(
      1,
      new CommentId(COMMENT_A),
      new CommentAuthorId(AUTHOR_ID),
    );

    expect(doc.commentsOf(1)).toHaveLength(0);
  });

  it('should forbid deleting a comment authored by someone else', () => {
    const doc = docWithOneVersion();
    doc.addComment(1, {
      id: new CommentId(COMMENT_A),
      authorId: new CommentAuthorId(AUTHOR_ID),
      content: new CommentContent('他人のコメント'),
      createdAt: NOW,
    });

    expect(() => {
      doc.deleteComment(
        1,
        new CommentId(COMMENT_A),
        new CommentAuthorId(OTHER_ID),
      );
    }).toThrow(CommentForbiddenError);
    expect(doc.commentsOf(1)).toHaveLength(1);
  });

  it('should reject deleting a non-existent comment', () => {
    const doc = docWithOneVersion();

    expect(() => {
      doc.deleteComment(
        1,
        new CommentId(COMMENT_A),
        new CommentAuthorId(AUTHOR_ID),
      );
    }).toThrow(CommentNotFoundError);
  });

  it('should expose comments in chronological order after reconstruct', () => {
    const earlier = NOW;
    const later = NOW.add(1, 'hour');
    const doc = Document.reconstruct({
      id: new DocumentId(DOC_ID),
      projectId: new DocumentProjectId(PROJ_ID),
      name: new DocumentName('設計書'),
      createdAt: NOW,
      versionsData: [
        {
          versionNumber: 1,
          status: 'draft',
          storageKey: 'documents/d/a.pdf',
          uploadedBy: USER_ID,
          createdAt: NOW,
          comments: [
            {
              id: COMMENT_B,
              authorId: AUTHOR_ID,
              content: '後のコメント',
              createdAt: later,
              updatedAt: later,
            },
            {
              id: COMMENT_A,
              authorId: AUTHOR_ID,
              content: '先のコメント',
              createdAt: earlier,
              updatedAt: earlier,
            },
          ],
        },
      ],
    });

    expect(doc.commentsOf(1).map((c) => c.id.value)).toEqual([
      COMMENT_A,
      COMMENT_B,
    ]);
  });

  it('should set updatedAt equal to createdAt for a freshly added comment', () => {
    const doc = docWithOneVersion();

    const added = doc.addComment(1, {
      id: new CommentId(COMMENT_A),
      authorId: new CommentAuthorId(AUTHOR_ID),
      content: new CommentContent('未編集のコメント'),
      createdAt: NOW,
    });

    expect(added.updatedAt.valueOf()).toBe(added.createdAt.valueOf());
  });

  it('should let the author edit their own comment and bump updatedAt', () => {
    const doc = docWithOneVersion();
    doc.addComment(1, {
      id: new CommentId(COMMENT_A),
      authorId: new CommentAuthorId(AUTHOR_ID),
      content: new CommentContent('誤記あり'),
      createdAt: NOW,
    });
    const editedAt = NOW.add(1, 'hour');

    const edited = doc.editComment(1, new CommentId(COMMENT_A), {
      content: new CommentContent('  誤記を修正  '),
      requesterId: new CommentAuthorId(AUTHOR_ID),
      editedAt,
    });

    expect(edited.content.value).toBe('誤記を修正');
    expect(edited.updatedAt.valueOf()).toBe(editedAt.valueOf());
    expect(edited.createdAt.valueOf()).toBe(NOW.valueOf());
    expect(doc.commentsOf(1)[0]?.content.value).toBe('誤記を修正');
  });

  it.each([
    { input: '誤記あり', reason: '完全一致' },
    { input: '  誤記あり  ', reason: 'trim 後に一致（前後空白のみ差分）' },
  ])(
    'should keep updatedAt unchanged when normalized content is identical ($reason)',
    ({ input }) => {
      const doc = docWithOneVersion();
      doc.addComment(1, {
        id: new CommentId(COMMENT_A),
        authorId: new CommentAuthorId(AUTHOR_ID),
        content: new CommentContent('誤記あり'),
        createdAt: NOW,
      });

      const edited = doc.editComment(1, new CommentId(COMMENT_A), {
        content: new CommentContent(input),
        requesterId: new CommentAuthorId(AUTHOR_ID),
        editedAt: NOW.add(1, 'hour'),
      });

      expect(edited.content.value).toBe('誤記あり');
      expect(edited.updatedAt.valueOf()).toBe(NOW.valueOf());
      expect(doc.commentsOf(1)[0]?.updatedAt.valueOf()).toBe(NOW.valueOf());
    },
  );

  it('should forbid editing a comment authored by someone else', () => {
    const doc = docWithOneVersion();
    doc.addComment(1, {
      id: new CommentId(COMMENT_A),
      authorId: new CommentAuthorId(AUTHOR_ID),
      content: new CommentContent('他人のコメント'),
      createdAt: NOW,
    });

    expect(() => {
      doc.editComment(1, new CommentId(COMMENT_A), {
        content: new CommentContent('改竄'),
        requesterId: new CommentAuthorId(OTHER_ID),
        editedAt: NOW.add(1, 'hour'),
      });
    }).toThrow(CommentForbiddenError);
    expect(doc.commentsOf(1)[0]?.content.value).toBe('他人のコメント');
  });

  it('should reject editing a non-existent comment', () => {
    const doc = docWithOneVersion();

    expect(() => {
      doc.editComment(1, new CommentId(COMMENT_A), {
        content: new CommentContent('x'),
        requesterId: new CommentAuthorId(AUTHOR_ID),
        editedAt: NOW,
      });
    }).toThrow(CommentNotFoundError);
  });

  it('should reject editing a comment on a non-existent version', () => {
    const doc = docWithOneVersion();

    expect(() => {
      doc.editComment(2, new CommentId(COMMENT_A), {
        content: new CommentContent('x'),
        requesterId: new CommentAuthorId(AUTHOR_ID),
        editedAt: NOW,
      });
    }).toThrow(VersionNotFoundError);
  });
});

describe('Document rename', () => {
  it('should replace the name with the given value', () => {
    const doc = newDocument();

    doc.rename(new DocumentName('要件定義書'));

    expect(doc.name.value).toBe('要件定義書');
  });

  it('should keep other state unchanged when renamed', () => {
    const doc = docWithOneVersion();

    doc.rename(new DocumentName('改訂版'));

    expect(doc.id.value).toBe(DOC_ID);
    expect(doc.projectId.value).toBe(PROJ_ID);
    expect(doc.versions).toHaveLength(1);
  });

  it('should reject an invalid name via the value object', () => {
    const doc = newDocument();

    expect(() => {
      doc.rename(new DocumentName('   '));
    }).toThrow();
    expect(doc.name.value).toBe('設計書');
  });
});
