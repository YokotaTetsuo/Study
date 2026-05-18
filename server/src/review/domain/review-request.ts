import type { Dayjs } from 'dayjs';

import type { DocumentId } from '../../document/domain/document-id';
import type { ApprovalPolicy } from '../../project/domain/approval-policy';
import { ProjectRole } from '../../project/domain/project-role';

import { ApproverId } from './approver-id';
import { DuplicateApprovalError } from './duplicate-approval-error';
import { InvalidReviewRequestStateError } from './invalid-review-request-state-error';
import type { ReviewRequestId } from './review-request-id';
import { ReviewRequestStatus } from './review-request-status';
import { UnauthorizedApproverError } from './unauthorized-approver-error';

class Approval {
  readonly #approverId: ApproverId;
  readonly #role: ProjectRole;
  readonly #decidedAt: Dayjs;

  private constructor(params: {
    approverId: ApproverId;
    role: ProjectRole;
    decidedAt: Dayjs;
  }) {
    this.#approverId = params.approverId;
    this.#role = params.role;
    this.#decidedAt = params.decidedAt;
  }

  static create(params: {
    approverId: ApproverId;
    role: ProjectRole;
    decidedAt: Dayjs;
  }): Approval {
    return new Approval(params);
  }

  static reconstruct(params: {
    approverId: ApproverId;
    role: ProjectRole;
    decidedAt: Dayjs;
  }): Approval {
    return new Approval(params);
  }

  get approverId(): ApproverId {
    return this.#approverId;
  }

  get role(): ProjectRole {
    return this.#role;
  }

  get decidedAt(): Dayjs {
    return this.#decidedAt;
  }
}

/**
 * 集約外から内部エンティティ Approval を読み取るビュー型。
 * mutator を持たず集約境界をコンパイラ強制する。
 */
export interface ApprovalReadonly {
  readonly approverId: ApproverId;
  readonly role: ProjectRole;
  readonly decidedAt: Dayjs;
}

/**
 * 提出版の承認集約。提出時の ApprovalPolicy をスナップショットとして内包し、
 * 承認の蓄積によるポリシー充足判定を自身で行う（線形ワークフロー）。
 * 不変条件:
 *  - 確定後（approved/changes_requested/rejected）は再決定不可
 *  - 承認可能ロール外は承認不可
 *  - 同一承認者の二重承認不可
 */
export class ReviewRequest {
  readonly #id: ReviewRequestId;
  readonly #documentId: DocumentId;
  readonly #versionNumber: number;
  readonly #policy: ApprovalPolicy;
  #status: ReviewRequestStatus;
  readonly #approvals: Approval[];
  readonly #createdAt: Dayjs;
  #decidedAt: Dayjs | null;

  private constructor(params: {
    id: ReviewRequestId;
    documentId: DocumentId;
    versionNumber: number;
    policy: ApprovalPolicy;
    status: ReviewRequestStatus;
    approvals: Approval[];
    createdAt: Dayjs;
    decidedAt: Dayjs | null;
  }) {
    this.#id = params.id;
    this.#documentId = params.documentId;
    this.#versionNumber = params.versionNumber;
    this.#policy = params.policy;
    this.#status = params.status;
    this.#approvals = params.approvals;
    this.#createdAt = params.createdAt;
    this.#decidedAt = params.decidedAt;
  }

  static create(params: {
    id: ReviewRequestId;
    documentId: DocumentId;
    versionNumber: number;
    policy: ApprovalPolicy;
    createdAt: Dayjs;
  }): ReviewRequest {
    return new ReviewRequest({
      id: params.id,
      documentId: params.documentId,
      versionNumber: params.versionNumber,
      policy: params.policy,
      status: ReviewRequestStatus.pending(),
      approvals: [],
      createdAt: params.createdAt,
      decidedAt: null,
    });
  }

  static reconstruct(params: {
    id: ReviewRequestId;
    documentId: DocumentId;
    versionNumber: number;
    policy: ApprovalPolicy;
    status: ReviewRequestStatus;
    createdAt: Dayjs;
    decidedAt: Dayjs | null;
    approvalsData: readonly {
      readonly approverId: string;
      readonly role: string;
      readonly decidedAt: Dayjs;
    }[];
  }): ReviewRequest {
    const approvals = params.approvalsData.map((d) =>
      Approval.reconstruct({
        approverId: new ApproverId(d.approverId),
        role: new ProjectRole(d.role),
        decidedAt: d.decidedAt,
      }),
    );
    return new ReviewRequest({
      id: params.id,
      documentId: params.documentId,
      versionNumber: params.versionNumber,
      policy: params.policy,
      status: params.status,
      approvals,
      createdAt: params.createdAt,
      decidedAt: params.decidedAt,
    });
  }

  #ensurePending(action: string): void {
    if (!this.#status.isPending()) {
      throw new InvalidReviewRequestStateError(
        `${action} は受付中の依頼にのみ可能です（現在: ${this.#status.value}）`,
      );
    }
  }

  /**
   * 承認を 1 件追加する。ポリシーが充足したら status を approved に確定する。
   */
  approve(params: {
    approverId: ApproverId;
    approverRole: ProjectRole;
    decidedAt: Dayjs;
  }): ApprovalReadonly {
    this.#ensurePending('承認');
    if (!this.#policy.canApprove(params.approverRole)) {
      throw new UnauthorizedApproverError(params.approverRole.value);
    }
    if (this.#approvals.some((a) => a.approverId.equals(params.approverId))) {
      throw new DuplicateApprovalError();
    }
    const approval = Approval.create({
      approverId: params.approverId,
      role: params.approverRole,
      decidedAt: params.decidedAt,
    });
    this.#approvals.push(approval);
    if (this.#policy.isSatisfiedBy(this.#approvals.map((a) => a.role))) {
      this.#status = ReviewRequestStatus.fromString('approved');
      this.#decidedAt = params.decidedAt;
    }
    return approval;
  }

  /** 差戻し（受付中 → changes_requested）。 */
  requestChanges(decidedAt: Dayjs): void {
    this.#ensurePending('差戻し');
    this.#status = ReviewRequestStatus.fromString('changes_requested');
    this.#decidedAt = decidedAt;
  }

  /** 却下（受付中 → rejected）。 */
  reject(decidedAt: Dayjs): void {
    this.#ensurePending('却下');
    this.#status = ReviewRequestStatus.fromString('rejected');
    this.#decidedAt = decidedAt;
  }

  get id(): ReviewRequestId {
    return this.#id;
  }

  get documentId(): DocumentId {
    return this.#documentId;
  }

  get versionNumber(): number {
    return this.#versionNumber;
  }

  /** 提出時にスナップショットした承認ポリシー（永続化・参照用）。 */
  get policy(): ApprovalPolicy {
    return this.#policy;
  }

  get status(): ReviewRequestStatus {
    return this.#status;
  }

  get approvals(): readonly ApprovalReadonly[] {
    return [...this.#approvals];
  }

  get createdAt(): Dayjs {
    return this.#createdAt;
  }

  get decidedAt(): Dayjs | null {
    return this.#decidedAt;
  }

  isApproved(): boolean {
    return this.#status.value === 'approved';
  }
}
