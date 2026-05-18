import dayjs from 'dayjs';
import { and, eq } from 'drizzle-orm';

import type { DocumentId } from '../../../document/domain/document-id';
import { ApprovalPolicy } from '../../../project/domain/approval-policy';
import { ProjectRole } from '../../../project/domain/project-role';
import { DuplicateApprovalError } from '../../domain/duplicate-approval-error';
import { ReviewRequest } from '../../domain/review-request';
import { ReviewRequestId } from '../../domain/review-request-id';
import type { ReviewRequestRepository } from '../../domain/review-request-repository';
import { ReviewRequestStatus } from '../../domain/review-request-status';

import type { DbOrTx } from './database';
import { reviewApprovals, reviewRequests } from './schema';

export class DrizzleReviewRequestRepository implements ReviewRequestRepository {
  readonly #db: DbOrTx;

  constructor(db: DbOrTx) {
    this.#db = db;
  }

  async findByVersion(
    documentId: DocumentId,
    versionNumber: number,
  ): Promise<ReviewRequest | null> {
    // 依頼行と承認行を一貫スナップショットで読む。
    const snapshot = await this.#db.transaction(
      async (tx) => {
        const rrRows = await tx
          .select()
          .from(reviewRequests)
          .where(
            and(
              eq(reviewRequests.documentId, documentId.value),
              eq(reviewRequests.versionNumber, versionNumber),
            ),
          )
          .limit(1);
        const rr = rrRows[0];
        if (rr === undefined) {
          return null;
        }
        const approvalRows = await tx
          .select()
          .from(reviewApprovals)
          .where(eq(reviewApprovals.reviewRequestId, rr.id));
        return { rr, approvalRows };
      },
      { isolationLevel: 'repeatable read' },
    );
    if (snapshot === null) {
      return null;
    }
    const { rr, approvalRows } = snapshot;
    const policy = new ApprovalPolicy({
      requiredApprovals: rr.requiredApprovals,
      approverRoles: rr.approverRoles.map((r) => new ProjectRole(r)),
    });
    return ReviewRequest.reconstruct({
      id: new ReviewRequestId(rr.id),
      documentId,
      versionNumber: rr.versionNumber,
      policy,
      status: ReviewRequestStatus.fromString(rr.status),
      createdAt: dayjs(rr.createdAt),
      decidedAt: rr.decidedAt === null ? null : dayjs(rr.decidedAt),
      approvalsData: approvalRows.map((a) => ({
        approverId: a.approverId,
        role: a.role,
        decidedAt: dayjs(a.decidedAt),
      })),
    });
  }

  async save(reviewRequest: ReviewRequest): Promise<void> {
    const decidedAt = reviewRequest.decidedAt;
    const rrRow = {
      id: reviewRequest.id.value,
      documentId: reviewRequest.documentId.value,
      versionNumber: reviewRequest.versionNumber,
      status: reviewRequest.status.value,
      requiredApprovals: reviewRequest.policy.requiredApprovals,
      approverRoles: reviewRequest.policy.approverRoles.map((r) => r.value),
      createdAt: reviewRequest.createdAt.toDate(),
      decidedAt: decidedAt === null ? null : decidedAt.toDate(),
    };
    const approvalRows = reviewRequest.approvals.map((a) => ({
      reviewRequestId: reviewRequest.id.value,
      approverId: a.approverId.value,
      role: a.role.value,
      decidedAt: a.decidedAt.toDate(),
    }));

    await this.#db.transaction(async (tx) => {
      // 依頼ヘッダは status / decided_at が遷移で変わるため upsert。
      await tx
        .insert(reviewRequests)
        .values(rrRow)
        .onConflictDoUpdate({
          target: reviewRequests.id,
          set: { status: rrRow.status, decidedAt: rrRow.decidedAt },
        });
      // 承認は追記専用。既登録の承認者ぶんを除いて素の insert で追加する。
      const existing = await tx
        .select({ approverId: reviewApprovals.approverId })
        .from(reviewApprovals)
        .where(eq(reviewApprovals.reviewRequestId, reviewRequest.id.value));
      const persisted = new Set(existing.map((r) => r.approverId));
      const toInsert = approvalRows.filter((a) => !persisted.has(a.approverId));
      if (toInsert.length > 0) {
        try {
          await tx.insert(reviewApprovals).values(toInsert);
        } catch (e) {
          // 並行リクエストで同一承認者が複合主キー違反 (23505) を起こした
          // 場合、API 契約上の競合としてドメイン例外へ変換する。
          if (isUniqueViolation(e)) {
            throw new DuplicateApprovalError();
          }
          throw e;
        }
      }
    });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}
