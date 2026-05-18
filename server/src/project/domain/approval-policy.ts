import { ValidationError } from '../../shared-kernel/validation-error';

import { ProjectRole } from './project-role';

/**
 * 承認ポリシー値オブジェクト。必要承認数と承認可能ロール集合。
 */
export class ApprovalPolicy {
  readonly #requiredApprovals: number;
  readonly #approverRoles: readonly ProjectRole[];

  constructor(params: {
    requiredApprovals: number;
    approverRoles: readonly ProjectRole[];
  }) {
    if (
      !Number.isInteger(params.requiredApprovals) ||
      params.requiredApprovals < 1
    ) {
      throw new ValidationError('requiredApprovals は 1 以上の整数が必要です');
    }
    if (params.approverRoles.length === 0) {
      throw new ValidationError('approverRoles は 1 つ以上必要です');
    }
    this.#requiredApprovals = params.requiredApprovals;
    this.#approverRoles = [...params.approverRoles];
  }

  static default(): ApprovalPolicy {
    return new ApprovalPolicy({
      requiredApprovals: 1,
      approverRoles: [new ProjectRole('owner')],
    });
  }

  get requiredApprovals(): number {
    return this.#requiredApprovals;
  }

  get approverRoles(): readonly ProjectRole[] {
    return [...this.#approverRoles];
  }

  /** 指定ロールがこのポリシー上で承認権限を持つか。 */
  canApprove(role: ProjectRole): boolean {
    return this.#approverRoles.some((r) => r.equals(role));
  }

  /**
   * 与えられた承認者ロール群でポリシーが充足するか評価する。
   * 承認可能ロールに該当する承認の数が必要承認数以上なら true。
   * 承認者の重複排除（同一ユーザーの二重承認禁止）は ReviewRequest 集約の責務。
   */
  isSatisfiedBy(approverRoles: readonly ProjectRole[]): boolean {
    const qualifying = approverRoles.filter((r) => this.canApprove(r)).length;
    return qualifying >= this.#requiredApprovals;
  }
}
