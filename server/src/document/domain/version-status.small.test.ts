import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared-kernel/validation-error';

import { VersionStatus } from './version-status';

describe('VersionStatus', () => {
  it('should expose draft', () => {
    expect(VersionStatus.draft().value).toBe('draft');
  });

  it('should parse a known status string', () => {
    expect(VersionStatus.fromString('draft').value).toBe('draft');
  });

  it('should reject an unknown status string', () => {
    expect(() => VersionStatus.fromString('approved')).toThrow(ValidationError);
  });
});
