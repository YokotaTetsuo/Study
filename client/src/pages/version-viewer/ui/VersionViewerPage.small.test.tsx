// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// 本ページは URL パラメータ・認証・PDF 描画・コメント取得という IO 境界に
// 依存する。検証対象は「版番号の検証」と「2 カラムの組み立て（左 PDF /
// 右コメント）」という観察可能な UI 振る舞いのみのため、境界はテスト
// ダブルへ差し替える（testing.md: API/ルーター境界はテストダブル）。
const useParamsMock = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useParams: (): unknown => useParamsMock(),
}));

vi.mock('../../../features/auth', () => ({
  useMe: (): unknown => ({ data: { id: '01H000000000000000000USER0' } }),
}));

vi.mock('../../../entities/document', () => ({
  versionFileUrl: (documentId: string, n: number): string =>
    `/files/${documentId}/v${String(n)}`,
}));

vi.mock('../../../shared/ui/PdfViewer', () => ({
  // React コンポーネント名のため PascalCase。命名規約の対象外。
  // eslint-disable-next-line @typescript-eslint/naming-convention
  PdfViewer: ({ src }: { src: string }): React.ReactElement => (
    <div data-testid="pdf-viewer">{src}</div>
  ),
}));

vi.mock('../../../features/version-comments', () => ({
  // React コンポーネント名のため PascalCase。命名規約の対象外。
  // eslint-disable-next-line @typescript-eslint/naming-convention
  CommentThread: ({
    documentId,
    versionNumber,
  }: {
    documentId: string;
    versionNumber: number;
  }): React.ReactElement => (
    <div data-testid="comment-thread">
      {documentId}:{versionNumber}
    </div>
  ),
}));

import { VersionViewerPage } from './VersionViewerPage';

const DOCUMENT_ID = '01H000000000000000000DOC00';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('VersionViewerPage', () => {
  it('should render an error alert when the version number is not canonical', () => {
    useParamsMock.mockReturnValue({
      documentId: DOCUMENT_ID,
      versionNumber: '01',
    });

    render(<VersionViewerPage />);

    expect(screen.getByText('版番号が不正です')).toBeTruthy();
    expect(screen.queryByTestId('pdf-viewer')).toBeNull();
  });

  it('should place the PDF viewer and the comment thread side by side for a valid version', () => {
    useParamsMock.mockReturnValue({
      documentId: DOCUMENT_ID,
      versionNumber: '3',
    });

    render(<VersionViewerPage />);

    expect(screen.getByTestId('pdf-viewer').textContent).toBe(
      `/files/${DOCUMENT_ID}/v3`,
    );
    expect(screen.getByTestId('comment-thread').textContent).toBe(
      `${DOCUMENT_ID}:3`,
    );
    expect(screen.getByText('v3 のコメント')).toBeTruthy();
  });
});
