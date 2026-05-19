/**
 * コメント著者の表示名解決ポート（document 固有）。
 * auth/project ドメインに依存せず、レスポンス整形（表示名併記）に用いる。
 * 実装は adapters/gateways（生 SQL で疎結合に保つ）。
 */
export interface AuthorDirectory {
  /**
   * 与えられたユーザー ID 群の表示名を引く。解決できなかった ID は
   * Map に含めない（呼び出し側が null フォールバックを判断する）。
   */
  findDisplayNames(
    userIds: readonly string[],
  ): Promise<ReadonlyMap<string, string>>;
}
