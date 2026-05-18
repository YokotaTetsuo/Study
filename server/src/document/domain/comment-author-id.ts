import { ULID_PATTERN } from '../../shared-kernel/ulid';
import { ValidationError } from '../../shared-kernel/validation-error';

/** コメントを書いたユーザーの ID（ULID）。 */
export class CommentAuthorId {
  readonly #value: string;

  constructor(value: string) {
    if (!ULID_PATTERN.test(value)) {
      throw new ValidationError('commentAuthorId が ULID 形式ではありません');
    }
    this.#value = value;
  }

  get value(): string {
    return this.#value;
  }

  equals(other: CommentAuthorId): boolean {
    return this.#value === other.#value;
  }
}
