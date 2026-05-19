// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DeleteDocumentButton } from './DeleteDocumentButton';

afterEach(() => {
  cleanup();
});

describe('DeleteDocumentButton', () => {
  it('should invoke onClick when pressed', () => {
    const onClick = vi.fn();
    render(<DeleteDocumentButton onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: '削除' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
