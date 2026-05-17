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
}
