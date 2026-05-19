// @vitest-environment jsdom
import type { DocumentVersion } from '@pdf-review/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowPermissions } from '../../../features/version-workflow';

import { VersionHistoryList } from './VersionHistoryList';

afterEach(() => {
  cleanup();
});

const NO_PERMISSIONS: WorkflowPermissions = {
  canSubmit: false,
  canApprove: false,
  canReview: false,
  canPublish: false,
};

function aVersion(overrides: Partial<DocumentVersion> = {}): DocumentVersion {
  return {
    versionNumber: 1,
    status: 'draft',
    uploadedBy: '01H00000000000000000000000',
    createdAt: '2026-04-15T00:00:00.000Z',
    latestCommentAt: null,
    ...overrides,
  };
}

function renderList(versions: readonly DocumentVersion[]): void {
  const noop = vi.fn();
  render(
    <VersionHistoryList
      versions={versions}
      permissions={NO_PERMISSIONS}
      workflowPending={false}
      onOpenViewer={noop}
      onSubmit={noop}
      onApprove={noop}
      onRequestChanges={noop}
      onReject={noop}
      onPublish={noop}
    />,
  );
}

describe('VersionHistoryList', () => {
  it('should show the latest comment time when the version has comments', () => {
    renderList([aVersion({ latestCommentAt: '2026-05-19T03:34:00.000Z' })]);

    const label = new Date('2026-05-19T03:34:00.000Z').toLocaleString('ja-JP');
    expect(screen.getByText(`最終コメント: ${label}`)).toBeTruthy();
  });

  it('should show the no-comment fallback when the version has no comments', () => {
    renderList([aVersion({ latestCommentAt: null })]);

    expect(screen.getByText('コメントなし')).toBeTruthy();
  });
});
