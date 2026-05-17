import { ValidationError } from '../../shared-kernel/validation-error';

const MAX_LENGTH = 120;

/** プロジェクト名値オブジェクト（1〜120 文字）。 */
export class ProjectName {
  readonly #value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_LENGTH) {
      throw new ValidationError('projectName の長さが不正です');
    }
    this.#value = trimmed;
  }

  get value(): string {
    return this.#value;
  }
}
