import { DomainError } from '../../shared-kernel/domain-error';

/**
 * コメントは著者本人のみ削除できる。著者以外が削除を試みた場合に送出。
 * （プロジェクトメンバーかどうかの認可は usecase 層の ProjectAccess で
 * 別途判定する。本エラーは「メンバーだが著者ではない」ドメイン規則。）
 */
export class CommentForbiddenError extends DomainError {
  constructor() {
    super('コメントを削除できるのは著者のみです');
  }
}
