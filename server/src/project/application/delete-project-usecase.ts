import { MemberUserId } from '../domain/member-user-id';
import { ProjectId } from '../domain/project-id';
import { ProjectNotFoundError } from '../domain/project-not-found-error';
import type { ProjectRepository } from '../domain/project-repository';

import { NotAuthorizedError } from './not-authorized-error';

export interface DeleteProjectCommand {
  readonly projectId: string;
  readonly actingUserId: string;
}

/**
 * Owner がプロジェクトを削除する。projects 行の削除に伴い、DB の
 * FK cascade で以下まで連鎖削除される（0009 マイグレーションで
 * documents.project_id に on delete cascade を付与済み）:
 *   project_members
 *   documents → document_versions → document_comments
 *   documents → review_requests → review_approvals
 *
 * 既知の制約: FileStorage に削除 API が無いため、版 PDF の
 * オブジェクトストレージ実体は孤児化する。回収はバケットの
 * ライフサイクル等に委ねる（別 issue とし本 PR の範囲外）。
 */
export class DeleteProjectUseCase {
  readonly #projects: ProjectRepository;

  constructor(deps: { projects: ProjectRepository }) {
    this.#projects = deps.projects;
  }

  async execute(command: DeleteProjectCommand): Promise<void> {
    const project = await this.#projects.findById(
      new ProjectId(command.projectId),
    );
    if (project === null) {
      throw new ProjectNotFoundError();
    }
    if (!project.isOwner(new MemberUserId(command.actingUserId))) {
      throw new NotAuthorizedError();
    }
    await this.#projects.delete(project.id);
  }
}
