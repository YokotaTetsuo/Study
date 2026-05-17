import { ValidationError } from '../../shared-kernel/validation-error';

const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

/** 文書が属するプロジェクト ID（ULID）。project ドメインと独立に保持。 */
export class DocumentProjectId {
  readonly #value: string;

  constructor(value: string) {
    if (!ULID_PATTERN.test(value)) {
      throw new ValidationError('projectId が ULID 形式ではありません');
    }
    this.#value = value;
  }

  get value(): string {
    return this.#value;
  }

  equals(other: DocumentProjectId): boolean {
    return this.#value === other.value;
  }
}
