import { DomainError } from '../../shared-kernel/domain-error';

export class InvalidProjectStateError extends DomainError {
  constructor(detail: string) {
    super(`プロジェクトの状態が不正です: ${detail}`);
  }
}
