import type { ProjectRole } from '@pdf-review/shared';
import { describe, expect, it } from 'vitest';

import { computePermissions } from './permissions';

describe('computePermissions', () => {
  it('should deny everything for a non-member (undefined role)', () => {
    expect(computePermissions(undefined, ['owner'])).toEqual({
      canSubmit: false,
      canApprove: false,
      canReview: false,
      canPublish: false,
    });
  });

  it('should let an owner do everything', () => {
    expect(computePermissions('owner', ['owner'])).toEqual({
      canSubmit: true,
      canApprove: true,
      canReview: true,
      canPublish: true,
    });
  });

  it('should let a reviewer review but not approve/publish', () => {
    expect(computePermissions('reviewer', ['owner', 'approver'])).toEqual({
      canSubmit: true,
      canApprove: false,
      canReview: true,
      canPublish: false,
    });
  });

  it('should let an approver approve only when in the policy', () => {
    const roles: readonly ProjectRole[] = ['approver'];
    expect(computePermissions('approver', roles)).toEqual({
      canSubmit: true,
      canApprove: true,
      canReview: false,
      canPublish: false,
    });
  });

  it('should treat a submitter as member-only', () => {
    expect(computePermissions('submitter', ['owner'])).toEqual({
      canSubmit: true,
      canApprove: false,
      canReview: false,
      canPublish: false,
    });
  });
});
