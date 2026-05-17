import type { ProblemDetail } from '@pdf-review/shared';

import { DomainError } from '../../../shared-kernel/domain-error';
import { EmailAlreadyInUseError } from '../../application/email-already-in-use-error';
import { InvalidCredentialsError } from '../../application/invalid-credentials-error';
import { UnauthenticatedError } from '../../application/unauthenticated-error';
import { UserNotFoundError } from '../../domain/user-not-found-error';

export type ProblemStatus = 400 | 401 | 404 | 409 | 500;

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

/** ドメイン/アプリ例外を RFC7807 へマッピングする。 */
export function toProblem(error: unknown): MappedProblem {
  if (error instanceof EmailAlreadyInUseError) {
    return make(409, 'Conflict', error.message);
  }
  if (
    error instanceof InvalidCredentialsError ||
    error instanceof UnauthenticatedError
  ) {
    return make(401, 'Unauthorized', error.message);
  }
  if (error instanceof UserNotFoundError) {
    return make(404, 'Not Found', error.message);
  }
  if (error instanceof DomainError) {
    // ValidationError 等
    return make(400, 'Bad Request', error.message);
  }
  return make(500, 'Internal Server Error', 'unexpected error');
}
