import { DomainError } from '../../shared-kernel/domain-error';

export class MemberNotFoundError extends DomainError {
  constructor() {
    super('メンバーが見つかりません');
  }
}
