import { DomainError } from '../../shared-kernel/domain-error';

export class VersionNotFoundError extends DomainError {
  constructor() {
    super('版が見つかりません');
  }
}
