import type { PasswordHash } from '../domain/password-hash';

/**
 * パスワードのハッシュ化・検証ポート（auth コンテキスト固有）。
 * 実装は adapters/gateways（argon2 等）。
 */
export interface PasswordHasher {
  hash(plain: string): Promise<PasswordHash>;
  verify(plain: string, hash: PasswordHash): Promise<boolean>;
}
