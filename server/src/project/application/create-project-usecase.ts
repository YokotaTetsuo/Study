import type { Clock } from '../../shared-kernel/clock';
import type { IdGenerator } from '../../shared-kernel/id-generator';
import { MemberUserId } from '../domain/member-user-id';
import { Project } from '../domain/project';
import { ProjectId } from '../domain/project-id';
import { ProjectName } from '../domain/project-name';
import type { ProjectRepository } from '../domain/project-repository';

import { toProjectResult } from './project-result';
import type { ProjectResult } from './project-result';

export interface CreateProjectCommand {
  readonly name: string;
  readonly ownerUserId: string;
}

interface Deps {
  readonly projects: ProjectRepository;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
}

/** プロジェクトを新規作成し、作成者を Owner にする。 */
export class CreateProjectUseCase {
  readonly #projects: ProjectRepository;
  readonly #idGenerator: IdGenerator;
  readonly #clock: Clock;

  constructor(deps: Deps) {
    this.#projects = deps.projects;
    this.#idGenerator = deps.idGenerator;
    this.#clock = deps.clock;
  }

  async execute(command: CreateProjectCommand): Promise<ProjectResult> {
    const project = Project.create({
      id: new ProjectId(this.#idGenerator.generate()),
      name: new ProjectName(command.name),
      ownerUserId: new MemberUserId(command.ownerUserId),
      createdAt: this.#clock.now(),
    });
    await this.#projects.save(project);
    return toProjectResult(project);
  }
}
