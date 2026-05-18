import type { DocumentResponse } from '@pdf-review/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import {
  approveVersion,
  DOCUMENTS_QUERY_KEY,
  publishVersion,
  rejectVersion,
  requestChangesVersion,
  submitVersion,
} from '../../../entities/document';

type WorkflowMutation = UseMutationResult<DocumentResponse, Error, number>;

export interface VersionWorkflow {
  readonly submit: WorkflowMutation;
  readonly approve: WorkflowMutation;
  readonly requestChanges: WorkflowMutation;
  readonly reject: WorkflowMutation;
  readonly publish: WorkflowMutation;
}

/**
 * 版ワークフロー操作（提出/承認/差戻し/却下/正式版化）の mutation 群。
 * 成功時は ['documents'] 前置一致で一覧・詳細クエリを再取得する。
 */
export function useVersionWorkflow(documentId: string): VersionWorkflow {
  const qc = useQueryClient();
  const invalidate = (): void => {
    void qc.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
  };
  return {
    submit: useMutation({
      mutationFn: (versionNumber: number) =>
        submitVersion(documentId, versionNumber),
      onSuccess: invalidate,
    }),
    approve: useMutation({
      mutationFn: (versionNumber: number) =>
        approveVersion(documentId, versionNumber),
      onSuccess: invalidate,
    }),
    requestChanges: useMutation({
      mutationFn: (versionNumber: number) =>
        requestChangesVersion(documentId, versionNumber),
      onSuccess: invalidate,
    }),
    reject: useMutation({
      mutationFn: (versionNumber: number) =>
        rejectVersion(documentId, versionNumber),
      onSuccess: invalidate,
    }),
    publish: useMutation({
      mutationFn: (versionNumber: number) =>
        publishVersion(documentId, versionNumber),
      onSuccess: invalidate,
    }),
  };
}
