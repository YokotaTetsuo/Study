import type { ApprovalPolicy } from '../../project/domain/approval-policy';
import { ProjectId } from '../../project/domain/project-id';
import type { ProjectRepository } from '../../project/domain/project-repository';
import type { ProjectRole } from '../../project/domain/project-role';

import { NotAuthorizedError } from './not-authorized-error';

export interface ProjectContext {
  readonly role: ProjectRole;
  readonly policy: ApprovalPolicy;
  /** 指定ユーザーがこのプロジェクトの owner か。 */
  readonly isOwner: boolean;
}

/**
 * 差戻し / 却下を許可するロールか検証する。
 * レビュー判断はレビュアー、または管理者である owner に限定する。
 */
export function assertCanReview(ctx: ProjectContext): void {
  if (!ctx.isOwner && ctx.role.value !== 'reviewer') {
    throw new NotAuthorizedError();
  }
}

/**
 * ワークフロー usecase 共通: 対象文書のプロジェクトにおける acting user の
 * ロールと承認ポリシーを解決する。メンバーでなければ NotAuthorizedError。
 */
export async function resolveProjectContext(
  projects: ProjectRepository,
  projectIdValue: string,
  actingUserId: string,
): Promise<ProjectContext> {
  const project = await projects.findById(new ProjectId(projectIdValue));
  if (project === null) {
    throw new NotAuthorizedError();
  }
  const membership = project.members.find(
    (m) => m.userId.value === actingUserId,
  );
  if (membership === undefined) {
    throw new NotAuthorizedError();
  }
  return {
    role: membership.role,
    policy: project.approvalPolicy,
    isOwner: membership.role.isOwner(),
  };
}
