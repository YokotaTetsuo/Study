import type { Dayjs } from 'dayjs';

import type { DisplayName } from './display-name';
import type { Email } from './email';
import type { PasswordHash } from './password-hash';
import type { UserId } from './user-id';

interface UserParams {
  readonly id: UserId;
  readonly email: Email;
  readonly passwordHash: PasswordHash;
  readonly displayName: DisplayName;
  readonly createdAt: Dayjs;
}

/**
 * 認証ユーザー集約ルート。内部エンティティを持たない単純集約。
 * 不変条件は各値オブジェクトの構築時検証で担保する。
 */
export class User {
  readonly #id: UserId;
  readonly #email: Email;
  #passwordHash: PasswordHash;
  #displayName: DisplayName;
  readonly #createdAt: Dayjs;

  private constructor(params: UserParams) {
    this.#id = params.id;
    this.#email = params.email;
    this.#passwordHash = params.passwordHash;
    this.#displayName = params.displayName;
    this.#createdAt = params.createdAt;
  }

  /** 新規登録時の生成。 */
  static create(params: UserParams): User {
    return new User(params);
  }

  /** 永続化からの復元。 */
  static reconstruct(params: UserParams): User {
    return new User(params);
  }

  /** 表示名の変更（ドメイン操作）。 */
  rename(displayName: DisplayName): void {
    this.#displayName = displayName;
  }

  /** パスワード（ハッシュ）の変更。 */
  changePassword(passwordHash: PasswordHash): void {
    this.#passwordHash = passwordHash;
  }

  get id(): UserId {
    return this.#id;
  }

  get email(): Email {
    return this.#email;
  }

  get passwordHash(): PasswordHash {
    return this.#passwordHash;
  }

  get displayName(): DisplayName {
    return this.#displayName;
  }

  get createdAt(): Dayjs {
    return this.#createdAt;
  }
}
