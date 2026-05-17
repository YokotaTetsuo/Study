import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';

import type { GetHealthUseCase } from '../../application/get-health-usecase';

import { createHealthApp } from './health-controller';

const FIXED = dayjs('2026-05-17T12:00:00.000Z');

describe('GET /health', () => {
  it('should return 200 and convert the use case result to the response shape', async () => {
    // Controller テストは HTTP 境界のみ検証する。UseCase はモックする
    // （.claude/rules/testing.md「Controller は UseCase をモック」）。
    const getHealth: Pick<GetHealthUseCase, 'execute'> = {
      execute: vi
        .fn()
        .mockResolvedValue({ status: 'ok', db: 'up', checkedAt: FIXED }),
    };
    const app = createHealthApp({ getHealth });

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
