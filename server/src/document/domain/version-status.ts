import { ValidationError } from '../../shared-kernel/validation-error';

export const VERSION_STATUSES = ['draft'] as const;
export type VersionStatusValue = (typeof VERSION_STATUSES)[number];

function isVersionStatusValue(value: string): value is VersionStatusValue {
  return VERSION_STATUSES.some((s) => s === value);
}

/** 版の状態値オブジェクト（Phase 4 で拡張予定）。 */
export class VersionStatus {
  readonly #value: VersionStatusValue;

  private constructor(value: VersionStatusValue) {
    this.#value = value;
  }

  static draft(): VersionStatus {
    return new VersionStatus('draft');
  }

  static fromString(value: string): VersionStatus {
    if (!isVersionStatusValue(value)) {
      throw new ValidationError(`不正な版状態です: ${value}`);
    }
    return new VersionStatus(value);
  }

  get value(): VersionStatusValue {
    return this.#value;
  }
}
