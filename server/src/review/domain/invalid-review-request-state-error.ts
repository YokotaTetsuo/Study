import { DomainError } from '../../shared-kernel/domain-error';

/** 確定済みのレビュー依頼に対し再度決定を試みたときのドメインエラー。 */
export class InvalidReviewRequestStateError extends DomainError {
  constructor(detail: string) {
    super(`レビュー依頼の状態が不正です: ${detail}`);
  }
}
