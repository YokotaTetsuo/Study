import type { Pool } from 'pg';

import { PgDbConnectivity } from '../../health/adapters/gateways/pg-db-connectivity';
import { GetHealthUseCase } from '../../health/application/get-health-usecase';
import { SystemClock } from '../clock/system-clock';
import { createPool } from '../db/pool';
import type { Env } from '../env';
import { createApp } from '../http/app';
import type { AppType } from '../http/app';

/**
 * コンポジションルート。全依存をここで配線する。
 */
export interface Container {
  readonly pool: Pool;
  readonly app: AppType;
}

export function createContainer(env: Env): Container {
  const pool = createPool(env);
  const clock = new SystemClock();
  const db = new PgDbConnectivity(pool);
  const getHealth = new GetHealthUseCase({ clock, db });
  const app = createApp({ getHealth });
  return { pool, app };
}
