import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { ReviewRequestId } from './review-request-id';

const VALID = '01HQ8ZK9PRSTVWXYZ234567890';

describe('ReviewRequestId', () => {
  it('should accept a valid ULID', () => {
    expect(new ReviewRequestId(VALID).value).toBe(VALID);
  });

  it('should compare by value', () => {
    expect(new ReviewRequestId(VALID).equals(new ReviewRequestId(VALID))).toBe(
      true,
    );
    expect(
      new ReviewRequestId(VALID).equals(
        new ReviewRequestId('01HQ8ZK9PRSTVWXYZ23456789B'),
      ),
    ).toBe(false);
  });

  it.each([
    { input: 'short', reason: 'too short' },
    { input: '81HQ8ZK9PRSTVWXYZ234567890', reason: 'first char above 7' },
  ])('should reject an invalid id ($reason)', ({ input }) => {
    expect(() => new ReviewRequestId(input)).toThrow(ValidationError);
  });
});
