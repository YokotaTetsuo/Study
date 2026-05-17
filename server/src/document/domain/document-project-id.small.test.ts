import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { DocumentProjectId } from './document-project-id';

const VALID = '01HQ8ZK9PRSTVWXYZ234567890';

describe('DocumentProjectId', () => {
  it('should accept a valid ULID', () => {
    expect(new DocumentProjectId(VALID).value).toBe(VALID);
  });

  it('should compare by value', () => {
    expect(
      new DocumentProjectId(VALID).equals(new DocumentProjectId(VALID)),
    ).toBe(true);
    expect(
      new DocumentProjectId(VALID).equals(
        new DocumentProjectId('01HQ8ZK9PRSTVWXYZ23456789B'),
      ),
    ).toBe(false);
  });

  it.each([
    { input: 'short', reason: 'too short' },
    { input: '81HQ8ZK9PRSTVWXYZ234567890', reason: 'first char above 7' },
  ])('should reject an invalid id ($reason)', ({ input }) => {
    expect(() => new DocumentProjectId(input)).toThrow(ValidationError);
  });
});
