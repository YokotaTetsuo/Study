import type { ProblemDetail } from '@pdf-review/shared';

import { isDbConflict } from '../../../shared-kernel/db-conflict';
import { DomainError } from '../../../shared-kernel/domain-error';
import { makeProblem } from '../../../shared-kernel/problem';
import { MemberUserNotFoundError } from '../../application/member-user-not-found-error';
import { NotAuthorizedError } from '../../application/not-authorized-error';
import { InvalidProjectStateError } from '../../domain/invalid-project-state-error';
import { LastOwnerError } from '../../domain/last-owner-error';
import { MemberAlreadyExistsError } from '../../domain/member-already-exists-error';
import { MemberNotFoundError } from '../../domain/member-not-found-error';
import { ProjectNotFoundError } from '../../domain/project-not-found-error';

import {
  MemberProfileMissingError,
  ResponseSerializationError,
} from './serialization-errors';

export type ProblemStatus = 400 | 401 | 403 | 404 | 409 | 500;

export interface MappedProblem {
  readonly status: ProblemStatus;
  readonly body: ProblemDetail;
}

/** プロジェクトのドメイン/アプリ例外を RFC7807 へマッピングする。 */
export function toProblem(error: unknown): MappedProblem {
  if (error instanceof NotAuthorizedError) {
    return makeProblem(403, 'Forbidden', error.message);
  }
  if (
    error instanceof ProjectNotFoundError ||
    error instanceof MemberNotFoundError ||
    error instanceof MemberUserNotFoundError
  ) {
    return makeProblem(404, 'Not Found', error.message);
  }
  if (
    error instanceof MemberAlreadyExistsError ||
    error instanceof LastOwnerError ||
    error instanceof InvalidProjectStateError
  ) {
    return makeProblem(409, 'Conflict', error.message);
  }
  if (error instanceof DomainError) {
    return makeProblem(400, 'Bad Request', error.message);
  }
  if (
    error instanceof MemberProfileMissingError ||
    error instanceof ResponseSerializationError
  ) {
    // データ整合性の不変条件破れ。診断しやすいよう明示的に 500 化する。
    return makeProblem(
      500,
      'Internal Server Error',
      'メンバーのユーザー情報を解決できませんでした',
    );
  }
  if (isDbConflict(error)) {
    // 同時メンバー追加による project_members の UNIQUE 競合等。
    // 再試行可能な競合として 409 にする。
    return makeProblem(
      409,
      'Conflict',
      '同時更新が競合しました。時間をおいて再試行してください',
    );
  }
  return makeProblem(500, 'Internal Server Error', 'unexpected error');
}
