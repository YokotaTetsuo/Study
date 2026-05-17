import type { Dayjs } from 'dayjs';

import type { Project } from '../domain/project';

export interface ProjectMemberResult {
  readonly userId: string;
  readonly role: string;
}

export interface ProjectResult {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Dayjs;
  readonly approvalPolicy: {
    readonly requiredApprovals: number;
    readonly approverRoles: readonly string[];
  };
  readonly members: readonly ProjectMemberResult[];
}

export function toProjectResult(project: Project): ProjectResult {
  return {
    id: project.id.value,
    name: project.name.value,
    createdAt: project.createdAt,
    approvalPolicy: {
      requiredApprovals: project.approvalPolicy.requiredApprovals,
      approverRoles: project.approvalPolicy.approverRoles.map((r) => r.value),
    },
    members: project.members.map((m) => ({
      userId: m.userId.value,
      role: m.role.value,
    })),
  };
}
