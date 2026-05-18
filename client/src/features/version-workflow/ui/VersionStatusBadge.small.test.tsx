// @vitest-environment jsdom
import type { VersionStatus } from '@pdf-review/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { VersionStatusBadge } from './VersionStatusBadge';

afterEach(() => {
  cleanup();
});

describe('VersionStatusBadge', () => {
  const cases: { status: VersionStatus; label: string }[] = [
    { status: 'draft', label: '下書き' },
    { status: 'under_review', label: 'レビュー中' },
    { status: 'approved', label: '承認済み' },
    { status: 'official', label: '正式版' },
    { status: 'changes_requested', label: '差戻し' },
    { status: 'rejected', label: '却下' },
  ];

  it.each(cases)('should render $label for $status', ({ status, label }) => {
    render(<VersionStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});
