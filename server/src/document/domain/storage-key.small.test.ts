import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { StorageKey } from './storage-key';

describe('StorageKey', () => {
  it('should accept a non-empty key', () => {
    const key = 'documents/01HQ8ZK9PRSTVWXYZ234567890/v1.pdf';
    expect(new StorageKey(key).value).toBe(key);
  });

  it.each([
    { input: '', reason: 'empty' },
    { input: '   ', reason: 'only spaces' },
  ])('should reject an invalid key ($reason)', ({ input }) => {
    expect(() => new StorageKey(input)).toThrow(ValidationError);
  });
});
