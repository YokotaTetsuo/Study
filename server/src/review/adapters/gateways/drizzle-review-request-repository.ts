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
  // 外側（DrizzleTransactor）が既に tx 境界を張っている場合 true。
  // その際は内部で transaction を張らずネスト savepoint を避ける。
  readonly #inTx: boolean;

  constructor(db: DbOrTx, inTx = false) {
    this.#db = db;
    this.#inTx = inTx;
  }

  #withTx<T>(
    work: (conn: DbOrTx) => Promise<T>,
    opts?: { readonly isolationLevel: 'repeatable read' },
  ): Promise<T> {
    if (this.#inTx) {
      return work(this.#db);
    }
    return opts === undefined
      ? this.#db.transaction(work)
      : this.#db.transaction(work, opts);
  }

  async findByVersion(
    documentId: DocumentId,
    versionNumber: number,
  ): Promise<ReviewRequest | null> {
    // 依頼行と承認行を一貫スナップショットで読む。
    const snapshot = await this.#withTx(
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

    // Transactor 外で単独使用された場合でも write skew 防止の前提
    // （REPEATABLE READ）を満たすよう分離レベルを明示する。Transactor
    // 配下（inTx）では指定は無視され外側の tx を共有する。
    await this.#withTx(
      async (tx) => {
        const current = await tx
          .select({
            status: reviewRequests.status,
            decidedAt: reviewRequests.decidedAt,
          })
          .from(reviewRequests)
          .where(eq(reviewRequests.id, rrRow.id))
          .limit(1);
        const head = current[0];

        // 追記する承認を先に確定させ、approve 経路か終端決定（差戻し/却下）
        // 経路かを判別する。
        const existing = await tx
          .select({ approverId: reviewApprovals.approverId })
          .from(reviewApprovals)
          .where(eq(reviewApprovals.reviewRequestId, reviewRequest.id.value));
        const persisted = new Set(existing.map((r) => r.approverId));
        const toInsert = approvalRows.filter(
          (a) => !persisted.has(a.approverId),
        );
        const isApprovePath =
          toInsert.length > 0 || rrRow.status === 'approved';

        if (head === undefined) {
          await tx.insert(reviewRequests).values(rrRow);
        } else if (isApprovePath) {
          // approve 経路は充足前でもヘッダを必ず UPDATE して行を更新する。
          // これにより REPEATABLE READ 下で並行する別 approver の保存は
          // 直列化失敗(40001)で弾かれ（→ 409 でリトライ）、両者が
          // 「承認 1 件」のまま確定しない write skew を防ぐ。
          await tx
            .update(reviewRequests)
            .set({ status: rrRow.status, decidedAt: rrRow.decidedAt })
            .where(eq(reviewRequests.id, rrRow.id));
        } else {
          // 終端決定（差戻し/却下）は承認蓄積を伴わないため、status/
          // decided_at が実際に変わるときだけ UPDATE する。
          const decidedChanged =
            (head.decidedAt === null ? null : head.decidedAt.getTime()) !==
            (rrRow.decidedAt === null ? null : rrRow.decidedAt.getTime());
          if (head.status !== rrRow.status || decidedChanged) {
            await tx
              .update(reviewRequests)
              .set({ status: rrRow.status, decidedAt: rrRow.decidedAt })
              .where(eq(reviewRequests.id, rrRow.id));
          }
        }

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
      },
      { isolationLevel: 'repeatable read' },
    );
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
