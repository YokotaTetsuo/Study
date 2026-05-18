import { DomainError } from '../../shared-kernel/domain-error';

export class CommentNotFoundError extends DomainError {
  constructor() {
    super('コメントが見つかりません');
  }
}
