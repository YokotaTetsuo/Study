import { Alert, Stack } from '@mui/material';
import { useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { versionFileUrl } from '../../../entities/document';
import { useMe } from '../../../features/auth';
import { CommentThread } from '../../../features/version-comments';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { PdfViewer } from '../../../shared/ui/PdfViewer';
import { SectionCard } from '../../../shared/ui/SectionCard';

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
    <>
      <PageHeader title={`v${String(parsed)} のプレビュー`} />
      <Stack spacing={3}>
        {/* PDF を主役に最大表示。将来ここにアノテーション層を重ねる。 */}
        <SectionCard>
          <PdfViewer src={versionFileUrl(documentId, parsed)} fitToWidth />
        </SectionCard>
        <SectionCard title="コメント">
          <CommentThread
            documentId={documentId}
            versionNumber={parsed}
            currentUserId={me.data?.id}
          />
        </SectionCard>
      </Stack>
    </>
  );
}
