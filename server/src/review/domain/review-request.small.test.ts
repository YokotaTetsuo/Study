import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { describe, expect, it } from 'vitest';

import { DocumentId } from '../../document/domain/document-id';
import { ApprovalPolicy } from '../../project/domain/approval-policy';
import { ProjectRole } from '../../project/domain/project-role';

import { ApproverId } from './approver-id';
import { DuplicateApprovalError } from './duplicate-approval-error';
import { InvalidReviewRequestStateError } from './invalid-review-request-state-error';
import { ReviewRequest } from './review-request';
import { ReviewRequestId } from './review-request-id';
import { UnauthorizedApproverError } from './unauthorized-approver-error';

const RR_ID = '01HQ8ZK9PRSTVWXYZ234567890';
const DOC_ID = '01HQ8ZK9PRSTVWXYZ23456789A';
const APPROVER_1 = '01HQ8ZK9PRSTVWXYZ23456789B';
const APPROVER_2 = '01HQ8ZK9PRSTVWXYZ23456789C';
const NOW: Dayjs = dayjs('2026-05-18T00:00:00.000Z');

function policy(requiredApprovals: number): ApprovalPolicy {
  return new ApprovalPolicy({
    requiredApprovals,
    approverRoles: [new ProjectRole('owner'), new ProjectRole('approver')],
  });
}

function aReviewRequest(requiredApprovals = 1): ReviewRequest {
  return ReviewRequest.create({
    id: new ReviewRequestId(RR_ID),
    documentId: new DocumentId(DOC_ID),
    versionNumber: 1,
    policy: policy(requiredApprovals),
    createdAt: NOW,
  });
}

describe('ReviewRequest', () => {
  it('should start pending with no approvals', () => {
    const rr = aReviewRequest();
    expect(rr.status.value).toBe('pending');
    expect(rr.approvals).toHaveLength(0);
    expect(rr.isApproved()).toBe(false);
    expect(rr.decidedAt).toBeNull();
  });

  it('should become approved once the policy is satisfied', () => {
    const rr = aReviewRequest(1);

    rr.approve({
      approverId: new ApproverId(APPROVER_1),
      approverRole: new ProjectRole('owner'),
      decidedAt: NOW,
    });

    expect(rr.isApproved()).toBe(true);
    expect(rr.status.value).toBe('approved');
    expect(rr.decidedAt?.toISOString()).toBe(NOW.toISOString());
  });

  it('should stay pending until the required number of approvals is reached', () => {
    const rr = aReviewRequest(2);

    rr.approve({
      approverId: new ApproverId(APPROVER_1),
      approverRole: new ProjectRole('owner'),
      decidedAt: NOW,
    });
    expect(rr.status.value).toBe('pending');

    rr.approve({
      approverId: new ApproverId(APPROVER_2),
      approverRole: new ProjectRole('approver'),
      decidedAt: NOW,
    });
    expect(rr.status.value).toBe('approved');
  });

  it('should reject an approver whose role lacks approval authority', () => {
    const rr = aReviewRequest();

    expect(() =>
      rr.approve({
        approverId: new ApproverId(APPROVER_1),
        approverRole: new ProjectRole('reviewer'),
        decidedAt: NOW,
      }),
    ).toThrow(UnauthorizedApproverError);
  });

  it('should reject a duplicate approval from the same approver', () => {
    const rr = aReviewRequest(2);
    rr.approve({
      approverId: new ApproverId(APPROVER_1),
      approverRole: new ProjectRole('owner'),
      decidedAt: NOW,
    });

    expect(() =>
      rr.approve({
        approverId: new ApproverId(APPROVER_1),
        approverRole: new ProjectRole('owner'),
        decidedAt: NOW,
      }),
    ).toThrow(DuplicateApprovalError);
  });

  it('should not accept further decisions once approved', () => {
    const rr = aReviewRequest(1);
    rr.approve({
      approverId: new ApproverId(APPROVER_1),
      approverRole: new ProjectRole('owner'),
      decidedAt: NOW,
    });

    expect(() => {
      rr.reject(NOW);
    }).toThrow(InvalidReviewRequestStateError);
  });

  it('should support the request-changes branch and then be final', () => {
    const rr = aReviewRequest();

    rr.requestChanges(NOW);

    expect(rr.status.value).toBe('changes_requested');
    expect(() =>
      rr.approve({
        approverId: new ApproverId(APPROVER_1),
        approverRole: new ProjectRole('owner'),
        decidedAt: NOW,
      }),
    ).toThrow(InvalidReviewRequestStateError);
  });

  it('should support the reject branch', () => {
    const rr = aReviewRequest();

    rr.reject(NOW);

    expect(rr.status.value).toBe('rejected');
  });

  it('should round-trip through reconstruct', () => {
    const rr = ReviewRequest.reconstruct({
      id: new ReviewRequestId(RR_ID),
      documentId: new DocumentId(DOC_ID),
      versionNumber: 2,
      policy: policy(1),
      status: aReviewRequest().status,
      createdAt: NOW,
      decidedAt: null,
      approvalsData: [
        { approverId: APPROVER_1, role: 'owner', decidedAt: NOW },
      ],
    });

    expect(rr.versionNumber).toBe(2);
    expect(rr.approvals).toHaveLength(1);
    expect(rr.approvals[0]?.role.value).toBe('owner');
  });
});
