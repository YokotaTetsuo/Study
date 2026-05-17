import { ValidationError } from '../../shared-kernel/validation-error';

/** ファイルストレージ上のオブジェクトキー。 */
export class StorageKey {
  readonly #value: string;

  constructor(value: string) {
    if (value.trim().length === 0) {
      throw new ValidationError('storageKey が空です');
    }
    this.#value = value;
  }

  get value(): string {
    return this.#value;
  }
}
