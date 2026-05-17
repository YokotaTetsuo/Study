import { MemberUserId } from '../domain/member-user-id';
import type { ProjectRepository } from '../domain/project-repository';

import { toProjectResult } from './project-result';
import type { ProjectResult } from './project-result';

export interface ListProjectsQuery {
  readonly actingUserId: string;
}

/** 自分が参加しているプロジェクト一覧を返す。 */
export class ListProjectsUseCase {
  readonly #projects: ProjectRepository;

  constructor(deps: { projects: ProjectRepository }) {
    this.#projects = deps.projects;
  }

  async execute(query: ListProjectsQuery): Promise<readonly ProjectResult[]> {
    const list = await this.#projects.listByMember(
      new MemberUserId(query.actingUserId),
    );
    return list.map(toProjectResult);
  }
}
