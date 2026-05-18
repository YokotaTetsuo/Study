import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { ReviewRequestStatus } from './review-request-status';

describe('ReviewRequestStatus', () => {
  it('should start as pending', () => {
    const s = ReviewRequestStatus.pending();
    expect(s.value).toBe('pending');
    expect(s.isPending()).toBe(true);
  });

  it.each(['pending', 'approved', 'changes_requested', 'rejected'])(
    'should parse the known status %s',
    (value) => {
      expect(ReviewRequestStatus.fromString(value).value).toBe(value);
    },
  );

  it('should report non-pending statuses', () => {
    expect(ReviewRequestStatus.fromString('approved').isPending()).toBe(false);
  });

  it('should reject an unknown status string', () => {
    expect(() => ReviewRequestStatus.fromString('done')).toThrow(
      ValidationError,
    );
  });
});
