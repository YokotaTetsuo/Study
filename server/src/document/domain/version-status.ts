import { ValidationError } from '../../shared-kernel/validation-error';

import { InvalidVersionTransitionError } from './invalid-version-transition-error';

export const VERSION_STATUSES = [
  'draft',
  'under_review',
  'approved',
  'official',
  'changes_requested',
  'rejected',
] as const;
export type VersionStatusValue = (typeof VERSION_STATUSES)[number];

function isVersionStatusValue(value: string): value is VersionStatusValue {
  return VERSION_STATUSES.some((s) => s === value);
}

/**
 * 版の状態値オブジェクト兼状態機械。
 *
 *   draft ─submit→ under_review ─approve→ approved ─publish→ official
 *                       ├─request changes→ changes_requested
 *                       └─reject→ rejected
 *
 * 遷移メソッドは新しい VersionStatus を返す純粋関数。許可されない遷移は
 * InvalidVersionTransitionError を送出する（不正遷移拒否を型ではなく
 * ドメインで保証する）。
 */
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

  equals(other: VersionStatus): boolean {
    return this.#value === other.value;
  }

  #expect(expected: VersionStatusValue, action: string): void {
    if (this.#value !== expected) {
      throw new InvalidVersionTransitionError(this.#value, action);
    }
  }

  /** draft → under_review */
  submit(): VersionStatus {
    this.#expect('draft', 'submit');
    return new VersionStatus('under_review');
  }

  /** under_review → approved（ポリシー充足の判定は ReviewRequest 側） */
  approve(): VersionStatus {
    this.#expect('under_review', 'approve');
    return new VersionStatus('approved');
  }

  /** under_review → changes_requested */
  requestChanges(): VersionStatus {
    this.#expect('under_review', 'requestChanges');
    return new VersionStatus('changes_requested');
  }

  /** under_review → rejected */
  reject(): VersionStatus {
    this.#expect('under_review', 'reject');
    return new VersionStatus('rejected');
  }

  /** approved → official */
  publish(): VersionStatus {
    this.#expect('approved', 'publish');
    return new VersionStatus('official');
  }
}
