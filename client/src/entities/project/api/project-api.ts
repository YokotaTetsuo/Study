import {
  projectListResponseSchema,
  projectResponseSchema,
} from '@pdf-review/shared';
import type {
  AddMemberRequest,
  CreateProjectRequest,
  ProjectResponse,
  SetMemberRoleRequest,
  UpdateApprovalPolicyRequest,
} from '@pdf-review/shared';

import { ApiError } from '../../../shared/api/api-error';
import { apiBase } from '../../../shared/api/client';

async function request(
  path: string,
  init: RequestInit,
  okStatus: number,
): Promise<unknown> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: 'include',
  });
  if (res.status !== okStatus) {
    throw new ApiError(res.status);
  }
  return res.json();
}

function jsonInit(method: string, body: unknown): RequestInit {
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  return { method, headers, body: JSON.stringify(body) };
}

export async function listProjects(): Promise<ProjectResponse[]> {
  return projectListResponseSchema.parse(
    await request('/projects', { method: 'GET' }, 200),
  );
}

export async function getProject(id: string): Promise<ProjectResponse> {
  return projectResponseSchema.parse(
    await request(`/projects/${id}`, { method: 'GET' }, 200),
  );
}

export async function createProject(
  input: CreateProjectRequest,
): Promise<ProjectResponse> {
  return projectResponseSchema.parse(
    await request('/projects', jsonInit('POST', input), 201),
  );
}

export async function addMember(
  projectId: string,
  input: AddMemberRequest,
): Promise<ProjectResponse> {
  return projectResponseSchema.parse(
    await request(
      `/projects/${projectId}/members`,
      jsonInit('POST', input),
      200,
    ),
  );
}

export async function setMemberRole(
  projectId: string,
  userId: string,
  input: SetMemberRoleRequest,
): Promise<ProjectResponse> {
  return projectResponseSchema.parse(
    await request(
      `/projects/${projectId}/members/${userId}`,
      jsonInit('PUT', input),
      200,
    ),
  );
}

export async function updateApprovalPolicy(
  projectId: string,
  input: UpdateApprovalPolicyRequest,
): Promise<ProjectResponse> {
  return projectResponseSchema.parse(
    await request(
      `/projects/${projectId}/approval-policy`,
      jsonInit('PUT', input),
      200,
    ),
  );
}
