import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import { Document } from './document';
import { DocumentId } from './document-id';
import { DocumentName } from './document-name';
import { DocumentProjectId } from './document-project-id';
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
});
