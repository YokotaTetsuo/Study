import type { Email } from './email';
import type { User } from './user';
import type { UserId } from './user-id';

/**
 * User 集約の永続化ポート。実装は adapters/gateways。
 */
export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  save(user: User): Promise<void>;
}
