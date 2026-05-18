import { ValidationError } from '../../shared-kernel/validation-error';

const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

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
