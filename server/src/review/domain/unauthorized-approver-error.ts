import { DomainError } from '../../shared-kernel/domain-error';

/** 承認ポリシー上、承認権限を持たないロールが承認を試みたときのドメインエラー。 */
export class UnauthorizedApproverError extends DomainError {
  constructor(role: string) {
    super(`ロール ${role} はこのレビュー依頼を承認する権限がありません`);
  }
}
