import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import type { Clock } from '../../shared-kernel/clock';

import type { DbConnectivityPort } from './db-connectivity-port';
import { GetHealthUseCase } from './get-health-usecase';

const FIXED = dayjs('2026-05-17T12:00:00.000Z');

const fixedClock: Clock = {
  now: () => FIXED,
};

function dbStub(reachable: boolean): DbConnectivityPort {
  return { isReachable: () => Promise.resolve(reachable) };
}

describe('GetHealthUseCase', () => {
  it("should report db 'up' when the database is reachable", async () => {
    const useCase = new GetHealthUseCase({
      clock: fixedClock,
      db: dbStub(true),
    });

    const result = await useCase.execute();

    expect(result.status).toBe('ok');
    expect(result.db).toBe('up');
  });

  it("should report db 'down' when the database is unreachable", async () => {
    const useCase = new GetHealthUseCase({
      clock: fixedClock,
      db: dbStub(false),
    });

    const result = await useCase.execute();

    expect(result.db).toBe('down');
  });

  it('should stamp checkedAt from the injected clock', async () => {
    const useCase = new GetHealthUseCase({
      clock: fixedClock,
      db: dbStub(true),
    });

    const result = await useCase.execute();

    expect(result.checkedAt.toISOString()).toBe(FIXED.toISOString());
  });
});
