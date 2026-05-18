// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UploadDropzone } from './UploadDropzone';

afterEach(() => {
  cleanup();
});

function pdf(name = 'doc.pdf', size = 1024): File {
  const file = new File(['x'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function fileInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('file input not found');
  }
  return input;
}

function renderDropzone(
  overrides: Partial<Parameters<typeof UploadDropzone>[0]> = {},
): {
  onUpload: ReturnType<typeof vi.fn>;
  onResetStatus: ReturnType<typeof vi.fn>;
} {
  const onUpload = vi.fn();
  const onResetStatus = vi.fn();
  render(
    <UploadDropzone
      onUpload={onUpload}
      onResetStatus={onResetStatus}
      pending={false}
      succeeded={false}
      failed={false}
      {...overrides}
    />,
  );
  return { onUpload, onResetStatus };
}

describe('UploadDropzone', () => {
  it('should call onUpload with the selected valid PDF on confirm', () => {
    const { onUpload } = renderDropzone();

    const file = pdf();
    fireEvent.change(fileInput(), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'アップロード' }));

    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it('should show a validation warning and not offer upload for a non-PDF', () => {
    renderDropzone();

    const png = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.change(fileInput(), { target: { files: [png] } });

    expect(screen.getByText(/PDF ファイル/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'アップロード' })).toBeNull();
  });

  it('should reset the previous upload status when a new file is selected', () => {
    const { onResetStatus } = renderDropzone({ failed: true });

    fireEvent.change(fileInput(), { target: { files: [pdf()] } });

    expect(onResetStatus).toHaveBeenCalled();
  });

  it('should reset status when the selection is cleared', () => {
    const { onResetStatus } = renderDropzone();

    fireEvent.change(fileInput(), { target: { files: [pdf()] } });
    onResetStatus.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '選び直す' }));

    expect(onResetStatus).toHaveBeenCalled();
  });

  it('should expose the dropzone as a keyboard-focusable button', () => {
    renderDropzone();

    const zone = screen.getByRole('button', {
      name: /ドラッグ&ドロップ/,
    });
    expect(zone.getAttribute('tabindex')).toBe('0');
  });

  it('should show progress and disable actions while pending', () => {
    renderDropzone({ pending: true });

    expect(screen.getByText('アップロード中…')).toBeTruthy();
  });

  it('should show a success message after a successful upload', () => {
    renderDropzone({ succeeded: true });

    expect(screen.getByText(/アップロードが完了しました/)).toBeTruthy();
  });

  it('should label the action as 再試行 after a failure', () => {
    renderDropzone({ failed: true });

    fireEvent.change(fileInput(), { target: { files: [pdf()] } });

    expect(screen.getByRole('button', { name: '再試行' })).toBeTruthy();
    expect(screen.getByText(/アップロードに失敗しました/)).toBeTruthy();
  });
});
