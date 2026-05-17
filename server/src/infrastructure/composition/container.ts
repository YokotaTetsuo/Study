import { SqlDbConnectivity } from '../../health/adapters/gateways/sql-db-connectivity';
import { GetHealthUseCase } from '../../health/application/get-health-usecase';
import { SystemClock } from '../clock/system-clock';
import { createDbClient } from '../db/client';
import type { DbClient } from '../db/client';
import type { Env } from '../env';
import { createApp } from '../http/app';
import type { AppType } from '../http/app';

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
  const dbConnectivity = new SqlDbConnectivity(dbClient.sql);
  const getHealth = new GetHealthUseCase({ clock, db: dbConnectivity });
  const app = createApp({ getHealth });
  return { dbClient, app };
}
