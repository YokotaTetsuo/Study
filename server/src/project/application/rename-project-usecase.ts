import { MemberUserId } from '../domain/member-user-id';
import { ProjectId } from '../domain/project-id';
import { ProjectName } from '../domain/project-name';
import { ProjectNotFoundError } from '../domain/project-not-found-error';
import type { ProjectRepository } from '../domain/project-repository';

import { NotAuthorizedError } from './not-authorized-error';
import { toProjectResult } from './project-result';
import type { ProjectResult } from './project-result';

export interface RenameProjectCommand {
  readonly projectId: string;
  readonly actingUserId: string;
  readonly name: string;
}

/** Owner がプロジェクト名を変更する。 */
export class RenameProjectUseCase {
  readonly #projects: ProjectRepository;

  constructor(deps: { projects: ProjectRepository }) {
    this.#projects = deps.projects;
  }

  async execute(command: RenameProjectCommand): Promise<ProjectResult> {
    const project = await this.#projects.findById(
      new ProjectId(command.projectId),
    );
    if (project === null) {
      throw new ProjectNotFoundError();
    }
    if (!project.isOwner(new MemberUserId(command.actingUserId))) {
      throw new NotAuthorizedError();
    }
    const newName = new ProjectName(command.name);
    project.rename(newName);
    await this.#projects.rename(project.id, newName);
    return toProjectResult(project);
  }
}
