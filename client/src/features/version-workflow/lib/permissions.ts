import type { ProjectRole } from '@pdf-review/shared';

export interface WorkflowPermissions {
  /** 版を提出できる（プロジェクトメンバー）。 */
  readonly canSubmit: boolean;
  /** 承認できる（承認ポリシーの承認可能ロール）。 */
  readonly canApprove: boolean;
  /** 差戻し / 却下できる（reviewer または owner）。 */
  readonly canReview: boolean;
  /** 正式版化できる（owner）。 */
  readonly canPublish: boolean;
}

/**
 * 現在ユーザーのプロジェクト内ロールと承認ポリシーから、UI で提示してよい
 * 操作を導く（サーバの認可と同じ条件。403 になる操作を出さないため）。
 * role が undefined（非メンバー）の場合は全操作不可。
 */
export function computePermissions(
  role: ProjectRole | undefined,
  approverRoles: readonly ProjectRole[],
): WorkflowPermissions {
  if (role === undefined) {
    return {
      canSubmit: false,
      canApprove: false,
      canReview: false,
      canPublish: false,
    };
  }
  return {
    canSubmit: true,
    canApprove: approverRoles.includes(role),
    canReview: role === 'reviewer' || role === 'owner',
    canPublish: role === 'owner',
  };
}
