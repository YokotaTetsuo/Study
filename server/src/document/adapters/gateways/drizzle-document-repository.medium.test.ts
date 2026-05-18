import dayjs from 'dayjs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import type { DbClient } from '../../../infrastructure/db/client';
import { makeTestDbClient, truncateDocuments } from '../../__tests__/medium-db';
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
});
