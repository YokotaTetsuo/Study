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

describe('UploadDropzone', () => {
  it('should call onUpload with the selected valid PDF on confirm', () => {
    const onUpload = vi.fn();
    render(
      <UploadDropzone
        onUpload={onUpload}
        pending={false}
        succeeded={false}
        failed={false}
      />,
    );

    const file = pdf();
    fireEvent.change(fileInput(), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'アップロード' }));

    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it('should show a validation warning and not offer upload for a non-PDF', () => {
    const onUpload = vi.fn();
    render(
      <UploadDropzone
        onUpload={onUpload}
        pending={false}
        succeeded={false}
        failed={false}
      />,
    );

    const png = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.change(fileInput(), { target: { files: [png] } });

    expect(screen.getByText(/PDF ファイル/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'アップロード' })).toBeNull();
  });

  it('should show progress and disable actions while pending', () => {
    render(
      <UploadDropzone
        onUpload={vi.fn()}
        pending
        succeeded={false}
        failed={false}
      />,
    );

    expect(screen.getByText('アップロード中…')).toBeTruthy();
  });

  it('should show a success message after a successful upload', () => {
    render(
      <UploadDropzone
        onUpload={vi.fn()}
        pending={false}
        succeeded
        failed={false}
      />,
    );

    expect(screen.getByText(/アップロードが完了しました/)).toBeTruthy();
  });

  it('should label the action as 再試行 after a failure', () => {
    render(
      <UploadDropzone
        onUpload={vi.fn()}
        pending={false}
        succeeded={false}
        failed
      />,
    );

    fireEvent.change(fileInput(), { target: { files: [pdf()] } });

    expect(screen.getByRole('button', { name: '再試行' })).toBeTruthy();
    expect(screen.getByText(/アップロードに失敗しました/)).toBeTruthy();
  });
});
