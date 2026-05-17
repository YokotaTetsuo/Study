import { Argon2PasswordHasher } from '../../auth/adapters/gateways/argon2-password-hasher';
import { DrizzleSessionStore } from '../../auth/adapters/gateways/drizzle-session-store';
import { DrizzleUserRepository } from '../../auth/adapters/gateways/drizzle-user-repository';
import { GetMeUseCase } from '../../auth/application/get-me-usecase';
import { LoginUseCase } from '../../auth/application/login-usecase';
import { LogoutUseCase } from '../../auth/application/logout-usecase';
import { RegisterUseCase } from '../../auth/application/register-usecase';
import { SqlDbConnectivity } from '../../health/adapters/gateways/sql-db-connectivity';
import { GetHealthUseCase } from '../../health/application/get-health-usecase';
import { SystemClock } from '../clock/system-clock';
import { createDbClient } from '../db/client';
import type { DbClient } from '../db/client';
import type { Env } from '../env';
import { createApp } from '../http/app';
import type { AppType } from '../http/app';
import { UlidIdGenerator } from '../id/ulid-id-generator';

/**
 * コンポジションルート。全依存をここで配線する。
 */
export interface Container {
  readonly dbClient: DbClient;
  readonly app: AppType;
}

export function createContainer(env: Env): Container {
  const dbClient = createDbClient(env);
  const clock = new SystemClock();
  const idGenerator = new UlidIdGenerator();

  const dbConnectivity = new SqlDbConnectivity(dbClient.sql);
  const getHealth = new GetHealthUseCase({ clock, db: dbConnectivity });

  const users = new DrizzleUserRepository(dbClient.db);
  const hasher = new Argon2PasswordHasher();
  const sessions = new DrizzleSessionStore({
    db: dbClient.db,
    clock,
    idGenerator,
  });

  const app = createApp({
    getHealth,
    corsOrigin: env.CLIENT_ORIGIN,
    auth: {
      register: new RegisterUseCase({ users, hasher, idGenerator, clock }),
      login: new LoginUseCase({ users, hasher, sessions }),
      logout: new LogoutUseCase({ sessions }),
      getMe: new GetMeUseCase({ users, sessions }),
      cookieSecure: env.NODE_ENV === 'production',
    },
  });

  return { dbClient, app };
}
