import { DomainError } from '../../shared-kernel/domain-error';

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('メールアドレスまたはパスワードが正しくありません');
  }
}
