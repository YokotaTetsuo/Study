import type { DocumentVersion } from '@pdf-review/shared';
import { describe, expect, it } from 'vitest';

import { reconcileSelectedVersion } from './select-version';

function aVersion(versionNumber: number): DocumentVersion {
  return {
    versionNumber,
    status: 'draft',
    uploadedBy: '01H00000000000000000000000',
    createdAt: '2026-04-15T00:00:00.000Z',
  };
}

describe('reconcileSelectedVersion', () => {
  it('should select the latest version when nothing is selected yet', () => {
    const versions = [aVersion(1), aVersion(2), aVersion(3)];

    expect(reconcileSelectedVersion(null, versions)).toBe(3);
  });

  it('should keep the current selection when it exists in the versions', () => {
    const versions = [aVersion(1), aVersion(2), aVersion(3)];

    expect(reconcileSelectedVersion(2, versions)).toBe(2);
  });

  it('should fall back to the latest version when the selection is absent (document switched)', () => {
    const previousDocumentVersions = 7;
    const newDocumentVersions = [aVersion(1), aVersion(2)];

    expect(
      reconcileSelectedVersion(previousDocumentVersions, newDocumentVersions),
    ).toBe(2);
  });

  it('should clear the selection when the new document has no versions', () => {
    expect(reconcileSelectedVersion(3, [])).toBeNull();
  });

  it('should return null while versions are not yet loaded', () => {
    expect(reconcileSelectedVersion(3, undefined)).toBeNull();
  });
});
