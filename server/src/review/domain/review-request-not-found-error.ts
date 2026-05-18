import { DomainError } from '../../shared-kernel/domain-error';

export class ReviewRequestNotFoundError extends DomainError {
  constructor() {
    super('レビュー依頼が見つかりません');
  }
}
