import { describe, expect, it } from 'vitest';

import { InMemorySessionStore, USER_ID_1 } from '../__tests__/fakes';
import { UserId } from '../domain/user-id';

import { LogoutUseCase } from './logout-usecase';

describe('LogoutUseCase', () => {
  it('should destroy an existing session', async () => {
    const sessions = new InMemorySessionStore();
    const sessionId = await sessions.create(new UserId(USER_ID_1));

    await new LogoutUseCase({ sessions }).execute({ sessionId });

    expect(await sessions.findUserId(sessionId)).toBeNull();
  });

  it('should be idempotent for an unknown session', async () => {
    const sessions = new InMemorySessionStore();

    await expect(
      new LogoutUseCase({ sessions }).execute({ sessionId: 'nope' }),
    ).resolves.toBeUndefined();
  });
});
