import { DomainError } from '../../shared-kernel/domain-error';

export class EmailAlreadyInUseError extends DomainError {
  constructor() {
    super('このメールアドレスは既に使用されています');
  }
}
