import { ValidationError } from '../../shared-kernel/validation-error';

/**
 * ハッシュ済みパスワード値オブジェクト。平文は保持しない。
 * ハッシュ化は PasswordHasher ポート（application）が担う。
 */
export class PasswordHash {
  readonly #value: string;

  constructor(value: string) {
    if (value.length === 0) {
      throw new ValidationError('passwordHash が空です');
    }
    this.#value = value;
  }

  get value(): string {
    return this.#value;
  }
}
