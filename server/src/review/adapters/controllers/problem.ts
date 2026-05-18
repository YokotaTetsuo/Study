import type { ProblemDetail } from '@pdf-review/shared';

import { DocumentNotFoundError } from '../../../document/domain/document-not-found-error';
import { InvalidDocumentStateError } from '../../../document/domain/invalid-document-state-error';
import { InvalidVersionTransitionError } from '../../../document/domain/invalid-version-transition-error';
import { StaleDocumentError } from '../../../document/domain/stale-document-error';
import { isDbConflict } from '../../../shared-kernel/db-conflict';
import { DomainError } from '../../../shared-kernel/domain-error';
import { NotAuthorizedError } from '../../application/not-authorized-error';
import { DuplicateApprovalError } from '../../domain/duplicate-approval-error';
import { InvalidReviewRequestStateError } from '../../domain/invalid-review-request-state-error';
import { ReviewRequestNotFoundError } from '../../domain/review-request-not-found-error';
import { UnauthorizedApproverError } from '../../domain/unauthorized-approver-error';

export type ProblemStatus = 400 | 401 | 403 | 404 | 409 | 500;

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

/** review のドメイン/アプリ例外を RFC7807 へマッピングする。 */
export function toProblem(error: unknown): MappedProblem {
  if (
    error instanceof NotAuthorizedError ||
    error instanceof UnauthorizedApproverError
  ) {
    return make(403, 'Forbidden', error.message);
  }
  if (
    error instanceof DocumentNotFoundError ||
    error instanceof ReviewRequestNotFoundError
  ) {
    return make(404, 'Not Found', error.message);
  }
  if (
    error instanceof InvalidDocumentStateError ||
    error instanceof InvalidVersionTransitionError ||
    error instanceof InvalidReviewRequestStateError ||
    error instanceof DuplicateApprovalError ||
    error instanceof StaleDocumentError
  ) {
    return make(409, 'Conflict', error.message);
  }
  if (error instanceof DomainError) {
    return make(400, 'Bad Request', error.message);
  }
  if (isDbConflict(error)) {
    // 直列化失敗/デッドロック、または UNIQUE 違反（例: 同一版への
    // 同時 submit による review_requests の重複）は並行操作の競合。
    // 再試行可能な競合として 409 にする（500 にしない）。
    return make(
      409,
      'Conflict',
      '同時更新が競合しました。時間をおいて再試行してください',
    );
  }
  return make(500, 'Internal Server Error', 'unexpected error');
}
