import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { Email } from './email';

describe('Email', () => {
  it('should normalize by trimming and lowercasing', () => {
    const email = new Email('  User@Example.COM ');

    expect(email.value).toBe('user@example.com');
  });

  it.each([
    { input: '', reason: 'empty' },
    { input: 'no-at', reason: 'missing @' },
    { input: 'a@b', reason: 'missing domain dot' },
    { input: 'a @b.com', reason: 'contains space' },
    { input: `${'a'.repeat(250)}@example.com`, reason: 'too long' },
  ])('should reject an invalid email ($reason)', ({ input }) => {
    expect(() => new Email(input)).toThrow(ValidationError);
  });

  it('should compare by normalized value', () => {
    expect(new Email('a@b.com').equals(new Email('A@B.COM'))).toBe(true);
  });
});
