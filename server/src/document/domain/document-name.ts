import { ValidationError } from '../../shared-kernel/validation-error';

const MAX_LENGTH = 200;

/** 文書名値オブジェクト（1〜200 文字）。 */
export class DocumentName {
  readonly #value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_LENGTH) {
      throw new ValidationError('documentName の長さが不正です');
    }
    this.#value = trimmed;
  }

  get value(): string {
    return this.#value;
  }
}
