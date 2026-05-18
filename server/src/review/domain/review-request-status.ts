import { ValidationError } from '../../shared-kernel/validation-error';

export const REVIEW_REQUEST_STATUSES = [
  'pending',
  'approved',
  'changes_requested',
  'rejected',
] as const;
export type ReviewRequestStatusValue = (typeof REVIEW_REQUEST_STATUSES)[number];

function isStatusValue(value: string): value is ReviewRequestStatusValue {
  return REVIEW_REQUEST_STATUSES.some((s) => s === value);
}

/**
 * レビュー依頼の状態値オブジェクト。
 * pending（受付中）から approved / changes_requested / rejected の
 * いずれかへ一度だけ確定する（線形ワークフロー）。
 */
export class ReviewRequestStatus {
  readonly #value: ReviewRequestStatusValue;

  private constructor(value: ReviewRequestStatusValue) {
    this.#value = value;
  }

  static pending(): ReviewRequestStatus {
    return new ReviewRequestStatus('pending');
  }

  static fromString(value: string): ReviewRequestStatus {
    if (!isStatusValue(value)) {
      throw new ValidationError(`不正なレビュー依頼状態です: ${value}`);
    }
    return new ReviewRequestStatus(value);
  }

  get value(): ReviewRequestStatusValue {
    return this.#value;
  }

  isPending(): boolean {
    return this.#value === 'pending';
  }

  equals(other: ReviewRequestStatus): boolean {
    return this.#value === other.value;
  }
}
