import { ApprovalPolicy } from '../domain/approval-policy';
import { MemberUserId } from '../domain/member-user-id';
import { ProjectId } from '../domain/project-id';
import { ProjectNotFoundError } from '../domain/project-not-found-error';
import type { ProjectRepository } from '../domain/project-repository';
import { ProjectRole } from '../domain/project-role';

import { NotAuthorizedError } from './not-authorized-error';
import { toProjectResult } from './project-result';
import type { ProjectResult } from './project-result';

export interface UpdateApprovalPolicyCommand {
  readonly projectId: string;
  readonly actingUserId: string;
  readonly requiredApprovals: number;
  readonly approverRoles: readonly string[];
}

/** Owner が承認ポリシーを変更する。 */
export class UpdateApprovalPolicyUseCase {
  readonly #projects: ProjectRepository;

  constructor(deps: { projects: ProjectRepository }) {
    this.#projects = deps.projects;
  }

  async execute(command: UpdateApprovalPolicyCommand): Promise<ProjectResult> {
    const project = await this.#projects.findById(
      new ProjectId(command.projectId),
    );
    if (project === null) {
      throw new ProjectNotFoundError();
    }
    if (!project.isOwner(new MemberUserId(command.actingUserId))) {
      throw new NotAuthorizedError();
    }

    project.updateApprovalPolicy(
      new ApprovalPolicy({
        requiredApprovals: command.requiredApprovals,
        approverRoles: command.approverRoles.map((r) => new ProjectRole(r)),
      }),
    );
    await this.#projects.save(project);
    return toProjectResult(project);
  }
}
