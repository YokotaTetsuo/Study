import { DomainError } from '../../shared-kernel/domain-error';

/** 版状態機械で許可されない遷移を試みたときのドメインエラー。 */
export class InvalidVersionTransitionError extends DomainError {
  constructor(from: string, action: string) {
    super(`版状態 ${from} に対する操作 ${action} は許可されていません`);
  }
}
