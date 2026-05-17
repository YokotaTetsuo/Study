import { DomainError } from '../../shared-kernel/domain-error';

export class ProjectNotFoundError extends DomainError {
  constructor() {
    super('プロジェクトが見つかりません');
  }
}
