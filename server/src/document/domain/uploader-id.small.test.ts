import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { UploaderId } from './uploader-id';

const VALID = '01HQ8ZK9PRSTVWXYZ234567890';

describe('UploaderId', () => {
  it('should accept a valid ULID', () => {
    expect(new UploaderId(VALID).value).toBe(VALID);
  });

  it.each([
    { input: '', reason: 'empty' },
    { input: 'short', reason: 'too short' },
    { input: '81HQ8ZK9PRSTVWXYZ234567890', reason: 'first char above 7' },
  ])('should reject an invalid id ($reason)', ({ input }) => {
    expect(() => new UploaderId(input)).toThrow(ValidationError);
  });
});
