import { ValidationError } from '../../shared-kernel/validation-error';

const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

/** 版をアップロードしたユーザーの ID（ULID）。 */
export class UploaderId {
  readonly #value: string;

  constructor(value: string) {
    if (!ULID_PATTERN.test(value)) {
      throw new ValidationError('uploaderId が ULID 形式ではありません');
    }
    this.#value = value;
  }

  get value(): string {
    return this.#value;
  }
}
