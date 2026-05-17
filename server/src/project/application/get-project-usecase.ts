import { MemberUserId } from '../domain/member-user-id';
import { ProjectId } from '../domain/project-id';
import { ProjectNotFoundError } from '../domain/project-not-found-error';
import type { ProjectRepository } from '../domain/project-repository';

import { NotAuthorizedError } from './not-authorized-error';
import { toProjectResult } from './project-result';
import type { ProjectResult } from './project-result';

export interface GetProjectQuery {
  readonly projectId: string;
  readonly actingUserId: string;
}

/** メンバーが自分の参加プロジェクトを取得する。 */
export class GetProjectUseCase {
  readonly #projects: ProjectRepository;

  constructor(deps: { projects: ProjectRepository }) {
    this.#projects = deps.projects;
  }

  async execute(query: GetProjectQuery): Promise<ProjectResult> {
    const project = await this.#projects.findById(
      new ProjectId(query.projectId),
    );
    if (project === null) {
      throw new ProjectNotFoundError();
    }
    const acting = new MemberUserId(query.actingUserId);
    const isMember = project.members.some((m) => m.userId.equals(acting));
    if (!isMember) {
      throw new NotAuthorizedError();
    }
    return toProjectResult(project);
  }
}
