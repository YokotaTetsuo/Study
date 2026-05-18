import type { ProblemDetail } from '@pdf-review/shared';

import { isDbConflict } from '../../../shared-kernel/db-conflict';
import { DomainError } from '../../../shared-kernel/domain-error';
import { makeProblem } from '../../../shared-kernel/problem';
import { StoredFileMissingError } from '../../../shared-kernel/stored-file-missing-error';
import { NotAuthorizedError } from '../../application/not-authorized-error';
import { UnsupportedContentTypeError } from '../../application/unsupported-content-type-error';
import { CommentForbiddenError } from '../../domain/comment-forbidden-error';
import { CommentNotFoundError } from '../../domain/comment-not-found-error';
import { DocumentNotFoundError } from '../../domain/document-not-found-error';
import { InvalidDocumentStateError } from '../../domain/invalid-document-state-error';
import { StaleDocumentError } from '../../domain/stale-document-error';
import { VersionNotFoundError } from '../../domain/version-not-found-error';

export type ProblemStatus = 400 | 401 | 403 | 404 | 409 | 415 | 500;

export interface MappedProblem {
  readonly status: ProblemStatus;
  readonly body: ProblemDetail;
}

/** document のドメイン/アプリ例外を RFC7807 へマッピングする。 */
export function toProblem(error: unknown): MappedProblem {
  if (
    error instanceof NotAuthorizedError ||
    error instanceof CommentForbiddenError
  ) {
    return makeProblem(403, 'Forbidden', error.message);
  }
  if (
    error instanceof DocumentNotFoundError ||
    error instanceof VersionNotFoundError ||
    error instanceof CommentNotFoundError
  ) {
    return makeProblem(404, 'Not Found', error.message);
  }
  if (error instanceof UnsupportedContentTypeError) {
    return makeProblem(415, 'Unsupported Media Type', error.message);
  }
  if (
    error instanceof InvalidDocumentStateError ||
    error instanceof StaleDocumentError
  ) {
    return makeProblem(409, 'Conflict', error.message);
  }
  if (error instanceof StoredFileMissingError) {
    // 版メタデータは在るのに blob が無い = ストレージ不整合（運用調査対象）。
    return makeProblem(
      500,
      'Internal Server Error',
      'ファイルの取得に失敗しました',
    );
  }
  if (error instanceof DomainError) {
    return makeProblem(400, 'Bad Request', error.message);
  }
  if (isDbConflict(error)) {
    // 直列化失敗/デッドロック/UNIQUE 違反は並行操作の競合。
    // 再試行可能な競合として 409 にする（500 にしない）。
    return makeProblem(
      409,
      'Conflict',
      '同時更新が競合しました。時間をおいて再試行してください',
    );
  }
  return makeProblem(500, 'Internal Server Error', 'unexpected error');
}
