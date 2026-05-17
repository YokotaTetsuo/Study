import { describe, expect, it } from 'vitest';

import { Argon2PasswordHasher } from './argon2-password-hasher';

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();

  it('should verify a password against its own hash', async () => {
    const hash = await hasher.hash('correct horse battery staple');

    expect(await hasher.verify('correct horse battery staple', hash)).toBe(
      true,
    );
  });

  it('should reject a wrong password', async () => {
    const hash = await hasher.hash('right-password');

    expect(await hasher.verify('wrong-password', hash)).toBe(false);
  });
});
