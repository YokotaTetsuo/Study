import { ValidationError } from '../../shared-kernel/validation-error';

const MAX_LENGTH = 64;

/**
 * 表示名値オブジェクト。1〜64 文字。
 */
export class DisplayName {
  readonly #value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_LENGTH) {
      throw new ValidationError('displayName の長さが不正です');
    }
    this.#value = trimmed;
  }

  get value(): string {
    return this.#value;
  }
}
