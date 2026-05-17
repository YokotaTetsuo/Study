import { describe, expect, it } from 'vitest';

import {
  InMemorySessionStore,
  InMemoryUserRepository,
  USER_ID_1,
  fakeHasher,
  fixedClock,
} from '../__tests__/fakes';
import { DisplayName } from '../domain/display-name';
import { Email } from '../domain/email';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';

import { InvalidCredentialsError } from './invalid-credentials-error';
import { LoginUseCase } from './login-usecase';

async function seededUsers(): Promise<InMemoryUserRepository> {
  const users = new InMemoryUserRepository();
  const passwordHash = await fakeHasher().hash('password123');
  await users.save(
    User.create({
      id: new UserId(USER_ID_1),
      email: new Email('a@example.com'),
      passwordHash,
      displayName: new DisplayName('Alice'),
      createdAt: fixedClock.now(),
    }),
  );
  return users;
}

describe('LoginUseCase', () => {
  it('should return the user and a session id on valid credentials', async () => {
    const useCase = new LoginUseCase({
      users: await seededUsers(),
      hasher: fakeHasher(),
      sessions: new InMemorySessionStore(),
    });

    const result = await useCase.execute({
      email: 'a@example.com',
      password: 'password123',
    });

    expect(result.user.id).toBe(USER_ID_1);
    expect(result.sessionId).not.toBe('');
  });

  it('should reject when the email is unknown', async () => {
    const useCase = new LoginUseCase({
      users: new InMemoryUserRepository(),
      hasher: fakeHasher(),
      sessions: new InMemorySessionStore(),
    });

    await expect(
      useCase.execute({
        email: 'missing@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('should reject when the password does not match', async () => {
    const useCase = new LoginUseCase({
      users: await seededUsers(),
      hasher: fakeHasher(),
      sessions: new InMemorySessionStore(),
    });

    await expect(
      useCase.execute({ email: 'a@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });
});
