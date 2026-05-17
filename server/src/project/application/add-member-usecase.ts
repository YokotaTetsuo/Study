import { MemberUserId } from '../domain/member-user-id';
import { ProjectId } from '../domain/project-id';
import { ProjectNotFoundError } from '../domain/project-not-found-error';
import type { ProjectRepository } from '../domain/project-repository';
import { ProjectRole } from '../domain/project-role';

import { MemberUserNotFoundError } from './member-user-not-found-error';
import { NotAuthorizedError } from './not-authorized-error';
import { toProjectResult } from './project-result';
import type { ProjectResult } from './project-result';
import type { UserDirectory } from './user-directory';

export interface AddMemberCommand {
  readonly projectId: string;
  readonly actingUserId: string;
  readonly email: string;
  readonly role: string;
}

interface Deps {
  readonly projects: ProjectRepository;
  readonly userDirectory: UserDirectory;
}

/** Owner がメールアドレス指定でメンバーを追加する。 */
export class AddMemberUseCase {
  readonly #projects: ProjectRepository;
  readonly #userDirectory: UserDirectory;

  constructor(deps: Deps) {
    this.#projects = deps.projects;
    this.#userDirectory = deps.userDirectory;
  }

  async execute(command: AddMemberCommand): Promise<ProjectResult> {
    const project = await this.#projects.findById(
      new ProjectId(command.projectId),
    );
    if (project === null) {
      throw new ProjectNotFoundError();
    }
    if (!project.isOwner(new MemberUserId(command.actingUserId))) {
      throw new NotAuthorizedError();
    }

    // email の正規化は UserDirectory を単一の責務点とする（重複防止）。
    const userId = await this.#userDirectory.findUserIdByEmail(command.email);
    if (userId === null) {
      throw new MemberUserNotFoundError();
    }

    project.addMember({
      userId: new MemberUserId(userId),
      role: new ProjectRole(command.role),
    });
    await this.#projects.save(project);
    return toProjectResult(project);
  }
}
