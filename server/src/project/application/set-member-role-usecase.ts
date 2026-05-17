import { MemberUserId } from '../domain/member-user-id';
import { ProjectId } from '../domain/project-id';
import { ProjectNotFoundError } from '../domain/project-not-found-error';
import type { ProjectRepository } from '../domain/project-repository';
import { ProjectRole } from '../domain/project-role';

import { NotAuthorizedError } from './not-authorized-error';
import { toProjectResult } from './project-result';
import type { ProjectResult } from './project-result';

export interface SetMemberRoleCommand {
  readonly projectId: string;
  readonly actingUserId: string;
  readonly userId: string;
  readonly role: string;
}

/** Owner がメンバーのロールを変更する。 */
export class SetMemberRoleUseCase {
  readonly #projects: ProjectRepository;

  constructor(deps: { projects: ProjectRepository }) {
    this.#projects = deps.projects;
  }

  async execute(command: SetMemberRoleCommand): Promise<ProjectResult> {
    const project = await this.#projects.findById(
      new ProjectId(command.projectId),
    );
    if (project === null) {
      throw new ProjectNotFoundError();
    }
    if (!project.isOwner(new MemberUserId(command.actingUserId))) {
      throw new NotAuthorizedError();
    }

    project.setMemberRole(
      new MemberUserId(command.userId),
      new ProjectRole(command.role),
    );
    await this.#projects.save(project);
    return toProjectResult(project);
  }
}
