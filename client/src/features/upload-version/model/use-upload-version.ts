import type { DocumentResponse } from '@pdf-review/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { DOCUMENTS_QUERY_KEY, uploadVersion } from '../../../entities/document';

export function useUploadVersion(
  documentId: string,
): UseMutationResult<DocumentResponse, Error, File> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadVersion(documentId, file),
    onSuccess: () => {
      // ['documents'] 前置一致で一覧・詳細の両クエリを再取得する。
      void qc.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
    },
  });
}
