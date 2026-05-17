import { Email } from '../domain/email';
import type { UserRepository } from '../domain/user-repository';

import { InvalidCredentialsError } from './invalid-credentials-error';
import type { PasswordHasher } from './password-hasher';
import type { SessionStore } from './session-store';
import { toUserResult } from './user-result';
import type { UserResult } from './user-result';

export interface LoginCommand {
  readonly email: string;
  readonly password: string;
}

export interface LoginResult {
  readonly user: UserResult;
  readonly sessionId: string;
}

interface Deps {
  readonly users: UserRepository;
  readonly hasher: PasswordHasher;
  readonly sessions: SessionStore;
}

/** メール/パスワードでログインしセッションを発行する。 */
export class LoginUseCase {
  readonly #users: UserRepository;
  readonly #hasher: PasswordHasher;
  readonly #sessions: SessionStore;

  constructor(deps: Deps) {
    this.#users = deps.users;
    this.#hasher = deps.hasher;
    this.#sessions = deps.sessions;
  }

  async execute(command: LoginCommand): Promise<LoginResult> {
    const user = await this.#users.findByEmail(new Email(command.email));
    if (user === null) {
      throw new InvalidCredentialsError();
    }

    const ok = await this.#hasher.verify(command.password, user.passwordHash);
    if (!ok) {
      throw new InvalidCredentialsError();
    }

    const sessionId = await this.#sessions.create(user.id);
    return { user: toUserResult(user), sessionId };
  }
}
