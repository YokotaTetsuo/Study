import { DomainError } from '../../shared-kernel/domain-error';

/**
 * コメントは著者本人のみ編集・削除できる。著者以外が編集/削除を試みた
 * 場合に送出。（プロジェクトメンバーかどうかの認可は usecase 層の
 * ProjectAccess で別途判定する。本エラーは「メンバーだが著者ではない」
 * ドメイン規則。）
 */
export class CommentForbiddenError extends DomainError {
  constructor() {
    super('コメントを編集・削除できるのは著者のみです');
  }
}
