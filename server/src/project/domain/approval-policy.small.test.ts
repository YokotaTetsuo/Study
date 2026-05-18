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

  describe('canApprove', () => {
    const policy = new ApprovalPolicy({
      requiredApprovals: 1,
      approverRoles: [new ProjectRole('owner'), new ProjectRole('approver')],
    });

    it('should allow a role contained in approverRoles', () => {
      expect(policy.canApprove(new ProjectRole('approver'))).toBe(true);
    });

    it('should deny a role not contained in approverRoles', () => {
      expect(policy.canApprove(new ProjectRole('reviewer'))).toBe(false);
    });
  });

  describe('isSatisfiedBy', () => {
    const policy = new ApprovalPolicy({
      requiredApprovals: 2,
      approverRoles: [new ProjectRole('owner'), new ProjectRole('approver')],
    });

    it('should be satisfied when qualifying approvals reach the threshold', () => {
      expect(
        policy.isSatisfiedBy([
          new ProjectRole('owner'),
          new ProjectRole('approver'),
        ]),
      ).toBe(true);
    });

    it('should not be satisfied below the threshold', () => {
      expect(policy.isSatisfiedBy([new ProjectRole('owner')])).toBe(false);
    });

    it('should ignore approvals from non-approver roles', () => {
      expect(
        policy.isSatisfiedBy([
          new ProjectRole('owner'),
          new ProjectRole('reviewer'),
        ]),
      ).toBe(false);
    });
  });
});
