import { DomainError } from '../../shared-kernel/domain-error';

/** 同一承認者が同じレビュー依頼を二重に承認しようとしたときのドメインエラー。 */
export class DuplicateApprovalError extends DomainError {
  constructor() {
    super('同一の承認者による二重承認はできません');
  }
}
