import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { ProjectRole } from './project-role';

describe('ProjectRole', () => {
  it.each(['owner', 'submitter', 'reviewer', 'approver'])(
    'should accept the valid role %s',
    (role) => {
      expect(new ProjectRole(role).value).toBe(role);
    },
  );

  it('should reject an unknown role', () => {
    expect(() => new ProjectRole('admin')).toThrow(ValidationError);
  });

  it('should report owner', () => {
    expect(new ProjectRole('owner').isOwner()).toBe(true);
    expect(new ProjectRole('reviewer').isOwner()).toBe(false);
  });
});
