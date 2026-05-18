import { Alert, Box, Typography } from '@mui/material';
import { useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { versionFileUrl } from '../../../entities/document';
import { PdfViewer } from '../../../shared/ui/PdfViewer';

/**
 * 版 PDF のみを表示する専用ページ。文書詳細の埋め込みより広い領域で
 * 閲覧でき、将来このページにアノテーション UI（ツールバー/レイヤー）を
 * 載せる土台とする。
 */
export function VersionViewerPage(): ReactElement {
  const { documentId, versionNumber } = useParams({
    from: '/projects/$projectId/documents/$documentId/versions/$versionNumber',
  });
  const parsed = Number(versionNumber);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return <Alert severity="error">版番号が不正です</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        v{parsed} のプレビュー
      </Typography>
      {/* PDF を主役に最大表示。将来ここにアノテーション層を重ねる。 */}
      <Box sx={{ width: '100%' }}>
        <PdfViewer src={versionFileUrl(documentId, parsed)} />
      </Box>
    </Box>
  );
}
