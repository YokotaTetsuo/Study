import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { InvalidVersionTransitionError } from './invalid-version-transition-error';
import { VersionStatus } from './version-status';

describe('VersionStatus', () => {
  it('should expose draft as the initial status', () => {
    expect(VersionStatus.draft().value).toBe('draft');
  });

  it.each([
    'draft',
    'under_review',
    'approved',
    'official',
    'changes_requested',
    'rejected',
  ])('should parse the known status string %s', (value) => {
    expect(VersionStatus.fromString(value).value).toBe(value);
  });

  it('should reject an unknown status string', () => {
    expect(() => VersionStatus.fromString('unknown')).toThrow(ValidationError);
  });

  describe('valid transitions', () => {
    it('should go draft → under_review on submit', () => {
      expect(VersionStatus.draft().submit().value).toBe('under_review');
    });

    it('should go under_review → approved on approve', () => {
      expect(VersionStatus.fromString('under_review').approve().value).toBe(
        'approved',
      );
    });

    it('should go under_review → changes_requested on requestChanges', () => {
      expect(
        VersionStatus.fromString('under_review').requestChanges().value,
      ).toBe('changes_requested');
    });

    it('should go under_review → rejected on reject', () => {
      expect(VersionStatus.fromString('under_review').reject().value).toBe(
        'rejected',
      );
    });

    it('should go approved → official on publish', () => {
      expect(VersionStatus.fromString('approved').publish().value).toBe(
        'official',
      );
    });
  });

  describe('illegal transitions are rejected', () => {
    it.each([
      { from: 'draft', action: 'approve' },
      { from: 'draft', action: 'publish' },
      { from: 'draft', action: 'reject' },
      { from: 'under_review', action: 'submit' },
      { from: 'under_review', action: 'publish' },
      { from: 'approved', action: 'submit' },
      { from: 'approved', action: 'approve' },
      { from: 'official', action: 'publish' },
      { from: 'changes_requested', action: 'submit' },
      { from: 'rejected', action: 'approve' },
    ] as const)('should reject $action from $from', ({ from, action }) => {
      const status = VersionStatus.fromString(from);
      expect(() => {
        if (action === 'submit') status.submit();
        else if (action === 'approve') status.approve();
        else if (action === 'reject') status.reject();
        else status.publish();
      }).toThrow(InvalidVersionTransitionError);
    });
  });
});
