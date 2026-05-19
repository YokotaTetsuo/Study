import { Button, Typography } from '@mui/material';
import { Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { useMe } from '../../../features/auth';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { SectionCard } from '../../../shared/ui/SectionCard';

export function HomePage(): ReactElement {
  const me = useMe();

  // 認証状態・ヘッダーは共通レイアウト（AppShell）が担う。
  // ここでは認証済み前提でコンテンツのみを描画する。
  if (me.data === undefined) {
    return <Typography>読み込み中…</Typography>;
  }

  return (
    <>
      <PageHeader
        title="ホーム"
        subtitle={`ようこそ、${me.data.displayName} さん（${me.data.email}）`}
      />
      <SectionCard>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          プロジェクトを選択して文書のレビューを開始しましょう。
        </Typography>
        <Button component={Link} to="/projects" variant="contained">
          プロジェクト一覧へ
        </Button>
      </SectionCard>
    </>
  );
}
