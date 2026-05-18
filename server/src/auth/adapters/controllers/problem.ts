import type { ProblemDetail } from '@pdf-review/shared';

import { isDbConflict } from '../../../shared-kernel/db-conflict';
import { DomainError } from '../../../shared-kernel/domain-error';
import { makeProblem } from '../../../shared-kernel/problem';
import { EmailAlreadyInUseError } from '../../application/email-already-in-use-error';
import { InvalidCredentialsError } from '../../application/invalid-credentials-error';
import { UnauthenticatedError } from '../../application/unauthenticated-error';
import { UserNotFoundError } from '../../domain/user-not-found-error';

export type ProblemStatus = 400 | 401 | 404 | 409 | 500;

export interface MappedProblem {
  readonly status: ProblemStatus;
  readonly body: ProblemDetail;
}

/** ドメイン/アプリ例外を RFC7807 へマッピングする。 */
export function toProblem(error: unknown): MappedProblem {
  if (error instanceof EmailAlreadyInUseError) {
    return makeProblem(409, 'Conflict', error.message);
  }
  if (
    error instanceof InvalidCredentialsError ||
    error instanceof UnauthenticatedError
  ) {
    return makeProblem(401, 'Unauthorized', error.message);
  }
  if (error instanceof UserNotFoundError) {
    return makeProblem(404, 'Not Found', error.message);
  }
  if (error instanceof DomainError) {
    // ValidationError 等
    return makeProblem(400, 'Bad Request', error.message);
  }
  if (isDbConflict(error)) {
    // 同時登録による email UNIQUE 競合等。再試行可能な競合として 409。
    return makeProblem(
      409,
      'Conflict',
      '同時更新が競合しました。時間をおいて再試行してください',
    );
  }
  return makeProblem(500, 'Internal Server Error', 'unexpected error');
}
