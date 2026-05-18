import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { ApproverId } from './approver-id';

const VALID = '01HQ8ZK9PRSTVWXYZ234567890';

describe('ApproverId', () => {
  it('should accept a valid ULID', () => {
    expect(new ApproverId(VALID).value).toBe(VALID);
  });

  it('should compare by value', () => {
    expect(new ApproverId(VALID).equals(new ApproverId(VALID))).toBe(true);
    expect(
      new ApproverId(VALID).equals(
        new ApproverId('01HQ8ZK9PRSTVWXYZ23456789B'),
      ),
    ).toBe(false);
  });

  it('should reject a non-ULID value', () => {
    expect(() => new ApproverId('not-ulid')).toThrow(ValidationError);
  });
});
