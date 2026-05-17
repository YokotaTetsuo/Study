import { describe, expect, it } from 'vitest';

import { FIXED_NOW, USER_ID_1 } from '../__tests__/fakes';

import { DisplayName } from './display-name';
import { Email } from './email';
import { PasswordHash } from './password-hash';
import { User } from './user';
import { UserId } from './user-id';

function aUser(): User {
  return User.create({
    id: new UserId(USER_ID_1),
    email: new Email('a@b.com'),
    passwordHash: new PasswordHash('hashed:pw'),
    displayName: new DisplayName('Alice'),
    createdAt: FIXED_NOW,
  });
}

describe('User', () => {
  it('should expose its identity and attributes via getters', () => {
    const user = aUser();

    expect(user.id.value).toBe(USER_ID_1);
    expect(user.email.value).toBe('a@b.com');
    expect(user.displayName.value).toBe('Alice');
    expect(user.createdAt.toISOString()).toBe(FIXED_NOW.toISOString());
  });

  it('should rename the display name', () => {
    const user = aUser();

    user.rename(new DisplayName('Bob'));

    expect(user.displayName.value).toBe('Bob');
  });

  it('should change the password hash', () => {
    const user = aUser();

    user.changePassword(new PasswordHash('hashed:new'));

    expect(user.passwordHash.value).toBe('hashed:new');
  });
});
