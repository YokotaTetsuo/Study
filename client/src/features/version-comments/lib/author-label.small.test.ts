import { describe, expect, it } from 'vitest';

import { authorLabel } from './author-label';

describe('authorLabel', () => {
  it('should show the display name with the id when the author is resolved', () => {
    const label = authorLabel('01HQ8ZK9PRSTVWXYZ23456789C', '山田 太郎');

    expect(label).toBe('山田 太郎（01HQ8ZK9PRSTVWXYZ23456789C）');
  });

  it('should fall back to the id only when the display name is unresolved', () => {
    const label = authorLabel('01HQ8ZK9PRSTVWXYZ23456789C', null);

    expect(label).toBe('01HQ8ZK9PRSTVWXYZ23456789C');
  });
});
