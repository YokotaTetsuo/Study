import { ULID_PATTERN } from '../../shared-kernel/ulid';
import { ValidationError } from '../../shared-kernel/validation-error';

/** 版コメントの ID（ULID）。 */
export class CommentId {
  readonly #value: string;

  constructor(value: string) {
    if (!ULID_PATTERN.test(value)) {
      throw new ValidationError('commentId が ULID 形式ではありません');
    }
    this.#value = value;
  }

  get value(): string {
    return this.#value;
  }

  equals(other: CommentId): boolean {
    return this.#value === other.#value;
  }
}
