// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RenameDocumentDialog } from './RenameDocumentDialog';

const DOC_ID = '01HQ8ZK9PRSTVWXYZ234567890';
const PROJECT_ID = '01HQ8ZK9PRSTVWXYZ23456789A';

function wrapper(): (props: { children: ReactNode }) => ReactElement {
  // retry を切り、失敗時もテストが待たされないようにする。
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RenameDocumentDialog', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: DOC_ID,
            projectId: PROJECT_ID,
            name: '要件定義書',
            createdAt: '2026-05-18T00:00:00.000Z',
            officialVersionNumber: null,
            versions: [],
          }),
          { status: 200 },
        ),
      ),
    );
  });

  it('should prefill the input with the current name', () => {
    render(
      <RenameDocumentDialog
        documentId={DOC_ID}
        currentName="設計書"
        open
        onClose={vi.fn()}
      />,
      { wrapper: wrapper() },
    );

    const input = screen.getByLabelText(/新しい文書名/);
    expect(input.getAttribute('value')).toBe('設計書');
  });

  it('should PUT the new name and close on success', async () => {
    const onClose = vi.fn();
    render(
      <RenameDocumentDialog
        documentId={DOC_ID}
        currentName="設計書"
        open
        onClose={onClose}
      />,
      { wrapper: wrapper() },
    );

    fireEvent.change(screen.getByLabelText(/新しい文書名/), {
      target: { value: '要件定義書' },
    });
    fireEvent.click(screen.getByRole('button', { name: '変更' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    const fetchMock = vi.mocked(fetch);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    // api クライアントは文字列 URL を渡す契約（document-api.ts）。
    expect(
      typeof url === 'string' && url.includes(`/documents/${DOC_ID}`),
    ).toBe(true);
    expect(init?.method).toBe('PUT');
    expect(init?.body).toBe(JSON.stringify({ name: '要件定義書' }));
  });

  it('should reset the typed value on success so a still-mounted dialog does not keep stale input', async () => {
    const onClose = vi.fn();
    render(
      <RenameDocumentDialog
        documentId={DOC_ID}
        currentName="設計書"
        open
        onClose={onClose}
      />,
      { wrapper: wrapper() },
    );

    fireEvent.change(screen.getByLabelText(/新しい文書名/), {
      target: { value: '要件定義書' },
    });
    fireEvent.click(screen.getByRole('button', { name: '変更' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    // close() 経由でリセットされるため、入力は元の currentName に戻る
    // （成功時に onClose を直呼びすると '要件定義書' が残ってしまう回帰）。
    expect(screen.getByLabelText(/新しい文書名/).getAttribute('value')).toBe(
      '設計書',
    );
  });

  it('should close without a request when cancelled', () => {
    const onClose = vi.fn();
    render(
      <RenameDocumentDialog
        documentId={DOC_ID}
        currentName="設計書"
        open
        onClose={onClose}
      />,
      { wrapper: wrapper() },
    );

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
