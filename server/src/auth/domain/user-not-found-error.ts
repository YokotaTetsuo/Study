import { DomainError } from '../../shared-kernel/domain-error';

export class UserNotFoundError extends DomainError {
  constructor() {
    super('ユーザーが見つかりません');
  }
}
