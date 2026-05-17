import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { ProjectName } from './project-name';

describe('ProjectName', () => {
  it('should trim and accept a valid name', () => {
    expect(new ProjectName('  My Project  ').value).toBe('My Project');
  });

  it.each([
    { input: '', reason: 'empty' },
    { input: '   ', reason: 'only spaces' },
    { input: 'x'.repeat(121), reason: 'too long' },
  ])('should reject an invalid name ($reason)', ({ input }) => {
    expect(() => new ProjectName(input)).toThrow(ValidationError);
  });
});
