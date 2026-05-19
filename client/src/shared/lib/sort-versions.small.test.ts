import type { DocumentVersion } from '@pdf-review/shared';
import { describe, expect, it } from 'vitest';

import { sortVersionsDesc } from './sort-versions';

function aVersion(versionNumber: number): DocumentVersion {
  return {
    versionNumber,
    status: 'draft',
    uploadedBy: '01H00000000000000000000000',
    createdAt: '2026-04-15T00:00:00.000Z',
  };
}

describe('sortVersionsDesc', () => {
  it('should order versions from the latest (highest number) to the oldest', () => {
    const ascending = [aVersion(1), aVersion(2), aVersion(3)];

    const ordered = sortVersionsDesc(ascending);

    expect(ordered.map((v) => v.versionNumber)).toEqual([3, 2, 1]);
  });

  it('should return a single-element list unchanged in content', () => {
    const ordered = sortVersionsDesc([aVersion(1)]);

    expect(ordered.map((v) => v.versionNumber)).toEqual([1]);
  });

  it('should return an empty list for empty input', () => {
    expect(sortVersionsDesc([])).toEqual([]);
  });

  it('should not mutate the input array', () => {
    const ascending = [aVersion(1), aVersion(2), aVersion(3)];

    sortVersionsDesc(ascending);

    expect(ascending.map((v) => v.versionNumber)).toEqual([1, 2, 3]);
  });

  it('should sort already-descending input into descending order', () => {
    const descending = [aVersion(3), aVersion(2), aVersion(1)];

    const ordered = sortVersionsDesc(descending);

    expect(ordered.map((v) => v.versionNumber)).toEqual([3, 2, 1]);
  });

  it('should reorder a shuffled list into descending order', () => {
    const shuffled = [aVersion(2), aVersion(5), aVersion(1), aVersion(4)];

    const ordered = sortVersionsDesc(shuffled);

    expect(ordered.map((v) => v.versionNumber)).toEqual([5, 4, 2, 1]);
  });
});
