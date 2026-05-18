import { ValidationError } from '../../shared-kernel/validation-error';

const MAX_LENGTH = 2000;

/** コメント本文の値オブジェクト（1〜2000 文字、前後空白は正規化）。 */
export class CommentContent {
  readonly #value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_LENGTH) {
      throw new ValidationError('commentContent の長さが不正です');
    }
    this.#value = trimmed;
  }

  get value(): string {
    return this.#value;
  }
}
