import { DomainError } from '../../shared-kernel/domain-error';

export class InvalidDocumentStateError extends DomainError {
  constructor(detail: string) {
    super(`文書の状態が不正です: ${detail}`);
  }
}
