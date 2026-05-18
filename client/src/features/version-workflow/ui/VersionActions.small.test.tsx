// @vitest-environment jsdom
import type { VersionStatus } from '@pdf-review/shared';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowPermissions } from '../lib/permissions';

import { VersionActions } from './VersionActions';

afterEach(() => {
  cleanup();
});

const ALL: WorkflowPermissions = {
  canSubmit: true,
  canApprove: true,
  canReview: true,
  canPublish: true,
};

function renderActions(
  status: VersionStatus,
  pending = false,
  permissions: WorkflowPermissions = ALL,
): Record<string, ReturnType<typeof vi.fn>> {
  const handlers = {
    onSubmit: vi.fn(),
    onApprove: vi.fn(),
    onRequestChanges: vi.fn(),
    onReject: vi.fn(),
    onPublish: vi.fn(),
  };
  render(
    <VersionActions
      status={status}
      pending={pending}
      permissions={permissions}
      {...handlers}
    />,
  );
  return handlers;
}

describe('VersionActions', () => {
  it('should offer 提出 only for a draft and call onSubmit', () => {
    const h = renderActions('draft');
    fireEvent.click(screen.getByRole('button', { name: '提出' }));
    expect(h.onSubmit).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: '承認' })).toBeNull();
  });

  it('should offer approve/request-changes/reject for under_review', () => {
    const h = renderActions('under_review');
    fireEvent.click(screen.getByRole('button', { name: '承認' }));
    fireEvent.click(screen.getByRole('button', { name: '差戻し' }));
    fireEvent.click(screen.getByRole('button', { name: '却下' }));
    expect(h.onApprove).toHaveBeenCalledOnce();
    expect(h.onRequestChanges).toHaveBeenCalledOnce();
    expect(h.onReject).toHaveBeenCalledOnce();
  });

  it('should offer 正式版にする for an approved version', () => {
    const h = renderActions('approved');
    fireEvent.click(screen.getByRole('button', { name: '正式版にする' }));
    expect(h.onPublish).toHaveBeenCalledOnce();
  });

  const noActionStatuses: VersionStatus[] = [
    'official',
    'rejected',
    'changes_requested',
  ];

  it.each(noActionStatuses)('should offer no actions for %s', (s) => {
    renderActions(s);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('should disable actions while pending', () => {
    renderActions('under_review', true);
    expect(
      screen.getByRole('button', { name: '承認' }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('should hide approve when the user cannot approve', () => {
    renderActions('under_review', false, {
      canSubmit: true,
      canApprove: false,
      canReview: true,
      canPublish: false,
    });
    expect(screen.queryByRole('button', { name: '承認' })).toBeNull();
    expect(screen.getByRole('button', { name: '差戻し' })).toBeTruthy();
  });

  it('should hide all under_review actions for a non-privileged member', () => {
    renderActions('under_review', false, {
      canSubmit: true,
      canApprove: false,
      canReview: false,
      canPublish: false,
    });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('should hide 提出 for a draft when the user cannot submit', () => {
    renderActions('draft', false, {
      canSubmit: false,
      canApprove: false,
      canReview: false,
      canPublish: false,
    });
    expect(screen.queryByRole('button', { name: '提出' })).toBeNull();
  });

  it('should hide publish when the user is not an owner', () => {
    renderActions('approved', false, {
      canSubmit: true,
      canApprove: true,
      canReview: true,
      canPublish: false,
    });
    expect(screen.queryByRole('button', { name: '正式版にする' })).toBeNull();
  });
});
