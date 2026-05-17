import { describe, expect, it } from 'vitest';

import {
  InMemorySessionStore,
  InMemoryUserRepository,
  USER_ID_1,
  fixedClock,
} from '../__tests__/fakes';
import { DisplayName } from '../domain/display-name';
import { Email } from '../domain/email';
import { PasswordHash } from '../domain/password-hash';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { UserNotFoundError } from '../domain/user-not-found-error';

import { GetMeUseCase } from './get-me-usecase';
import { UnauthenticatedError } from './unauthenticated-error';

function aUser(): User {
  return User.create({
    id: new UserId(USER_ID_1),
    email: new Email('a@example.com'),
    passwordHash: new PasswordHash('hashed:x'),
    displayName: new DisplayName('Alice'),
    createdAt: fixedClock.now(),
  });
}

describe('GetMeUseCase', () => {
  it('should return the user for a valid session', async () => {
    const users = new InMemoryUserRepository();
    await users.save(aUser());
    const sessions = new InMemorySessionStore();
    const sessionId = await sessions.create(new UserId(USER_ID_1));

    const result = await new GetMeUseCase({ users, sessions }).execute({
      sessionId,
    });

    expect(result.id).toBe(USER_ID_1);
    expect(result.email).toBe('a@example.com');
  });

  it('should reject when the session is invalid', async () => {
    const useCase = new GetMeUseCase({
      users: new InMemoryUserRepository(),
      sessions: new InMemorySessionStore(),
    });

    await expect(useCase.execute({ sessionId: 'invalid' })).rejects.toThrow(
      UnauthenticatedError,
    );
  });

  it('should reject when the session references a missing user', async () => {
    const sessions = new InMemorySessionStore();
    const sessionId = await sessions.create(new UserId(USER_ID_1));

    const useCase = new GetMeUseCase({
      users: new InMemoryUserRepository(),
      sessions,
    });

    await expect(useCase.execute({ sessionId })).rejects.toThrow(
      UserNotFoundError,
    );
  });
});
