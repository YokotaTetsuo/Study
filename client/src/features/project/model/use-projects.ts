import type {
  AddMemberRequest,
  CreateProjectRequest,
  ProjectResponse,
  SetMemberRoleRequest,
  UpdateApprovalPolicyRequest,
} from '@pdf-review/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import {
  PROJECTS_QUERY_KEY,
  addMember,
  createProject,
  projectQueryOptions,
  projectsQueryOptions,
  setMemberRole,
  updateApprovalPolicy,
} from '../../../entities/project';

export function useProjects(): UseQueryResult<ProjectResponse[]> {
  return useQuery(projectsQueryOptions);
}

export function useProject(id: string): UseQueryResult<ProjectResponse> {
  return useQuery(projectQueryOptions(id));
}

export function useCreateProject(): UseMutationResult<
  ProjectResponse,
  Error,
  CreateProjectRequest
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

export function useAddMember(
  projectId: string,
): UseMutationResult<ProjectResponse, Error, AddMemberRequest> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddMemberRequest) => addMember(projectId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

export function useSetMemberRole(
  projectId: string,
): UseMutationResult<
  ProjectResponse,
  Error,
  { userId: string; body: SetMemberRoleRequest }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { userId: string; body: SetMemberRoleRequest }) =>
      setMemberRole(projectId, args.userId, args.body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

export function useUpdateApprovalPolicy(
  projectId: string,
): UseMutationResult<ProjectResponse, Error, UpdateApprovalPolicyRequest> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateApprovalPolicyRequest) =>
      updateApprovalPolicy(projectId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}
