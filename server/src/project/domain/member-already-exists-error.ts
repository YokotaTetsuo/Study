import { DomainError } from '../../shared-kernel/domain-error';

export class MemberAlreadyExistsError extends DomainError {
  constructor() {
    super('このユーザーは既にメンバーです');
  }
}
