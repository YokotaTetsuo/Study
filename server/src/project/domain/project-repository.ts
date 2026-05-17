import type { Project } from './project';
import type { ProjectId } from './project-id';

/**
 * Project 集約の永続化ポート。実装は adapters/gateways。
 */
export interface ProjectRepository {
  findById(id: ProjectId): Promise<Project | null>;
  save(project: Project): Promise<void>;
}
