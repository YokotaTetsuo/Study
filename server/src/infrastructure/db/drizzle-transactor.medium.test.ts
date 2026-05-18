import dayjs from 'dayjs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  makeTestDbClient,
  truncateDocuments,
} from '../../document/__tests__/medium-db';
import { DrizzleDocumentRepository } from '../../document/adapters/gateways/drizzle-document-repository';
import { Document } from '../../document/domain/document';
import { DocumentId } from '../../document/domain/document-id';
import { DocumentName } from '../../document/domain/document-name';
import { DocumentProjectId } from '../../document/domain/document-project-id';
import { StorageKey } from '../../document/domain/storage-key';
import { UploaderId } from '../../document/domain/uploader-id';
import { ApprovalPolicy } from '../../project/domain/approval-policy';
import { ProjectRole } from '../../project/domain/project-role';
import { truncateReview } from '../../review/__tests__/medium-db';
import { ReviewRequest } from '../../review/domain/review-request';
import { ReviewRequestId } from '../../review/domain/review-request-id';

import type { DbClient } from './client';
import { DrizzleTransactor } from './drizzle-transactor';

const client: DbClient = makeTestDbClient();
const transactor = new DrizzleTransactor(client.db);
const docRepo = new DrizzleDocumentRepository(client.db);

const DOC_ID = '01HQ8ZK9PRSTVWXYZ234567890';
const PROJ_ID = '01HQ8ZK9PRSTVWXYZ23456789A';
const USER_ID = '01HQ8ZK9PRSTVWXYZ23456789B';
const RR_ID = '01HQ8ZK9PRSTVWXYZ23456789C';
const NOW = dayjs('2026-05-18T00:00:00.000Z');

function aDocumentWithDraft(): Document {
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

function aReviewRequest(): ReviewRequest {
  return ReviewRequest.create({
    id: new ReviewRequestId(RR_ID),
    documentId: new DocumentId(DOC_ID),
    versionNumber: 1,
    policy: new ApprovalPolicy({
      requiredApprovals: 1,
      approverRoles: [new ProjectRole('approver')],
    }),
    createdAt: NOW,
  });
}

beforeEach(async () => {
  await truncateReview(client);
  await truncateDocuments(client);
});

afterAll(async () => {
  await client.sql.end();
});

describe('DrizzleTransactor', () => {
  it('should commit both aggregates atomically on success', async () => {
    await transactor.run(async ({ documents, reviewRequests }) => {
      const doc = aDocumentWithDraft();
      doc.submitVersion(1);
      // FK 充足のため親文書を先に保存してから依頼を保存する。
      await documents.save(doc);
      await reviewRequests.save(aReviewRequest());
    });

    const doc = await docRepo.findById(new DocumentId(DOC_ID));
    expect(doc?.findVersion(1)?.status.value).toBe('under_review');
  });

  it('should roll back all writes when the work throws', async () => {
    await expect(
      transactor.run(async ({ documents, reviewRequests }) => {
        const doc = aDocumentWithDraft();
        doc.submitVersion(1);
        await documents.save(doc);
        await reviewRequests.save(aReviewRequest());
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    // Document も ReviewRequest も永続化されていない（全ロールバック）。
    expect(await docRepo.findById(new DocumentId(DOC_ID))).toBeNull();
  });
});
