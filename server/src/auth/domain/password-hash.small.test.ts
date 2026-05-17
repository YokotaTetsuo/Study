import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { PasswordHash } from './password-hash';

describe('PasswordHash', () => {
  it('should hold a non-empty hash value', () => {
    expect(new PasswordHash('argon2id$abc').value).toBe('argon2id$abc');
  });

  it('should reject an empty value', () => {
    expect(() => new PasswordHash('')).toThrow(ValidationError);
  });
});
