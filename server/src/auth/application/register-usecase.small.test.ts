import { describe, expect, it } from 'vitest';

import {
  InMemoryUserRepository,
  USER_ID_1,
  fakeHasher,
  fixedClock,
  idGeneratorReturning,
} from '../__tests__/fakes';
import { DisplayName } from '../domain/display-name';
import { Email } from '../domain/email';
import { PasswordHash } from '../domain/password-hash';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';

import { EmailAlreadyInUseError } from './email-already-in-use-error';
import { RegisterUseCase } from './register-usecase';

function makeUseCase(users: InMemoryUserRepository): RegisterUseCase {
  return new RegisterUseCase({
    users,
    hasher: fakeHasher(),
    idGenerator: idGeneratorReturning(USER_ID_1),
    clock: fixedClock,
  });
}

describe('RegisterUseCase', () => {
  it('should persist a new user and return its result', async () => {
    const users = new InMemoryUserRepository();

    const result = await makeUseCase(users).execute({
      email: 'New@Example.com',
      password: 'password123',
      displayName: 'Alice',
    });

    expect(result.id).toBe(USER_ID_1);
    expect(result.email).toBe('new@example.com');
    expect(result.displayName).toBe('Alice');
    expect(await users.existsByEmail(new Email('new@example.com'))).toBe(true);
  });

  it('should reject when the email is already in use', async () => {
    const users = new InMemoryUserRepository();
    await users.save(
      User.create({
        id: new UserId(USER_ID_1),
        email: new Email('dup@example.com'),
        passwordHash: new PasswordHash('hashed:x'),
        displayName: new DisplayName('Dup'),
        createdAt: fixedClock.now(),
      }),
    );

    await expect(
      makeUseCase(users).execute({
        email: 'dup@example.com',
        password: 'password123',
        displayName: 'Alice',
      }),
    ).rejects.toThrow(EmailAlreadyInUseError);
  });
});
