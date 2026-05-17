import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { ProjectId } from './project-id';

const VALID = '01HQ8ZK9PRSTVWXYZ234567890';

describe('ProjectId', () => {
  it('should accept a valid ULID', () => {
    expect(new ProjectId(VALID).value).toBe(VALID);
  });

  it.each([
    { input: 'short', reason: 'too short' },
    { input: '81HQ8ZK9PRSTVWXYZ234567890', reason: 'first char above 7' },
  ])('should reject an invalid id ($reason)', ({ input }) => {
    expect(() => new ProjectId(input)).toThrow(ValidationError);
  });
});
