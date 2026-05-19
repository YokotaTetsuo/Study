// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RenameDocumentButton } from './RenameDocumentButton';

afterEach(() => {
  cleanup();
});

describe('RenameDocumentButton', () => {
  it('should invoke onClick when pressed', () => {
    const onClick = vi.fn();
    render(<RenameDocumentButton onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: '名称変更' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should stop click propagation to clickable ancestors', () => {
    const onAncestorClick = vi.fn();
    render(
      <div
        onClick={() => {
          onAncestorClick();
        }}
      >
        <RenameDocumentButton onClick={vi.fn()} />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: '名称変更' }));

    expect(onAncestorClick).not.toHaveBeenCalled();
  });
});
