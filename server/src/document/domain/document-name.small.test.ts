import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { DocumentName } from './document-name';

describe('DocumentName', () => {
  it('should trim and accept a valid name', () => {
    expect(new DocumentName('  設計書  ').value).toBe('設計書');
  });

  it.each([
    { input: '', reason: 'empty' },
    { input: '   ', reason: 'only spaces' },
    { input: 'x'.repeat(201), reason: 'too long' },
  ])('should reject an invalid name ($reason)', ({ input }) => {
    expect(() => new DocumentName(input)).toThrow(ValidationError);
  });
});
