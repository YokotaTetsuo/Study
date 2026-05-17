import { ValidationError } from '../../shared-kernel/validation-error';

// ULID（26 文字 Crockford base32）。128bit エンコードのため
// 先頭文字は 0-7 のみ（タイムスタンプ上限）。
const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

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
