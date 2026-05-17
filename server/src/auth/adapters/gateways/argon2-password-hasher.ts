import { hash, verify } from '@node-rs/argon2';

import type { PasswordHasher } from '../../application/password-hasher';
import { PasswordHash } from '../../domain/password-hash';

/**
 * argon2id によるパスワードハッシュ実装。CPU 演算のみ（外部 IO 無し）。
 */
export class Argon2PasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<PasswordHash> {
    return new PasswordHash(await hash(plain));
  }

  verify(plain: string, passwordHash: PasswordHash): Promise<boolean> {
    return verify(passwordHash.value, plain);
  }
}
