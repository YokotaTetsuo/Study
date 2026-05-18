import dayjs from 'dayjs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { truncateDocuments } from '../../../document/__tests__/medium-db';
import { DrizzleDocumentRepository } from '../../../document/adapters/gateways/drizzle-document-repository';
import { Document } from '../../../document/domain/document';
import { DocumentId } from '../../../document/domain/document-id';
import { DocumentName } from '../../../document/domain/document-name';
import { DocumentProjectId } from '../../../document/domain/document-project-id';
import type { DbClient } from '../../../infrastructure/db/client';
import { ApprovalPolicy } from '../../../project/domain/approval-policy';
import { ProjectRole } from '../../../project/domain/project-role';
import { makeTestDbClient, truncateReview } from '../../__tests__/medium-db';
import { ApproverId } from '../../domain/approver-id';
import { ReviewRequest } from '../../domain/review-request';
import { ReviewRequestId } from '../../domain/review-request-id';

import { DrizzleReviewRequestRepository } from './drizzle-review-request-repository';

const client: DbClient = makeTestDbClient();
const repo = new DrizzleReviewRequestRepository(client.db);
const docRepo = new DrizzleDocumentRepository(client.db);

const RR_ID = '01HQ8ZK9PRSTVWXYZ234567890';
const DOC_ID = '01HQ8ZK9PRSTVWXYZ23456789A';
const PROJECT_ID = '01HQ8ZK9PRSTVWXYZ23456789D';
const APPROVER_1 = '01HQ8ZK9PRSTVWXYZ23456789B';
const APPROVER_2 = '01HQ8ZK9PRSTVWXYZ23456789C';
const NOW = dayjs('2026-05-18T00:00:00.000Z');

function policy(requiredApprovals: number): ApprovalPolicy {
  return new ApprovalPolicy({
    requiredApprovals,
    approverRoles: [new ProjectRole('approver')],
  });
}

function aReviewRequest(): ReviewRequest {
  return ReviewRequest.create({
    id: new ReviewRequestId(RR_ID),
    documentId: new DocumentId(DOC_ID),
    versionNumber: 1,
    policy: policy(2),
    createdAt: NOW,
  });
}

beforeEach(async () => {
  await truncateReview(client);
  await truncateDocuments(client);
  // FK (review_requests.document_id → documents.id) を満たすため親文書を先に作る。
  await docRepo.save(
    Document.create({
      id: new DocumentId(DOC_ID),
      projectId: new DocumentProjectId(PROJECT_ID),
      name: new DocumentName('設計書'),
      createdAt: NOW,
    }),
  );
});

afterAll(async () => {
  await client.sql.end();
});

describe('DrizzleReviewRequestRepository', () => {
  it('should round-trip a pending review request', async () => {
    await repo.save(aReviewRequest());

    const found = await repo.findByVersion(new DocumentId(DOC_ID), 1);

    expect(found?.id.value).toBe(RR_ID);
    expect(found?.status.value).toBe('pending');
    expect(found?.policy.requiredApprovals).toBe(2);
    expect(found?.approvals).toHaveLength(0);
  });

  it('should persist accumulated approvals and the approved status', async () => {
    const rr = aReviewRequest();
    rr.approve({
      approverId: new ApproverId(APPROVER_1),
      approverRole: new ProjectRole('approver'),
      decidedAt: NOW,
    });
    rr.approve({
      approverId: new ApproverId(APPROVER_2),
      approverRole: new ProjectRole('approver'),
      decidedAt: NOW,
    });
    await repo.save(rr);

    const found = await repo.findByVersion(new DocumentId(DOC_ID), 1);

    expect(found?.status.value).toBe('approved');
    expect(found?.approvals).toHaveLength(2);
    expect(found?.decidedAt?.toISOString()).toBe(NOW.toISOString());
  });

  it('should append approvals across separate saves', async () => {
    const rr = aReviewRequest();
    rr.approve({
      approverId: new ApproverId(APPROVER_1),
      approverRole: new ProjectRole('approver'),
      decidedAt: NOW,
    });
    await repo.save(rr);

    const loaded = await repo.findByVersion(new DocumentId(DOC_ID), 1);
    loaded?.approve({
      approverId: new ApproverId(APPROVER_2),
      approverRole: new ProjectRole('approver'),
      decidedAt: NOW,
    });
    if (loaded !== null) {
      await repo.save(loaded);
    }

    const found = await repo.findByVersion(new DocumentId(DOC_ID), 1);
    expect(found?.approvals).toHaveLength(2);
    expect(found?.status.value).toBe('approved');
  });

  it('should return null when no review request exists for the version', async () => {
    expect(await repo.findByVersion(new DocumentId(DOC_ID), 99)).toBeNull();
  });
});
