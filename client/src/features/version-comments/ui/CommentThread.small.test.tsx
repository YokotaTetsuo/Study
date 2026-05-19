// @vitest-environment jsdom
import type { Comment } from '@pdf-review/shared';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// コメント系フックは Hono RPC を呼ぶ IO 境界。観察可能な UI 振る舞い
// （無変更時の保存抑止・編集開始の抑止/リセット）だけを検証するため
// 境界をモックで差し替える（testing.md: API 境界はテストダブル）。
const editReset = vi.fn();
const editMutate = vi.fn();
const useEditCommentMock = vi.fn();
const useCommentsMock = vi.fn();

vi.mock('../model/use-comments', () => ({
  useComments: (): unknown => useCommentsMock(),
  useAddComment: (): unknown => ({
    isPending: false,
    isError: false,
    mutate: vi.fn(),
  }),
  useEditComment: (): unknown => useEditCommentMock(),
  useDeleteComment: (): unknown => ({
    isPending: false,
    isError: false,
    mutate: vi.fn(),
  }),
}));

import { CommentThread } from './CommentThread';

const AUTHOR = '01H000000000000000000AUTH0';
const COMMENT_ID = '01H000000000000000000CMNT0';

function aComment(content: string): Comment {
  return {
    id: COMMENT_ID,
    authorId: AUTHOR,
    content,
    createdAt: '2026-04-15T00:00:00.000Z',
    updatedAt: '2026-04-15T00:00:00.000Z',
  };
}

function setupEditState(
  overrides: Partial<{ isPending: boolean; isError: boolean }> = {},
): void {
  editReset.mockClear();
  editMutate.mockClear();
  useCommentsMock.mockReturnValue({
    isPending: false,
    isError: false,
    data: [aComment('元の本文')],
  });
  useEditCommentMock.mockReturnValue({
    isPending: false,
    isError: false,
    mutate: editMutate,
    reset: editReset,
    ...overrides,
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CommentThread comment editing', () => {
  it('should disable 保存 when the draft equals the content after trimming', () => {
    setupEditState();
    render(
      <CommentThread
        documentId="doc"
        versionNumber={1}
        currentUserId={AUTHOR}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'コメントを編集' }));

    const editField = screen.getByRole('textbox', { name: 'コメントを編集' });
    fireEvent.change(editField, { target: { value: '  元の本文  ' } });

    expect(
      screen.getByRole('button', { name: '保存' }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('should enable 保存 when the trimmed draft differs from the content', () => {
    setupEditState();
    render(
      <CommentThread
        documentId="doc"
        versionNumber={1}
        currentUserId={AUTHOR}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'コメントを編集' }));

    fireEvent.change(screen.getByRole('textbox', { name: 'コメントを編集' }), {
      target: { value: '修正した本文' },
    });

    expect(
      screen.getByRole('button', { name: '保存' }).hasAttribute('disabled'),
    ).toBe(false);
  });

  it('should reset the edit error state when editing starts', () => {
    setupEditState();
    render(
      <CommentThread
        documentId="doc"
        versionNumber={1}
        currentUserId={AUTHOR}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'コメントを編集' }));

    expect(editReset).toHaveBeenCalledOnce();
  });

  it('should reset the edit error state when editing is cancelled', () => {
    setupEditState();
    render(
      <CommentThread
        documentId="doc"
        versionNumber={1}
        currentUserId={AUTHOR}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'コメントを編集' }));
    editReset.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(editReset).toHaveBeenCalledOnce();
  });
});
