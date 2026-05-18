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
  /** 全 mutation の sticky な成功/失敗状態をクリアする。 */
  readonly reset: () => void;
}

/**
 * 版ワークフロー操作（提出/承認/差戻し/却下/正式版化）の mutation 群。
 * onSettled で（成功・失敗どちらでも）['documents'] を再取得し、その
 * 完了まで pending を維持する。これにより 409（競合/不正遷移）後も
 * 画面が最新化され、再取得前の二重クリックを防ぐ。
 */
export function useVersionWorkflow(documentId: string): VersionWorkflow {
  const qc = useQueryClient();
  // onSettled の戻り値（Promise）を React Query が待つため、再取得が
  // 完了するまで isPending が true のままになる。
  const settle = (): Promise<void> =>
    qc.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
  const submit = useMutation({
    mutationFn: (versionNumber: number) =>
      submitVersion(documentId, versionNumber),
    onSettled: settle,
  });
  const approve = useMutation({
    mutationFn: (versionNumber: number) =>
      approveVersion(documentId, versionNumber),
    onSettled: settle,
  });
  const requestChanges = useMutation({
    mutationFn: (versionNumber: number) =>
      requestChangesVersion(documentId, versionNumber),
    onSettled: settle,
  });
  const reject = useMutation({
    mutationFn: (versionNumber: number) =>
      rejectVersion(documentId, versionNumber),
    onSettled: settle,
  });
  const publish = useMutation({
    mutationFn: (versionNumber: number) =>
      publishVersion(documentId, versionNumber),
    onSettled: settle,
  });
  return {
    submit,
    approve,
    requestChanges,
    reject,
    publish,
    reset: (): void => {
      submit.reset();
      approve.reset();
      requestChanges.reset();
      reject.reset();
      publish.reset();
    },
  };
}
