import { Link as MuiLink, Typography } from '@mui/material';
import { Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { useMe } from '../../../features/auth';

export function HomePage(): ReactElement {
  const me = useMe();

  // 認証状態・ヘッダーは共通レイアウト（AppShell）が担う。
  // ここでは認証済み前提でコンテンツのみを描画する。
  if (me.data === undefined) {
    return <Typography>読み込み中…</Typography>;
  }

  return (
    <>
      <Typography gutterBottom>
        ようこそ、{me.data.displayName} さん（{me.data.email}）。
      </Typography>
      <MuiLink component={Link} to="/projects">
        プロジェクト一覧へ
      </MuiLink>
    </>
  );
}
