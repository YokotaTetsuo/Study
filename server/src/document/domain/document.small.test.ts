import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import { Document } from './document';
import { DocumentId } from './document-id';
import { DocumentName } from './document-name';
import { DocumentProjectId } from './document-project-id';
import { InvalidDocumentStateError } from './invalid-document-state-error';
import { InvalidVersionTransitionError } from './invalid-version-transition-error';
import { StorageKey } from './storage-key';
import { UploaderId } from './uploader-id';

const DOC_ID = '01HQ8ZK9PRSTVWXYZ234567890';
const PROJ_ID = '01HQ8ZK9PRSTVWXYZ23456789A';
const USER_ID = '01HQ8ZK9PRSTVWXYZ23456789B';
const NOW = dayjs('2026-05-18T00:00:00.000Z');

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
    }).toThrow(InvalidDocumentStateError);
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
