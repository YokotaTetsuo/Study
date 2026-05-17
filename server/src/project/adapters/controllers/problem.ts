import type { ProblemDetail } from '@pdf-review/shared';

import { DomainError } from '../../../shared-kernel/domain-error';
import { MemberUserNotFoundError } from '../../application/member-user-not-found-error';
import { NotAuthorizedError } from '../../application/not-authorized-error';
import { InvalidProjectStateError } from '../../domain/invalid-project-state-error';
import { LastOwnerError } from '../../domain/last-owner-error';
import { MemberAlreadyExistsError } from '../../domain/member-already-exists-error';
import { MemberNotFoundError } from '../../domain/member-not-found-error';
import { ProjectNotFoundError } from '../../domain/project-not-found-error';

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

/** プロジェクトのドメイン/アプリ例外を RFC7807 へマッピングする。 */
export function toProblem(error: unknown): MappedProblem {
  if (error instanceof NotAuthorizedError) {
    return make(403, 'Forbidden', error.message);
  }
  if (
    error instanceof ProjectNotFoundError ||
    error instanceof MemberNotFoundError ||
    error instanceof MemberUserNotFoundError
  ) {
    return make(404, 'Not Found', error.message);
  }
  if (
    error instanceof MemberAlreadyExistsError ||
    error instanceof LastOwnerError ||
    error instanceof InvalidProjectStateError
  ) {
    return make(409, 'Conflict', error.message);
  }
  if (error instanceof DomainError) {
    return make(400, 'Bad Request', error.message);
  }
  return make(500, 'Internal Server Error', 'unexpected error');
}
