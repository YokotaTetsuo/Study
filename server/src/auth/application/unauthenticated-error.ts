import { DomainError } from '../../shared-kernel/domain-error';

export class UnauthenticatedError extends DomainError {
  constructor() {
    super('認証が必要です');
  }
}
