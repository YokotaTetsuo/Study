import { Alert, Grid2 } from '@mui/material';
import { useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { versionFileUrl } from '../../../entities/document';
import { useMe } from '../../../features/auth';
import { CommentThread } from '../../../features/version-comments';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { PdfViewer } from '../../../shared/ui/PdfViewer';
import { SectionCard } from '../../../shared/ui/SectionCard';

/**
 * 版 PDF を主役に閲覧する専用ページ。版単位の閲覧とコメントを
 * このページ内で完結させるため、左に PDF プレビュー（主役）、右に
 * その版のコメント（一覧＋投稿＋編集）を 2 カラムで並べる。`lg`
 * 未満は 1 カラムへフォールバックする。将来このページにアノテーション
 * UI（ツールバー/レイヤー）を載せる土台とする。
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
      <Grid2 container spacing={3} alignItems="stretch">
        {/* 左カラム: PDF を主役に最大表示。将来ここにアノテーション層を重ねる。 */}
        <Grid2 size={{ xs: 12, lg: 8 }}>
          <SectionCard fullHeight>
            <PdfViewer src={versionFileUrl(documentId, parsed)} fitToWidth />
          </SectionCard>
        </Grid2>

        {/* 右カラム: その版のコメント（一覧＋投稿＋編集）。 */}
        <Grid2 size={{ xs: 12, lg: 4 }}>
          <SectionCard title={`v${String(parsed)} のコメント`} fullHeight>
            <CommentThread
              documentId={documentId}
              versionNumber={parsed}
              currentUserId={me.data?.id}
            />
          </SectionCard>
        </Grid2>
      </Grid2>
    </>
  );
}
