import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { ApprovalPolicy } from './approval-policy';
import { ProjectRole } from './project-role';

describe('ApprovalPolicy', () => {
  it('should expose a default policy (1 approval, owner)', () => {
    const p = ApprovalPolicy.default();
    expect(p.requiredApprovals).toBe(1);
    expect(p.approverRoles.map((r) => r.value)).toEqual(['owner']);
  });

  it.each([
    { n: 0, reason: 'below 1' },
    { n: 1.5, reason: 'not integer' },
  ])('should reject requiredApprovals ($reason)', ({ n }) => {
    expect(
      () =>
        new ApprovalPolicy({
          requiredApprovals: n,
          approverRoles: [new ProjectRole('owner')],
        }),
    ).toThrow(ValidationError);
  });

  it('should reject empty approverRoles', () => {
    expect(
      () => new ApprovalPolicy({ requiredApprovals: 1, approverRoles: [] }),
    ).toThrow(ValidationError);
  });
});
