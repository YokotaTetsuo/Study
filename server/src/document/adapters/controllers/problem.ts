import type { ProblemDetail } from '@pdf-review/shared';

import { DomainError } from '../../../shared-kernel/domain-error';
import { StoredFileMissingError } from '../../../shared-kernel/stored-file-missing-error';
import { NotAuthorizedError } from '../../application/not-authorized-error';
import { UnsupportedContentTypeError } from '../../application/unsupported-content-type-error';
import { DocumentNotFoundError } from '../../domain/document-not-found-error';
import { InvalidDocumentStateError } from '../../domain/invalid-document-state-error';
import { VersionNotFoundError } from '../../domain/version-not-found-error';

export type ProblemStatus = 400 | 401 | 403 | 404 | 409 | 415 | 500;

export interface MappedProblem {
  readonly status: ProblemStatus;
  readonly body: ProblemDetail;
}

function make(
  status: ProblemStatus,
  title: string,
  detail: string,
): MappedProblem {
  return { status, body: { type: 'about:blank', title, status, detail } };
}

/** document のドメイン/アプリ例外を RFC7807 へマッピングする。 */
export function toProblem(error: unknown): MappedProblem {
  if (error instanceof NotAuthorizedError) {
    return make(403, 'Forbidden', error.message);
  }
  if (
    error instanceof DocumentNotFoundError ||
    error instanceof VersionNotFoundError
  ) {
    return make(404, 'Not Found', error.message);
  }
  if (error instanceof UnsupportedContentTypeError) {
    return make(415, 'Unsupported Media Type', error.message);
  }
  if (error instanceof InvalidDocumentStateError) {
    return make(409, 'Conflict', error.message);
  }
  if (error instanceof StoredFileMissingError) {
    // 版メタデータは在るのに blob が無い = ストレージ不整合（運用調査対象）。
    return make(500, 'Internal Server Error', 'ファイルの取得に失敗しました');
  }
  if (error instanceof DomainError) {
    return make(400, 'Bad Request', error.message);
  }
  return make(500, 'Internal Server Error', 'unexpected error');
}
