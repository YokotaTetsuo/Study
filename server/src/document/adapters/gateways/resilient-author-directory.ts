import type { AuthorDirectory } from '../../application/author-directory';

/**
 * AuthorDirectory のデコレータ。表示名解決は補助情報であり、これに
 * 失敗してもコメント追加/編集/一覧取得を HTTP 失敗させない。内側の
 * 実装が例外を投げた場合は 1 度の解決失敗につき 1 行だけ警告ログを
 * 出し、空 Map（＝全件 null フォールバック）を返す。
 *
 * これにより各ユースケースから try/catch と重複ログを排除し、
 * 「findDisplayNames は throw しない」という契約をこの層で担保する。
 */
export class ResilientAuthorDirectory implements AuthorDirectory {
  readonly #inner: AuthorDirectory;

  constructor(inner: AuthorDirectory) {
    this.#inner = inner;
  }

  async findDisplayNames(
    userIds: readonly string[],
  ): Promise<ReadonlyMap<string, string>> {
    try {
      return await this.#inner.findDisplayNames(userIds);
    } catch (error) {
      // eslint-disable-next-line no-console -- 補助情報の解決失敗を可視化（1 解決失敗につき 1 行）
      console.warn('著者表示名の解決に失敗しました（null で続行）:', error);
      return new Map<string, string>();
    }
  }
}
