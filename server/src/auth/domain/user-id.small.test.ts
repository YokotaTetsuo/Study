import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { UserId } from './user-id';

const VALID = '01HQ8ZK9PRSTVWXYZ234567890';

describe('UserId', () => {
  it('should accept a valid ULID-shaped string', () => {
    expect(new UserId(VALID).value).toBe(VALID);
  });

  it.each([
    { input: '', reason: 'empty' },
    { input: 'short', reason: 'too short' },
    { input: VALID + 'A', reason: 'too long' },
    { input: '01HQ8ZK9PRSTVWXYZ23456789I', reason: 'contains I' },
    { input: '01HQ8ZK9PRSTVWXYZ23456789L', reason: 'contains L' },
  ])('should reject an invalid id ($reason)', ({ input }) => {
    expect(() => new UserId(input)).toThrow(ValidationError);
  });

  it('should compare by value', () => {
    expect(new UserId(VALID).equals(new UserId(VALID))).toBe(true);
  });
});
