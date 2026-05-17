import dayjs from 'dayjs';
import { eq, inArray } from 'drizzle-orm';

import { ApprovalPolicy } from '../../domain/approval-policy';
import type { MemberUserId } from '../../domain/member-user-id';
import { Project } from '../../domain/project';
import { ProjectId } from '../../domain/project-id';
import { ProjectName } from '../../domain/project-name';
import type { ProjectRepository } from '../../domain/project-repository';
import { ProjectRole } from '../../domain/project-role';

import type { Database } from './database';
import { projectMembers, projects } from './schema';

export class DrizzleProjectRepository implements ProjectRepository {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  async findById(id: ProjectId): Promise<Project | null> {
    // 集約を一貫スナップショットから再構築するため単一トランザクションで読む。
    const snapshot = await this.#db.transaction(async (tx) => {
      const projectRows = await tx
        .select()
        .from(projects)
        .where(eq(projects.id, id.value))
        .limit(1);
      const projectRow = projectRows[0];
      if (projectRow === undefined) {
        return null;
      }
      const memberRows = await tx
        .select()
        .from(projectMembers)
        .where(eq(projectMembers.projectId, id.value));
      return { projectRow, memberRows };
    });
    if (snapshot === null) {
      return null;
    }
    const { projectRow: row, memberRows } = snapshot;

    return Project.reconstruct({
      id: new ProjectId(row.id),
      name: new ProjectName(row.name),
      createdAt: dayjs(row.createdAt),
      membersData: memberRows.map((m) => ({
        userId: m.userId,
        role: m.role,
      })),
      approvalPolicy: new ApprovalPolicy({
        requiredApprovals: row.requiredApprovals,
        approverRoles: row.approverRoles.map((r) => new ProjectRole(r)),
      }),
    });
  }

  async listByMember(userId: MemberUserId): Promise<readonly Project[]> {
    return this.#db.transaction(async (tx) => {
      const idRows = await tx
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, userId.value));
      const ids = idRows.map((r) => r.projectId);
      if (ids.length === 0) {
        return [];
      }
      const projectRows = await tx
        .select()
        .from(projects)
        .where(inArray(projects.id, ids));
      const memberRows = await tx
        .select()
        .from(projectMembers)
        .where(inArray(projectMembers.projectId, ids));
      const membersByProject = new Map<
        string,
        { userId: string; role: string }[]
      >();
      for (const m of memberRows) {
        const list = membersByProject.get(m.projectId) ?? [];
        list.push({ userId: m.userId, role: m.role });
        membersByProject.set(m.projectId, list);
      }
      return projectRows.map((row) =>
        Project.reconstruct({
          id: new ProjectId(row.id),
          name: new ProjectName(row.name),
          createdAt: dayjs(row.createdAt),
          membersData: membersByProject.get(row.id) ?? [],
          approvalPolicy: new ApprovalPolicy({
            requiredApprovals: row.requiredApprovals,
            approverRoles: row.approverRoles.map((r) => new ProjectRole(r)),
          }),
        }),
      );
    });
  }

  async save(project: Project): Promise<void> {
    const projectRow = {
      id: project.id.value,
      name: project.name.value,
      createdAt: project.createdAt.toDate(),
      requiredApprovals: project.approvalPolicy.requiredApprovals,
      approverRoles: project.approvalPolicy.approverRoles.map((r) => r.value),
    };
    const memberRows = project.members.map((m) => ({
      projectId: project.id.value,
      userId: m.userId.value,
      role: m.role.value,
    }));

    await this.#db.transaction(async (tx) => {
      await tx
        .insert(projects)
        .values(projectRow)
        .onConflictDoUpdate({
          target: projects.id,
          set: {
            name: projectRow.name,
            requiredApprovals: projectRow.requiredApprovals,
            approverRoles: projectRow.approverRoles,
          },
        });
      await tx
        .delete(projectMembers)
        .where(eq(projectMembers.projectId, project.id.value));
      if (memberRows.length > 0) {
        await tx.insert(projectMembers).values(memberRows);
      }
    });
  }
}
