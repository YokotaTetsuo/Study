import type { MemberUserId } from './member-user-id';
import type { Project } from './project';
import type { ProjectId } from './project-id';
import type { ProjectName } from './project-name';

/**
 * Project 集約の永続化ポート。実装は adapters/gateways。
 */
export interface ProjectRepository {
  findById(id: ProjectId): Promise<Project | null>;
  /** 指定ユーザーがメンバーであるプロジェクトを返す。 */
  listByMember(userId: MemberUserId): Promise<readonly Project[]>;
  save(project: Project): Promise<void>;
  /**
   * 指定プロジェクトの名称のみを変更する。メンバーや承認ポリシーなど
   * 他の集約状態には影響しない、粒度の細かい更新操作。
   */
  rename(id: ProjectId, name: ProjectName): Promise<void>;
  /**
   * プロジェクトを削除する。関連データの連鎖削除は実装に委ねる
   * （Drizzle 実装の FK cascade の詳細は当該実装/マイグレーション側
   * のコメントを参照）。
   */
  delete(id: ProjectId): Promise<void>;
}
