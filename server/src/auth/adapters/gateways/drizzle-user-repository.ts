import dayjs from 'dayjs';
import { eq } from 'drizzle-orm';

import { DisplayName } from '../../domain/display-name';
import { Email } from '../../domain/email';
import { PasswordHash } from '../../domain/password-hash';
import { User } from '../../domain/user';
import { UserId } from '../../domain/user-id';
import type { UserRepository } from '../../domain/user-repository';

import type { Database } from './database';
import { users } from './schema';

interface UserRow {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly displayName: string;
  readonly createdAt: Date;
}

function toUser(row: UserRow): User {
  return User.reconstruct({
    id: new UserId(row.id),
    email: new Email(row.email),
    passwordHash: new PasswordHash(row.passwordHash),
    displayName: new DisplayName(row.displayName),
    createdAt: dayjs(row.createdAt),
  });
}

export class DrizzleUserRepository implements UserRepository {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  async findById(id: UserId): Promise<User | null> {
    const rows = await this.#db
      .select()
      .from(users)
      .where(eq(users.id, id.value))
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : toUser(row);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const rows = await this.#db
      .select()
      .from(users)
      .where(eq(users.email, email.value))
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : toUser(row);
  }

  async existsByEmail(email: Email): Promise<boolean> {
    return (await this.findByEmail(email)) !== null;
  }

  async save(user: User): Promise<void> {
    const row = {
      id: user.id.value,
      email: user.email.value,
      passwordHash: user.passwordHash.value,
      displayName: user.displayName.value,
      createdAt: user.createdAt.toDate(),
    };
    await this.#db
      .insert(users)
      .values(row)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: row.email,
          passwordHash: row.passwordHash,
          displayName: row.displayName,
        },
      });
  }
}
