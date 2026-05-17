import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import type { Clock } from '../../../shared-kernel/clock';
import type { DbConnectivityPort } from '../../application/db-connectivity-port';
import { GetHealthUseCase } from '../../application/get-health-usecase';

import { createHealthApp } from './health-controller';

const FIXED = dayjs('2026-05-17T12:00:00.000Z');
const clock: Clock = { now: () => FIXED };
const db: DbConnectivityPort = { isReachable: () => Promise.resolve(true) };

describe('GET /health', () => {
  it('should return 200 with the health response shape', async () => {
    const app = createHealthApp({
      getHealth: new GetHealthUseCase({ clock, db }),
    });

    const res = await app.request('/health');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      status: 'ok',
      db: 'up',
      checkedAt: FIXED.toISOString(),
    });
  });
});
