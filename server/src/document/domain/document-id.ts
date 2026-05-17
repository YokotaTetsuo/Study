import { ValidationError } from '../../shared-kernel/validation-error';

const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

/** 文書 ID 値オブジェクト（ULID）。 */
export class DocumentId {
  readonly #value: string;

  constructor(value: string) {
    if (!ULID_PATTERN.test(value)) {
      throw new ValidationError('documentId が ULID 形式ではありません');
    }
    this.#value = value;
  }

  get value(): string {
    return this.#value;
  }

  equals(other: DocumentId): boolean {
    return this.#value === other.value;
  }
}
