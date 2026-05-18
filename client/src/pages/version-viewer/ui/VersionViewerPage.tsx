import { Alert, Box, Typography } from '@mui/material';
import { useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { versionFileUrl } from '../../../entities/document';
import { useMe } from '../../../features/auth';
import { CommentThread } from '../../../features/version-comments';
import { PdfViewer } from '../../../shared/ui/PdfViewer';

/**
 * 版 PDF のみを表示する専用ページ。文書詳細の埋め込みより広い領域で
 * 閲覧でき、将来このページにアノテーション UI（ツールバー/レイヤー）を
 * 載せる土台とする。下部に版コメントスレッドを置く。
 */
export function VersionViewerPage(): ReactElement {
  const { documentId, versionNumber } = useParams({
    from: '/projects/$projectId/documents/$documentId/versions/$versionNumber',
  });
  const me = useMe();
  // 先頭ゼロや 1e0 等の指数表記を弾き、正の安全整数のみ受け付ける。
  const isCanonical = /^[1-9][0-9]*$/.test(versionNumber);
  const parsed = Number(versionNumber);
  if (!isCanonical || !Number.isSafeInteger(parsed)) {
    return <Alert severity="error">版番号が不正です</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        v{parsed} のプレビュー
      </Typography>
      {/* PDF を主役に最大表示。将来ここにアノテーション層を重ねる。 */}
      <Box sx={{ width: '100%' }}>
        <PdfViewer src={versionFileUrl(documentId, parsed)} fitToWidth />
      </Box>
      <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>
        コメント
      </Typography>
      <CommentThread
        documentId={documentId}
        versionNumber={parsed}
        currentUserId={me.data?.id}
      />
    </Box>
  );
}
