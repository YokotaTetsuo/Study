import { DomainError } from '../../shared-kernel/domain-error';

export class NotAuthorizedError extends DomainError {
  constructor() {
    super('この操作の権限がありません');
  }
}
