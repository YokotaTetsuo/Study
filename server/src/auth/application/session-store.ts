import type { UserId } from '../domain/user-id';

/**
 * セッション管理ポート（auth コンテキスト固有）。
 * 実装は adapters/gateways（Cookie セッション等）。
 */
export interface SessionStore {
  /** セッションを作成し、その識別子（トークン）を返す。 */
  create(userId: UserId): Promise<string>;
  /** セッションを破棄する（冪等）。 */
  destroy(sessionId: string): Promise<void>;
  /** セッションに紐づくユーザー ID。無効なら null。 */
  findUserId(sessionId: string): Promise<UserId | null>;
}
