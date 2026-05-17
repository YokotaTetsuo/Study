import { DomainError } from '../../shared-kernel/domain-error';

export class MemberUserNotFoundError extends DomainError {
  constructor() {
    super('指定したメールアドレスのユーザーが見つかりません');
  }
}
