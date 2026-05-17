import { ValidationError } from '../../shared-kernel/validation-error';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LENGTH = 254;

/**
 * メールアドレス値オブジェクト。構築時に形式と長さを検証する。
 */
export class Email {
  readonly #value: string;

  constructor(value: string) {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0 || normalized.length > MAX_LENGTH) {
      throw new ValidationError('email の長さが不正です');
    }
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new ValidationError('email の形式が不正です');
    }
    this.#value = normalized;
  }

  get value(): string {
    return this.#value;
  }

  equals(other: Email): boolean {
    return this.#value === other.value;
  }
}
