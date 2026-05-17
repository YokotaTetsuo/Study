export interface UserProfile {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
}

/**
 * メール→ユーザー ID 解決とプロフィール参照ポート（project 固有）。
 * auth ドメインに依存せず、メンバー追加・レスポンス整形に用いる。
 */
export interface UserDirectory {
  findUserIdByEmail(email: string): Promise<string | null>;
  findProfiles(
    userIds: readonly string[],
  ): Promise<ReadonlyMap<string, UserProfile>>;
}
