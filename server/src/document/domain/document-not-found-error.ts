import { DomainError } from '../../shared-kernel/domain-error';

export class DocumentNotFoundError extends DomainError {
  constructor() {
    super('文書が見つかりません');
  }
}
