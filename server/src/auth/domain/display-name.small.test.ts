import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { DisplayName } from './display-name';

describe('DisplayName', () => {
  it('should trim surrounding whitespace', () => {
    expect(new DisplayName('  Alice  ').value).toBe('Alice');
  });

  it.each([
    { input: '', reason: 'empty' },
    { input: '   ', reason: 'only whitespace' },
    { input: 'x'.repeat(65), reason: 'too long' },
  ])('should reject an invalid display name ($reason)', ({ input }) => {
    expect(() => new DisplayName(input)).toThrow(ValidationError);
  });

  it('should accept the maximum length', () => {
    expect(new DisplayName('x'.repeat(64)).value).toHaveLength(64);
  });
});
