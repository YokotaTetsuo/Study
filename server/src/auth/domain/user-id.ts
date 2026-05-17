import { ValidationError } from '../../shared-kernel/validation-error';

// Crockford base32 / ULID（26 文字）
const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/**
 * ユーザー ID 値オブジェクト。ULID 形式を強制する。
 */
export class UserId {
  readonly #value: string;

  constructor(value: string) {
    if (!ULID_PATTERN.test(value)) {
      throw new ValidationError('userId が ULID 形式ではありません');
    }
    this.#value = value;
  }

  get value(): string {
    return this.#value;
  }

  equals(other: UserId): boolean {
    return this.#value === other.value;
  }
}
