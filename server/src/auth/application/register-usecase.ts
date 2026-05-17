import type { Clock } from '../../shared-kernel/clock';
import type { IdGenerator } from '../../shared-kernel/id-generator';
import { DisplayName } from '../domain/display-name';
import { Email } from '../domain/email';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import type { UserRepository } from '../domain/user-repository';

import { EmailAlreadyInUseError } from './email-already-in-use-error';
import type { PasswordHasher } from './password-hasher';
import { toUserResult } from './user-result';
import type { UserResult } from './user-result';

export interface RegisterCommand {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
}

interface Deps {
  readonly users: UserRepository;
  readonly hasher: PasswordHasher;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
}

/** ユーザー新規登録。 */
export class RegisterUseCase {
  readonly #users: UserRepository;
  readonly #hasher: PasswordHasher;
  readonly #idGenerator: IdGenerator;
  readonly #clock: Clock;

  constructor(deps: Deps) {
    this.#users = deps.users;
    this.#hasher = deps.hasher;
    this.#idGenerator = deps.idGenerator;
    this.#clock = deps.clock;
  }

  async execute(command: RegisterCommand): Promise<UserResult> {
    const email = new Email(command.email);
    const displayName = new DisplayName(command.displayName);

    if (await this.#users.existsByEmail(email)) {
      throw new EmailAlreadyInUseError();
    }

    const passwordHash = await this.#hasher.hash(command.password);
    const user = User.create({
      id: new UserId(this.#idGenerator.generate()),
      email,
      passwordHash,
      displayName,
      createdAt: this.#clock.now(),
    });
    await this.#users.save(user);

    return toUserResult(user);
  }
}
