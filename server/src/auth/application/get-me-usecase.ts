import { UserNotFoundError } from '../domain/user-not-found-error';
import type { UserRepository } from '../domain/user-repository';

import type { SessionStore } from './session-store';
import { UnauthenticatedError } from './unauthenticated-error';
import { toUserResult } from './user-result';
import type { UserResult } from './user-result';

export interface GetMeQuery {
  readonly sessionId: string;
}

interface Deps {
  readonly users: UserRepository;
  readonly sessions: SessionStore;
}

/** セッションから現在のユーザーを取得する。 */
export class GetMeUseCase {
  readonly #users: UserRepository;
  readonly #sessions: SessionStore;

  constructor(deps: Deps) {
    this.#users = deps.users;
    this.#sessions = deps.sessions;
  }

  async execute(query: GetMeQuery): Promise<UserResult> {
    const userId = await this.#sessions.findUserId(query.sessionId);
    if (userId === null) {
      throw new UnauthenticatedError();
    }

    const user = await this.#users.findById(userId);
    if (user === null) {
      throw new UserNotFoundError();
    }

    return toUserResult(user);
  }
}
